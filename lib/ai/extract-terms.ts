import type { CommitmentShape } from "@/lib/commitment/types";
import { callTool } from "./client";
import { assertNoMoney } from "./guard";
import type { ExtractedTerms } from "./types";

const TOOL_NAME = "record_purchase_terms";

/**
 * The schema has no field that could hold a figure. The model records the
 * shape of the commitment and the words to label it with; every number the
 * shopper sees comes from the deterministic computation instead.
 *
 * No property is required: a model that cannot tell is meant to leave the
 * field out, and the coercion below turns "left out" into "not stated".
 */
const TERMS_TOOL = {
  name: TOOL_NAME,
  description:
    "Record the structure of a purchase commitment from merchant copy. Record no monetary figures.",
  parameters: {
    type: "object",
    properties: {
      shape: {
        type: "string",
        enum: ["one_time", "recurring", "financed"],
        description: "How the commitment is paid: once, repeatedly, or in instalments.",
      },
      recurrenceCount: {
        type: "integer",
        description: "How many charges the term contains, when the commitment repeats.",
      },
      recurrencePeriod: {
        type: "string",
        enum: ["month", "year"],
        description: "The period each repeating charge covers.",
      },
      cancellationWindowDays: {
        type: "integer",
        description: "Days allowed to cancel, when the copy states one.",
      },
      exitFeeKnown: {
        type: "boolean",
        description: "Whether the copy says what it costs to leave. Do not estimate a cost.",
      },
      labels: {
        type: "object",
        description: "Short plain-language labels for the three parts of the charge.",
        properties: {
          item: { type: "string" },
          shipping: { type: "string" },
          tax: { type: "string" },
        },
        required: ["item", "shipping", "tax"],
      },
      summary: {
        type: "string",
        description:
          "One plain sentence describing what the shopper is taking on. Never a monetary figure.",
      },
    },
    required: [],
  },
} as const;

const SYSTEM_PROMPT = [
  "You read merchant product copy and record the structure of the commitment.",
  "You never write a monetary figure: no currency symbol, no currency code followed by a number,",
  "no decimal number. Figures on the screen are produced elsewhere. If the copy contains them,",
  "ignore them and describe the commitment in words only.",
  "The summary is one sentence addressed to the shopper about what they are taking on.",
  "Never mention labels, fields, placeholders or this record.",
].join(" ");

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

/**
 * The schema asks for one sentence; a model that writes a paragraph is trimmed
 * to what it was asked for. The tail of a longer answer tends to be about the
 * model's own output rather than the shopper's commitment, and a screen must
 * not show a reader a sentence about the machinery.
 */
function firstSentence(text: string): string {
  const trimmed = text.trim();
  const end = /[.!?](?=\s|$)/.exec(trimmed);
  return end ? trimmed.slice(0, end.index + 1) : trimmed;
}

function asInt(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

function asShape(value: unknown): CommitmentShape | null {
  return value === "one_time" || value === "recurring" || value === "financed" ? value : null;
}

function toExtractedTerms(input: unknown): ExtractedTerms {
  const raw = (input ?? {}) as Record<string, unknown>;
  const labels = (raw.labels ?? {}) as Record<string, unknown>;

  return {
    shape: asShape(raw.shape),
    recurrenceCount: asInt(raw.recurrenceCount),
    recurrencePeriod:
      raw.recurrencePeriod === "month" || raw.recurrencePeriod === "year"
        ? raw.recurrencePeriod
        : null,
    cancellationWindowDays: asInt(raw.cancellationWindowDays),
    exitFeeKnown: raw.exitFeeKnown === true,
    labels: {
      item: asString(labels.item).trim(),
      shipping: asString(labels.shipping).trim(),
      tax: asString(labels.tax).trim(),
    },
    summary: firstSentence(asString(raw.summary)),
  };
}

/**
 * Throws on any failure — a missing tool result or a monetary value in the
 * output. The caller shows the raw PayPal charge and says plainly that the
 * terms could not be read.
 */
export async function extractTerms(input: { productText: string }): Promise<ExtractedTerms> {
  const answer = await callTool({
    system: SYSTEM_PROMPT,
    user: `Merchant product copy follows. Record its commitment structure.\n\n${input.productText}`,
    tool: TERMS_TOOL,
  });

  const terms = toExtractedTerms(answer);
  assertNoMoney(terms);
  return terms;
}
