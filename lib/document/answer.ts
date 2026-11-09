import { ModelError } from "@/lib/ai/client";
import { readDocumentWithModel, UnreadableDocumentError } from "@/lib/ai/read-document";
import type { FigureId, RenderedFigure } from "@/lib/commitment/present";
import type { CommitmentTranslation } from "@/lib/commitment/types";
import { findCandidates, type Candidates } from "./candidates";
import type { FieldName } from "./fields";
import { normaliseText } from "./normalise";
import { presentReading, readQuotations } from "./read";
import { verifyQuotations } from "./verify";

/** A reading of one document, ready to send. */
export type ReadingAnswer =
  | {
      mode: "read";
      summary: string;
      /** Each figure carries the span it was read out of (ITD 19). */
      figures: RenderedFigure[];
      breakdown: CommitmentTranslation["breakdown"];
      notes: Partial<Record<FigureId, string>>;
      schedule: string;
      dueDate: string | null;
      stated: FieldName[];
      quotationCount: number;
      rejected: number;
    }
  | { mode: "candidates"; notice: string; candidates: Candidates };

/**
 * An answer, and whether it is an answer *about the text* or about this
 * attempt.
 *
 * The distinction is the difference between caching a result and freezing a
 * failure (ITD 20). A reading that completed — even one that found nothing to
 * read — is a fact about the document and may be remembered. A request that
 * never came back is a fact about one minute, and remembering it would turn the
 * demonstration into its opposite until the cache expired.
 */
export type Attempt = { answer: ReadingAnswer; keep: boolean };

/** What can be found in a document without understanding any of it (ITD 12). */
export function candidatesAnswer(text: string, notice: string): ReadingAnswer {
  return { mode: "candidates", notice, candidates: findCandidates(text) };
}

/**
 * The whole answer for one document: what it states, or the amounts found in it
 * when it states no commitment.
 *
 * Everything numeric is parsed or computed here from spans the server has
 * already found in the text; the model's own words never reach a figure. The
 * one thing this function cannot do is invent an answer for a failure, so a
 * failed attempt still returns the amounts — uninterpreted, and marked so the
 * caller does not keep them.
 */
export async function answerReading(text: string): Promise<Attempt> {
  let reading;
  try {
    reading = await readDocumentWithModel({ text });
  } catch (error) {
    // The reason is logged without the document: a failure that cannot be
    // diagnosed turns every bad key into "this document could not be read".
    console.warn(
      "POST /api/read — reading failed:",
      error instanceof Error ? `${error.name}: ${error.message}` : String(error),
    );

    const notice =
      error instanceof ModelError && error.message.startsWith("No model")
        ? "No model is configured here, so nothing was interpreted. These are the amounts written in your document, exactly as they appear."
        : "The document could not be interpreted, so nothing was guessed. These are the amounts written in it, exactly as they appear.";

    return {
      answer: candidatesAnswer(text, notice),
      // The model answered and offered no usable span: that is a reading of the
      // text. Anything else — no provider, a timeout, a dropped connection — is
      // this attempt failing, and the next one should try again.
      keep: error instanceof UnreadableDocumentError,
    };
  }

  const { accepted, rejected } = verifyQuotations(reading.quotations, normaliseText(text));
  const parsed = readQuotations(accepted);

  if (!parsed) {
    return {
      answer: candidatesAnswer(
        text,
        accepted.length === 0
          ? "Nothing in this document could be matched to a commitment, so nothing was interpreted. These are the amounts written in it, exactly as they appear."
          : "The document does not state enough to work out a commitment, so no total was computed. These are the amounts written in it, exactly as they appear.",
      ),
      keep: true,
    };
  }

  const view = presentReading(parsed);

  return {
    answer: {
      mode: "read",
      summary: reading.summary,
      figures: view.figures,
      breakdown: view.breakdown,
      notes: view.notes,
      schedule: parsed.schedule,
      dueDate: parsed.dueDate,
      stated: parsed.stated,
      quotationCount: accepted.length,
      rejected,
    },
    keep: true,
  };
}
