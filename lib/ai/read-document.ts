import Anthropic from "@anthropic-ai/sdk";
import { findMoneyLike } from "./guard";
import { FIELD_DESCRIPTIONS, FIELDS, isFieldName, type FieldName } from "@/lib/document/fields";

const MODEL = "claude-sonnet-5-5";
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
  input_schema: {
    type: "object" as const,
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
    required: ["quotations", "summary"],
  },
};

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
 * Throws on every failure — no tool result, no key, a network error, or a
 * summary carrying a figure. The caller falls back to candidate mode, which
 * states in its own words that nothing was interpreted.
 */
export async function readDocumentWithModel(input: { text: string }): Promise<DocumentReading> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new UnreadableDocumentError("No model is configured for this deployment.");
  }

  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    tools: [QUOTATIONS_TOOL],
    tool_choice: { type: "tool", name: TOOL_NAME },
    messages: [
      {
        role: "user",
        content: `The document follows, between the markers. Point at what it asks the reader to pay.\n\n<<<DOCUMENT\n${input.text}\nDOCUMENT>>>`,
      },
    ],
  });

  const toolUse = response.content.find(
    (block): block is Extract<(typeof response.content)[number], { type: "tool_use" }> =>
      block.type === "tool_use",
  );

  if (!toolUse) {
    throw new UnreadableDocumentError("The model did not return any spans.");
  }

  const raw = (toolUse.input ?? {}) as Record<string, unknown>;
  const summary = typeof raw.summary === "string" ? raw.summary : "";

  // The guard is unchanged: a figure in the wrapping words was invented, because
  // the model was never asked for one.
  const money = findMoneyLike(summary);
  if (money) {
    throw new UnreadableDocumentError("The model's summary contained a figure, so it was discarded.");
  }

  return { quotations: toQuotations(toolUse.input), summary };
}
