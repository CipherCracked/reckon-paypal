import { ModelError } from "@/lib/ai/client";
import { requestQuotations, type ModelQuotation } from "@/lib/ai/read-document";
import { normaliseText } from "@/lib/document/normalise";
import { parseAmount } from "@/lib/document/parse";
import { verifyQuotations } from "@/lib/document/verify";
import type { ExitTerms } from "./types";

/**
 * What it costs to leave, read from the seller's own published words (IPD 19).
 *
 * PayPal has no field for this figure — a plan's `payment_preferences` governs
 * failed payments, not walking away — so the only source left is the sentence a
 * seller wrote. The reading is the document reader reused unchanged: the model
 * copies spans, the server verifies them against the text, and the parser takes
 * the amount out of a verified span (ITD 18).
 *
 * The three outcomes are deliberately not two. A seller who published nothing
 * about leaving and a seller whose words could not be read are different facts,
 * and the screen says which one happened. Neither is zero.
 */
export type ExitFinding =
  | { kind: "stated"; exit: ExitTerms; quote: string }
  | { kind: "silent" }
  | { kind: "unreadable"; reason: string };

/** The fields that can answer the third figure, and only those. */
const EXIT_FIELDS: ReadonlySet<string> = new Set(["exitFee", "freeToLeave"]);

/**
 * Turns verified spans into an exit term.
 *
 * `freeToLeave` is a published term and reads as `{ kind: "none" }`, never as
 * `unknown`: a seller who wrote "no fee" did not stay silent, and the two must
 * not render the same way.
 */
export function exitFromSpans(
  spans: ModelQuotation[],
  /** Must already have been through `normaliseText`. */
  normalisedSource: string,
): ExitFinding {
  const offered = spans.filter((span) => EXIT_FIELDS.has(span.field));
  if (offered.length === 0) return { kind: "silent" };

  const { accepted } = verifyQuotations(offered, normalisedSource);

  for (const { field, quote } of accepted) {
    if (field === "freeToLeave") {
      return { kind: "stated", exit: { kind: "none" }, quote };
    }
    const fee = parseAmount(quote);
    // Two amounts in one span cannot say which one leaving costs, so this span
    // is not a figure (ITD 18). Any other exit span still gets its turn.
    if (fee) return { kind: "stated", exit: { kind: "fee", fee }, quote };
  }

  if (accepted.length === 0) {
    // Spans were offered but none occurred in the seller's text, so the model
    // did not copy — the one failure the verification step exists for.
    return {
      kind: "unreadable",
      reason: "The words about leaving were not found word for word in the seller's text.",
    };
  }

  return { kind: "unreadable", reason: "The seller's words about leaving state no single amount." };
}

/**
 * Reads a seller's published text for the exit figure. Text is short — a
 * product description, an invoice's terms — so nothing here is sized for a
 * document.
 */
export async function readPublishedExit(text: string): Promise<ExitFinding> {
  const source = text.trim();
  if (source.length === 0) return { kind: "silent" };

  let reading;
  try {
    reading = await requestQuotations(source);
  } catch (error) {
    return {
      kind: "unreadable",
      reason:
        error instanceof ModelError
          ? error.message
          : "The seller's published terms could not be read.",
    };
  }

  return exitFromSpans(reading.quotations, normaliseText(source));
}

/**
 * The two absences, kept apart in the copy as well as in the type. "The seller
 * published nothing" is a fact about them; "we could not read it" is a fact
 * about us, and only one of those may be reported as the seller's silence.
 */
export const EXIT_SILENT_NOTE = "The seller's published terms do not say what it costs to leave.";
export const EXIT_UNREADABLE_NOTE = "The seller's terms could not be read, so this figure is not shown.";

export type ExitOutcome = {
  exit: ExitTerms;
  /** Shown under the figure when there is no amount, so the reason is visible. */
  note: string | null;
  /** The seller's sentence the figure came from, when one did. */
  quoted: { source: string; span: string } | null;
};

/**
 * The whole rule, from resolved terms to a figure, shared by every screen that
 * shows one (IPD 19). A structured term wins: reading a seller who already
 * answered would spend a model call to hear it said twice.
 */
export async function resolveExitTerm(
  exit: ExitTerms,
  description: string,
  descriptionLabel: string,
): Promise<ExitOutcome> {
  if (exit.kind !== "unknown") return { exit, note: null, quoted: null };

  const finding = await readPublishedExit(description);

  if (finding.kind === "stated") {
    return {
      exit: finding.exit,
      note: null,
      quoted: { source: descriptionLabel, span: finding.quote },
    };
  }

  // Both remaining cases are absences. The note is what tells them apart.
  return {
    exit: { kind: "unknown" },
    note: finding.kind === "silent" ? EXIT_SILENT_NOTE : EXIT_UNREADABLE_NOTE,
    quoted: null,
  };
}
