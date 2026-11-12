import { writeRecordSentence } from "@/lib/ai/record-words";
import {
  readSentence,
  rememberSentence,
  sentenceKey,
  sharedWork,
} from "@/lib/ai/sentence-cache";
import { computeCommitment } from "@/lib/commitment/compute";
import { plainWordsFacts, type PlainWordsFacts } from "@/lib/commitment/taken";
import { withBudget } from "@/lib/deadline";
import { retrieveSubscription } from "@/lib/paypal/retrieve";
import { retrievePaymentsTaken } from "@/lib/paypal/transactions";

/**
 * The plain-language sentence over PayPal's record (IPD 46, ITD 38).
 *
 * It is a POST because it costs a model call: a GET could be prefetched by a
 * browser or a crawler, and there is nothing idempotent about paying for prose.
 *
 * **The browser sends an id and nothing else.** The figures are re-read from
 * PayPal here, because the sentence's whole claim is that every numeral in it
 * was one PayPal stated — and a number a browser supplies is not.
 *
 * Every failure answers `{ sentence: null }` with 200. The exact line is
 * already on the page and is not this route's to state; a 500 here would put an
 * error where a decoration was missing.
 */

/** PayPal subscription ids are `I-` or `P-` plus alphanumerics. Shape, not existence. */
const ID_PATTERN = /^[A-Za-z0-9-]{4,64}$/;

/**
 * The model answers in 3–6 s warm and was measured at 15.7 s cold. Twenty
 * seconds covers a cold start; past that the answer is not worth the wait, and
 * the work is allowed to finish in the background anyway, so a slow first view
 * warms the next one.
 */
const SENTENCE_BUDGET_MS = 20_000;

type Body = { subscriptionId?: unknown };

async function readBody(request: Request): Promise<Body | null> {
  try {
    const body = (await request.json()) as unknown;
    return typeof body === "object" && body !== null ? (body as Body) : null;
  } catch {
    return null;
  }
}

/** The facts, or `null` when there is no sentence worth writing (IPD 46). */
async function factsFor(id: string): Promise<PlainWordsFacts | null> {
  const subscription = await retrieveSubscription(id);
  const record = await retrievePaymentsTaken(id, subscription.startedAt);

  const terms = subscription.terms;
  const termCount = terms?.recurrence?.count ?? terms?.installment?.count ?? null;

  let acrossTerm = null;
  try {
    if (terms) acrossTerm = computeCommitment(terms).acrossTerm;
  } catch {
    acrossTerm = null;
  }

  return plainWordsFacts(record, termCount, acrossTerm);
}

export async function POST(request: Request) {
  const body = await readBody(request);
  const id = typeof body?.subscriptionId === "string" ? body.subscriptionId.trim() : "";

  if (!ID_PATTERN.test(id)) {
    return Response.json({ sentence: null }, { status: 400 });
  }

  const facts = await factsFor(id).catch(() => null);
  if (!facts) return Response.json({ sentence: null });

  const key = sentenceKey(id, facts);
  const remembered = readSentence(key);
  if (remembered) return Response.json({ sentence: remembered });

  const work = sharedWork(key, async () => {
    try {
      const sentence = await writeRecordSentence(facts, { retries: 0 });
      rememberSentence(key, sentence);
      return sentence;
    } catch {
      // A refused or failed sentence is not kept: the next view may get one.
      return null;
    }
  });

  const sentence = await withBudget(work, SENTENCE_BUDGET_MS, null);
  return Response.json({ sentence });
}
