import type { ModelQuotation } from "@/lib/ai/read-document";
import { parseCadence, parseStatedLength, type StatedLength } from "@/lib/document/parse";
import { verifyQuotations } from "@/lib/document/verify";
import type { BillingPeriod } from "./types";

/**
 * How long a listing runs, and how often it charges — read from the merchant's
 * own sentence (IPD 37, IPD 38).
 *
 * The catalogue publishes no term field, so the only place a term exists is the
 * words a seller wrote. This is the same reading as `exitFromSpans`: the model
 * copies spans, the server verifies them literally, and the parser reads the
 * verified span. What differs is the second check. A span that verifies is a
 * span that occurs in the text, not a span that says what it was labelled with,
 * and "3 Year Protection Plan" is a real sentence about a period that must never
 * become a schedule.
 *
 * The five outcomes are deliberately not two. A listing that states no term is a
 * price; a listing whose term this product cannot schedule is a schedule it must
 * not invent; a listing the reader failed to read is a fact about the reader, and
 * only one of those three may be reported as the seller's silence.
 */
export type TermFinding =
  | { kind: "stated"; count: number; period: BillingPeriod; quote: string }
  /** The term is stated, but not in a unit this product can charge in. */
  | { kind: "unschedulable"; reason: "unit" | "cadence"; quote: string }
  /** A cadence is stated with no end: a subscription that runs until cancelled. */
  | { kind: "ongoing"; quote: string }
  | { kind: "silent" }
  | { kind: "unreadable"; reason: string };

/** The fields that can answer how long the listing runs, and only those. */
const TERM_FIELDS: ReadonlySet<string> = new Set(["termLength"]);
const CADENCE_FIELDS: ReadonlySet<string> = new Set(["period"]);

/**
 * The words that make a duration an agreement's duration. A duration alone is
 * not enough: sellers publish durations about warranties, deliveries and
 * editorial calendars, and every one of them is a sentence about a period.
 */
const AGREEMENT =
  /\b(subscri\w+|memberships?|members?|plans?|renews?|renewal|recurring|auto-?ship\w*|pre-?paid|prepay\w*|billed|charged|payments?|instal+ments?)\b/i;

/**
 * The words that take a duration back. These are checked first, because a
 * protection plan and a magazine subscription use the same vocabulary for a
 * period — and a warranty read as a schedule is a charge nobody agreed to.
 */
const NOT_AN_AGREEMENT =
  /\b(warrant\w*|guarantee[sd]?|coverage|protection|covers?|insured?|insurance|issue[sd]?|volumes?|calendars?|magazines?|editions?)\b/i;

/**
 * A cadence is a claim about charges or deliveries, so it needs one of those
 * words to be about money at all. "Monthly Wall Calendar" states a month and
 * charges nothing.
 */
const BILLING_OR_DELIVERY =
  /\b(bills?|billed|billing|charges?|charged|pays?|paid|ships?|shipped|sending|sends?|sent|delivers?|delivered|deliveries|dispatch|dispatched|renews?|arrives?)\b/i;

/** A duration that belongs to an agreement, or nothing. */
function asTerm(quote: string): StatedLength | null {
  if (NOT_AN_AGREEMENT.test(quote)) return null;
  if (!AGREEMENT.test(quote)) return null;
  return parseStatedLength(quote);
}

/** A cadence about money or goods, or nothing. */
function asCadence(quote: string): "month" | "other" | null {
  if (NOT_AN_AGREEMENT.test(quote)) return null;
  if (!AGREEMENT.test(quote) && !BILLING_OR_DELIVERY.test(quote)) return null;
  return parseCadence(quote);
}

/**
 * Turns verified spans into a term.
 *
 * A term in whole months becomes monthly payments — the only schedule the money
 * path can build (`BillingPeriod`, `ensurePlan`'s whole-cycle guard). A stated
 * cadence that disagrees with the term's unit is not overridden: "twelve months,
 * billed quarterly" listed as twelve monthly charges would overstate the bill
 * three times over, so it is reported as unschedulable instead.
 */
export function termFromSpans(
  spans: ModelQuotation[],
  /** Must already have been through `normaliseText`. */
  normalisedSource: string,
): TermFinding {
  const offered = spans.filter(
    (span) => TERM_FIELDS.has(span.field) || CADENCE_FIELDS.has(span.field),
  );
  if (offered.length === 0) return { kind: "silent" };

  const { accepted } = verifyQuotations(offered, normalisedSource);
  if (accepted.length === 0) {
    return {
      kind: "unreadable",
      reason: "The words about the term were not found word for word in the seller's text.",
    };
  }

  // The first stated cadence that survives the meaning check. A listing usually
  // states one; a second is not a contradiction this product can resolve.
  const cadence = accepted
    .filter((span) => span.field === "period")
    .map((span) => ({ quote: span.quote, value: asCadence(span.quote) }))
    .find((found) => found.value !== null);

  for (const { field, quote } of accepted) {
    if (field !== "termLength") continue;
    const length = asTerm(quote);
    if (!length) continue;

    if (length.unit !== "month") {
      return { kind: "unschedulable", reason: "unit", quote };
    }
    if (cadence && cadence.value !== "month") {
      return { kind: "unschedulable", reason: "cadence", quote };
    }
    return { kind: "stated", count: length.count, period: "month", quote };
  }

  if (cadence) return { kind: "ongoing", quote: cadence.quote };
  return { kind: "silent" };
}
