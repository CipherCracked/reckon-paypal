import { formatMoney } from "../money.ts";
import type { CommitmentTerms } from "./types";

export type ScheduleOptions = {
  /**
   * False when this screen is not charging anything, so "today's is the first"
   * would put a payment in the reader's day that nobody is taking. A document
   * read on `/read` states its own due date; the page must not overwrite it.
   */
  firstPaymentToday?: boolean;
};

/**
 * The schedule is the second property of a commitment (IPD 13): when the money
 * leaves, how many times, and what the product does not know about missing one.
 * It answers a different question from the three figures, so it is a sentence
 * rather than a fourth amount — and it is derived from the terms, never stored.
 */
export function describeSchedule(
  terms: CommitmentTerms,
  options: ScheduleOptions = {},
): string {
  const firstPaymentToday = options.firstPaymentToday ?? true;

  switch (terms.shape) {
    case "one_time":
      // "Nothing further is charged" was true of the agreement and false of the
      // total: a retailer that never mentions shipping has not said shipping is
      // free. Where a part is unstated the sentence says which, so the figures
      // above it are read as the floor they are.
      return terms.shipping === null || terms.tax === null
        ? `Paid once. ${unstatedPhrase(terms)} ${unstatedConsequence()}`
        : "Paid once. Nothing further is charged, so there is no term to run out.";

    case "recurring": {
      const count = terms.recurrence?.count ?? 0;
      const perPeriod = formatMoney({
        currency: terms.itemPrice.currency,
        minor: terms.itemPrice.minor + (terms.tax?.minor ?? 0),
      });
      const first = firstPaymentToday ? ` — today's is the first of the ${count}` : "";
      return `${count} payments of ${perPeriod}, ${cadence(terms)}${first}${openingFee(terms)}. ${notStatedIfMissed()}`;
    }

    case "financed": {
      const count = terms.installment?.count ?? 0;
      const amount = terms.installment
        ? formatMoney(terms.installment.amount)
        : "an unstated amount";
      const first = firstPaymentToday ? ` — today's is the first of the ${count}` : "";
      return `${count} payments of ${amount}, one a month${first}${openingFee(terms)}. ${notStatedIfMissed()}`;
    }

    default:
      return notStated();
  }
}

/**
 * ", plus $60.00 taken once" — the opening fee, when the terms state one, so a
 * schedule that says how many payments there are also says what is charged
 * before them. A fee nobody mentioned adds nothing.
 */
function openingFee(terms: CommitmentTerms): string {
  const fee = terms.openingFee;
  if (!fee || fee.minor === 0) return "";
  return `, plus ${formatMoney(fee)} taken once`;
}

function notStatedIfMissed(): string {
  return "What happens if a payment is missed is not stated on this screen.";
}

/** "Shipping is not stated in this listing." / "Shipping and sales tax are not stated..." */
function unstatedPhrase(terms: CommitmentTerms): string {
  const parts: string[] = [];
  if (terms.shipping === null) parts.push("shipping");
  if (terms.tax === null) parts.push("sales tax");
  const list = parts.length > 1 ? `${parts[0]} and ${parts[1]}` : parts[0];
  const verb = parts.length > 1 ? "are" : "is";
  return `${list.charAt(0).toUpperCase()}${list.slice(1)} ${verb} not stated here.`;
}

/**
 * What that costs the reader: the figures are the sum of what was stated.
 *
 * The sentence used to say "the figures above", but this schedule prints above
 * the figures on every screen that shows both, and "this listing" was false of
 * a document pasted into `/read`. It now says where it is not and what it
 * covers, so it is true wherever it appears.
 */
function unstatedConsequence(): string {
  return "The figures here are the sum of what was stated, not everything you will be asked for.";
}

/** The words that say how often — never a number, always a phrase. */
function cadence(terms: CommitmentTerms): string {
  return terms.recurrence?.period === "year" ? "one a year" : "one a month";
}

function notStated(): string {
  return "The schedule for this commitment is not stated.";
}
