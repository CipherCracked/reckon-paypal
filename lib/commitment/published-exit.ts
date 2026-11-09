import { ModelError } from "@/lib/ai/client";
import { requestQuotations, type ModelQuotation, type ReadOptions } from "@/lib/ai/read-document";
import { normaliseText } from "@/lib/document/normalise";
import { parseAmount } from "@/lib/document/parse";
import { verifyQuotations } from "@/lib/document/verify";
import type { FigureSource } from "./present";
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
 * The same seller text is read on every render of a screen that shows it — a
 * bill page re-reads it each time it opens. The reading is a fact about the
 * seller's published words, not about the reader, so remembering it for a few
 * minutes changes nothing on the screen and spares every render after the first
 * a model round-trip. Nothing about a person is kept.
 *
 * The maps live on `globalThis` because Next compiles the start-up hook and the
 * page into separate module graphs: a module-level map here would be two maps,
 * and the warm-up would fill one that no page ever reads.
 */
type ExitCache = {
  findings: Map<string, { finding: ExitFinding; at: number }>;
  /** Readers that arrive while a reading is still running wait on it. */
  inFlight: Map<string, Promise<ExitFinding>>;
};

const store = globalThis as unknown as { __publishedExit?: ExitCache };
const cache: ExitCache = (store.__publishedExit ??= {
  findings: new Map(),
  inFlight: new Map(),
});

const CACHE_TTL_MS = 10 * 60 * 1000;

/** Test hook: the cache is module state, like the PayPal token cache. */
export function clearPublishedExitCache(): void {
  cache.findings.clear();
  cache.inFlight.clear();
}

/**
 * Reads a seller's published text for the exit figure. Text is short — a
 * product description, an invoice's terms — so nothing here is sized for a
 * document.
 */
export async function readPublishedExit(
  text: string,
  options: ReadOptions = {},
): Promise<ExitFinding> {
  const source = text.trim();
  if (source.length === 0) return { kind: "silent" };

  const remembered = cache.findings.get(source);
  if (remembered) {
    if (Date.now() - remembered.at >= CACHE_TTL_MS) {
      // The TTL bounds memory, not truth: a reading of a sentence that has not
      // changed does not become wrong by aging. Refresh behind the reader rather
      // than making the front door wait a second time for the same answer
      // (IPD 21) — a first visitor after the window is not a reason to hand the
      // next one a "could not be read".
      void startReading(source, options);
    }
    return remembered.finding;
  }

  return startReading(source, options);
}

/**
 * How long a reading may keep the "one at a time" slot before it is assumed
 * stuck. The client gives up on its own well inside this; the ceiling exists for
 * the case it does not, because a promise that never settles would hold the slot
 * for the life of the process — every later reader joining a dead request and
 * being told the seller's terms could not be read, with no way to try again.
 */
const READING_CEILING_MS = 3 * 60 * 1000;

/** One reading per text at a time; callers that arrive mid-read join it. */
function startReading(source: string, options: ReadOptions): Promise<ExitFinding> {
  const pending = cache.inFlight.get(source);
  if (pending) return pending;

  const reading = readOnce(source, options).finally(() => {
    // Frees the slot for the next reader, and only if it is still ours: a
    // request can settle long after the ceiling has handed the slot on.
    if (cache.inFlight.get(source) === reading) cache.inFlight.delete(source);
  });

  // Releases the slot even if the request never comes back, so the next reader
  // starts a fresh attempt instead of joining a request that has already died.
  // The check is what makes it safe: a request that hung past the ceiling is no
  // longer the one holding the slot, and must not evict the attempt that is.
  const ceiling = setTimeout(() => {
    if (cache.inFlight.get(source) === reading) cache.inFlight.delete(source);
  }, READING_CEILING_MS);
  ceiling.unref?.();

  cache.inFlight.set(source, reading);
  return reading;
}

/** One attempt at one text: read it, verify the spans, remember the finding. */
async function readOnce(source: string, options: ReadOptions): Promise<ExitFinding> {
  let result;
  try {
    result = await requestQuotations(source, options);
  } catch (error) {
    const finding: ExitFinding = {
      kind: "unreadable",
      reason:
        error instanceof ModelError
          ? error.message
          : "The seller's published terms could not be read.",
    };
    // Deliberately not remembered. A timeout or a dropped connection is a fact
    // about one attempt, not about the seller — caching it would turn one slow
    // minute into ten minutes of "could not be read" on every screen that shows
    // this text (ITD 20). The next render tries again.
    return finding;
  }

  const finding = exitFromSpans(result.quotations, normaliseText(source));
  cache.findings.set(source, { finding, at: Date.now() });
  return finding;
}

/**
 * The two absences, kept apart in the copy as well as in the type. "The seller
 * published nothing" is a fact about them; "we could not read it" is a fact
 * about us, and only one of those may be reported as the seller's silence.
 */
export const EXIT_SILENT_NOTE = "The seller's published terms do not say what it costs to leave.";
export const EXIT_UNREADABLE_NOTE = "The seller's terms could not be read, so this figure is not shown.";

export type ExitOutcome = {
  /**
   * Which of the three things happened. The provenance line needs it as much as
   * the figure does: "nobody published this" and "we could not read it" are
   * different sentences, and only the first one is the seller's silence.
   */
  kind: "stated" | "silent" | "unreadable";
  exit: ExitTerms;
  /** Shown under the figure when there is no amount, so the reason is visible. */
  note: string | null;
  /** The seller's sentence the figure came from, when one did. It travels on the figure (ITD 19). */
  quoted: FigureSource | null;
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
  options: ReadOptions = {},
): Promise<ExitOutcome> {
  if (exit.kind !== "unknown") {
    return { kind: "stated", exit, note: null, quoted: null };
  }

  const finding = await readPublishedExit(description, options);

  if (finding.kind === "stated") {
    return {
      kind: "stated",
      exit: finding.exit,
      note: null,
      quoted: { label: descriptionLabel, span: finding.quote },
    };
  }

  // Both remaining cases are absences. `kind` and the note both tell them apart,
  // because the figure and the provenance line say it in different words.
  return {
    kind: finding.kind,
    exit: { kind: "unknown" },
    note: finding.kind === "silent" ? EXIT_SILENT_NOTE : EXIT_UNREADABLE_NOTE,
    quoted: null,
  };
}
