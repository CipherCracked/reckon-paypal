import { formatMoney } from "../money.ts";
import type { CommitmentTerms } from "./types";

/**
 * The schedule is the second property of a commitment (IPD 13): when the money
 * leaves, how many times, and what the product does not know about missing one.
 * It answers a different question from the three figures, so it is a sentence
 * rather than a fourth amount — and it is derived from the terms, never stored.
 */
export function describeSchedule(terms: CommitmentTerms): string {
  switch (terms.shape) {
    case "one_time":
      // "Nothing further is charged" was true of the agreement and false of the
      // total: a retailer that never mentions shipping has not said shipping is
      // free. Where a part is unstated the sentence says which, so the figures
      // above it are read as the floor they are.
      return terms.shipping === null || terms.tax === null
        ? `Paid once. ${unstatedPhrase(terms)} ${unstatedConsequence(terms)}`
        : "Paid once. Nothing further is charged, so there is no term to run out.";

    case "recurring": {
      const count = terms.recurrence?.count ?? 0;
      const perPeriod = formatMoney({
        currency: terms.itemPrice.currency,
        minor: terms.itemPrice.minor + (terms.tax?.minor ?? 0),
      });
      return `${count} payments of ${perPeriod}, ${cadence(terms)} — today's is the first of the ${count}. ${notStatedIfMissed()}`;
    }

    case "financed": {
      const count = terms.installment?.count ?? 0;
      const amount = terms.installment
        ? formatMoney(terms.installment.amount)
        : "an unstated amount";
      return `${count} payments of ${amount}, one a month — today's is the first of the ${count}. ${notStatedIfMissed()}`;
    }

    default:
      return notStated();
  }
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

/** What that costs the reader: the totals above are the sum of what was stated. */
function unstatedConsequence(terms: CommitmentTerms): string {
  return terms.shipping === null || terms.tax === null
    ? "The figures above are what this listing states, not everything the checkout will ask for."
    : "";
}

/** The words that say how often — never a number, always a phrase. */
function cadence(terms: CommitmentTerms): string {
  return terms.recurrence?.period === "year" ? "one a year" : "one a month";
}

function notStated(): string {
  return "The schedule for this commitment is not stated.";
}
