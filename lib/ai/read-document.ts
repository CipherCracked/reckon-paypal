import { callTool } from "./client";
import { findMoneyLike } from "./guard";
import { FIELD_DESCRIPTIONS, FIELDS, isFieldName, type FieldName } from "@/lib/document/fields";

const TOOL_NAME = "record_quotations";

/**
 * The schema has no numeric field. The model cannot state what anything costs —
 * it can only point at where in the document something is said, and the server
 * checks that the span is really there before anything is read out of it.
 */
const QUOTATIONS_TOOL = {
  name: TOOL_NAME,
  description:
    "Point at the sentences in a document that state a commitment. Copy spans verbatim; never compute, summarise or restate a figure.",
  parameters: {
    type: "object",
    properties: {
      quotations: {
        type: "array",
        description:
          "Spans copied character-for-character from the document. One span per field. Leave a field out rather than paraphrasing.",
        items: {
          type: "object",
          properties: {
            field: { type: "string", enum: FIELDS as unknown as string[] },
            quote: {
              type: "string",
              description: "An exact substring of the document, including its figures and words.",
            },
            why: {
              type: "string",
              description: "One short phrase saying what this span was chosen for.",
            },
          },
          required: ["field", "quote"],
        },
      },
      summary: {
        type: "string",
        description:
          "One plain sentence describing what the document asks of the reader. Never a monetary figure.",
      },
    },
    required: ["quotations"],
  },
} as const;

const FIELD_GUIDE = (Object.keys(FIELD_DESCRIPTIONS) as FieldName[])
  .map((field) => `- ${field}: ${FIELD_DESCRIPTIONS[field]}`)
  .join("\n");

const SYSTEM_PROMPT = [
  "You are given a document a person has pasted in. Your only job is to point at the parts of it that",
  "state what the person must pay.",
  "",
  "Copy each span EXACTLY as it appears, including every currency symbol, number and word. Do not",
  "paraphrase, do not tidy punctuation, do not fix spelling, do not convert units. If you cannot copy a",
  "span exactly, leave that field out. A missing span is a safe answer; an altered one is not.",
  "",
  "Never compute anything. Do not add amounts together, do not multiply a payment by a count, do not",
  "convert a monthly rate to a yearly one. You are not asked what the document costs — only where it",
  "says so.",
  "",
  "Do not write a monetary figure in the summary. The summary describes the commitment in words.",
  "",
  "Fields you may fill:",
  FIELD_GUIDE,
].join("\n");

export class UnreadableDocumentError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "UnreadableDocumentError";
  }
}

export type ModelQuotation = { field: FieldName; quote: string };

export type DocumentReading = {
  quotations: ModelQuotation[];
  summary: string;
};

/** The caller's budget, passed straight through to the wire. */
export type ReadOptions = {
  retries?: number;
};

function toQuotations(input: unknown): ModelQuotation[] {
  const raw = (input ?? {}) as Record<string, unknown>;
  const list = Array.isArray(raw.quotations) ? raw.quotations : [];

  return list.flatMap((entry) => {
    const item = (entry ?? {}) as Record<string, unknown>;
    const quote = typeof item.quote === "string" ? item.quote.trim() : "";
    if (!quote || !isFieldName(item.field)) return [];
    return [{ field: item.field, quote }];
  });
}

/**
 * The spans the model offers, and nothing about what they mean.
 *
 * Separate from `readDocumentWithModel` because of one rule: on a document the
 * shopper pasted, zero spans means the reading failed. On the seller's own
 * published text (ITD 18) zero spans is often the correct answer — most sellers
 * say nothing about leaving — so the caller decides, not this function.
 *
 * Throws when there is nothing verifiable to work with — no tool result, no
 * provider, a network error.
 */
export async function requestQuotations(
  text: string,
  options: ReadOptions = {},
): Promise<DocumentReading> {
  const answer = await callTool({
    system: SYSTEM_PROMPT,
    user: `The document follows, between the markers. Point at what it asks the reader to pay.\n\n<<<DOCUMENT\n${text}\nDOCUMENT>>>`,
    tool: QUOTATIONS_TOOL,
    retries: options.retries,
  });

  const quotations = toQuotations(answer);
  const raw = (answer ?? {}) as Record<string, unknown>;
  const candidateSummary = typeof raw.summary === "string" ? raw.summary.trim() : "";

  // A figure in the wrapping words was invented, because the model was never
  // asked for one. Drop the wrapper, not the reading: the quotations are about
  // to be checked against the document itself, and a discarded span costs the
  // reader nothing while a discarded document costs them the whole reading.
  const summary = findMoneyLike(candidateSummary) ? "" : candidateSummary;

  return { quotations, summary };
}

/**
 * Reads a document the shopper pasted. An unusable summary does not throw: the
 * spans are the part that carries weight, and the server checks them itself.
 */
export async function readDocumentWithModel(input: { text: string }): Promise<DocumentReading> {
  const reading = await requestQuotations(input.text);
  if (reading.quotations.length === 0) {
    throw new UnreadableDocumentError("The model's spans named no field we read.");
  }
  return reading;
}
