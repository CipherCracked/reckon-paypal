import { answerReading, candidatesAnswer } from "@/lib/document/answer";
import { cachedReading } from "@/lib/document/reading-cache";
import { MODEL_ANSWER_DEADLINE_MS, withBudget } from "@/lib/deadline";

/** Long enough for a real bill, short enough that the page stays usable. */
const MIN_LENGTH = 40;
const MAX_LENGTH = 20_000;

type ReadRequestBody = { text?: unknown };

async function readBody(request: Request): Promise<ReadRequestBody | null> {
  try {
    const body = (await request.json()) as unknown;
    return typeof body === "object" && body !== null ? (body as ReadRequestBody) : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const body = await readBody(request);
  const text = typeof body?.text === "string" ? body.text.trim() : "";

  // A refused document is never cached: the same text would be refused by the
  // same rule, and remembering refusals is a way to keep the answers people did
  // not get.
  if (text.length < MIN_LENGTH) {
    return Response.json(
      { error: `Paste at least ${MIN_LENGTH} characters — a document short enough to be one line is short enough to read yourself.` },
      { status: 400 },
    );
  }

  if (text.length > MAX_LENGTH) {
    return Response.json(
      { error: `That is longer than ${MAX_LENGTH.toLocaleString("en-US")} characters. Paste the part that says what you owe.` },
      { status: 400 },
    );
  }

  // The cache decides whether this text has been read — by an earlier visitor, or
  // at start-up for the example documents — and it is the cache, not this route,
  // that knows which answers may be kept (ITD 20).
  //
  // The budget is the route's, not the model client's: the client waits far
  // longer than a person does, and its own timeout is what made a dead endpoint
  // look like a slow one for two and a half minutes. A reading that outlives the
  // budget is not remembered (`keep: false`), because a minute is a fact about
  // this attempt and not about the document.
  const answer = await cachedReading(text, () =>
    withBudget(answerReading(text), MODEL_ANSWER_DEADLINE_MS, {
      answer: candidatesAnswer(
        text,
        "The reading did not come back within a minute, so nothing was interpreted. These are the amounts written in your document, exactly as they appear.",
      ),
      keep: false,
    }),
  );

  return Response.json(answer);
}
