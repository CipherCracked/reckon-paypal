import { formatMoney } from "@/lib/money";
import type { PlainWordsFacts } from "@/lib/commitment/taken";
import { callTool } from "./client";
import { assertOnlyKnownNumerals } from "./guard";

/**
 * The one model call in this product that is handed figures rather than asked
 * to find them (IPD 46).
 *
 * Every other reading points at spans and the server checks them against the
 * text. Here there is no text to check against: PayPal's record is the source,
 * the server has already read it, and the model's only job is to turn four
 * verified facts into a sentence a person with dyscalculia does not have to
 * parse. That makes the check an allow-list — every numeral in the answer must
 * be one the server supplied — rather than the usual ban.
 *
 * The sentence is a second telling of the line above it, never a replacement:
 * when this call fails, the line is still on the page and still true.
 */

const TOOL_NAME = "record_sentence";

const SENTENCE_TOOL = {
  name: TOOL_NAME,
  description:
    "Write one sentence explaining a payment record to the person it belongs to. Use only the numbers supplied in the facts; never calculate, compare or estimate.",
  parameters: {
    type: "object",
    properties: {
      sentence: {
        type: "string",
        description: "One sentence, at most 30 words, addressed to the person as 'you'.",
      },
    },
    required: ["sentence"],
  },
} as const;

const SYSTEM_PROMPT = [
  "You write one sentence explaining a payment record to someone who finds numbers hard.",
  "",
  "The facts are supplied with the request, and every figure in them has been checked against PayPal's own",
  "record. They are complete: nothing you might want to say is missing from them.",
  "",
  "Use only the numbers that appear in the facts, written exactly as they appear there. Do not add,",
  "subtract, multiply, divide, round, estimate or compare. Do not invent a number, amount, date or count,",
  "and do not write a number in words that is not one of the facts spelled out.",
  "",
  "Do not judge or compare: no ‘only’, ‘just’, ‘almost’, ‘nearly’, ‘most’, ‘less than’, ‘more than’. Do not",
  "give advice, warn, or predict what PayPal will do. Say what the record shows and stop.",
  "",
  "Address the person as ‘you’. One sentence. At most 30 words.",
].join("\n");

/** Long enough for a plain sentence, short enough to stay one. */
const MAX_SENTENCE_LENGTH = 240;

export class RecordWordsError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "RecordWordsError";
  }
}

/**
 * Every figure the server has, as a number the guard compares against. The
 * model may write any of them and no other.
 */
export function allowedNumerals(facts: PlainWordsFacts): number[] {
  return [
    ...new Set([
      facts.count,
      facts.termCount,
      facts.taken.minor / 100,
      facts.acrossTerm.minor / 100,
      facts.stillToCome.minor / 100,
    ]),
  ];
}

function factsForModel(facts: PlainWordsFacts): string {
  return [
    "The facts, verified and complete:",
    `- payments PayPal has recorded as taken: ${facts.count}`,
    `- payments the agreement runs to: ${facts.termCount}`,
    `- amount taken so far: ${formatMoney(facts.taken)}`,
    `- the whole agreement is for: ${formatMoney(facts.acrossTerm)}`,
    `- still to come: ${formatMoney(facts.stillToCome)}`,
    "",
    "Explain this in one sentence.",
  ].join("\n");
}

/**
 * Asks for the sentence and refuses it unless every numeral in it came from the
 * facts. Throws on a missing sentence, an over-long one, a model error, or a
 * numeral the server did not supply — the caller shows nothing in all five
 * cases, because the line above it already states the fact.
 */
export async function writeRecordSentence(
  facts: PlainWordsFacts,
  options: { retries?: number } = {},
): Promise<string> {
  const answer = await callTool({
    system: SYSTEM_PROMPT,
    user: factsForModel(facts),
    tool: SENTENCE_TOOL,
    retries: options.retries,
  });

  const raw = (answer ?? {}) as Record<string, unknown>;
  const sentence = typeof raw.sentence === "string" ? raw.sentence.trim() : "";

  if (!sentence) throw new RecordWordsError("The model returned no sentence.");
  if (sentence.length > MAX_SENTENCE_LENGTH) {
    throw new RecordWordsError("The model's sentence was too long to be one sentence.");
  }

  assertOnlyKnownNumerals(sentence, allowedNumerals(facts));
  return sentence;
}
