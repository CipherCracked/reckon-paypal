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
      return "Paid once. Nothing further is charged, so there is no term to run out.";

    case "recurring": {
      const count = terms.recurrence?.count ?? 0;
      const perPeriod = formatMoney({
        currency: terms.itemPrice.currency,
        minor: terms.itemPrice.minor + terms.tax.minor,
      });
      return `${count} payments of ${perPeriod}, one a month — today's is the first of the ${count}. ${notStatedIfMissed()}`;
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

function notStated(): string {
  return "The schedule for this commitment is not stated.";
}
