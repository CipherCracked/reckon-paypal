import { formatMoney } from "../money.ts";
import type { CommitmentTerms } from "./types";

export type ScheduleOptions = {
  /**
   * False when this screen is not charging anything, so "today's is the first"
   * would put a payment in the reader's day that nobody is taking. A document
   * read on `/read` states its own due date; the page must not overwrite it.
   */
  firstPaymentToday?: boolean;
  /**
   * Where the parts the source did not state get charged, when this screen knows.
   *
   * A shop adds shipping and tax at checkout — every shop does, and telling the
   * shopper that is a scope, not a confession. A pasted document gives no such
   * promise, so there the same parts stay "not stated". The sentence is the same
   * fact either way; only the second one expects the reader to be told what is
   * missing from someone else's paperwork.
   */
  unstatedAt?: "checkout" | null;
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
      // free. Where a part is unstated the sentence says which. In a shop that
      // is a scope — everyone's checkout adds them — so it reads the way a shop
      // reads; a document promises nothing about a checkout, so it stays a
      // statement about the document.
      if (terms.shipping !== null && terms.tax !== null) {
        return "Paid once. Nothing further is charged, so there is no term to run out.";
      }
      return options.unstatedAt === "checkout"
        ? `Paid once, plus ${unstatedNoun(terms)} at checkout.`
        : `Paid once. ${unstatedPhrase(terms)} ${unstatedConsequence()}`;

    case "recurring": {
      const count = terms.recurrence?.count ?? 0;
      const perPeriod = formatMoney({
        currency: terms.itemPrice.currency,
        minor: terms.itemPrice.minor + (terms.tax?.minor ?? 0),
      });
      const first = firstPaymentToday ? ` — today's is the first of the ${count}` : "";
      return `${count} payments of ${perPeriod}, ${cadence(terms)}${first}${openingFee(terms)}. ${ifMissed(terms)}`;
    }

    case "financed": {
      const count = terms.installment?.count ?? 0;
      const amount = terms.installment
        ? formatMoney(terms.installment.amount)
        : "an unstated amount";
      const first = firstPaymentToday ? ` — today's is the first of the ${count}` : "";
      return `${count} payments of ${amount}, one a month${first}${openingFee(terms)}. ${ifMissed(terms)}`;
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

/**
 * What happens when a payment does not go through.
 *
 * Two cases, and only two. When the terms carry a failure policy the schedule
 * states it, because for a plan this product creates the policy is ours: PayPal
 * suspends on the number of failed payments the plan was made with, so a screen
 * that said "not stated" would be hiding a term it chose. When the terms do not
 * carry one, the sentence is about the source — a pasted document that never
 * mentions a missed payment — and it says so about the document, not about this
 * screen's ability to look it up.
 */
function ifMissed(terms: CommitmentTerms): string {
  const failure = terms.failure;
  if (!failure) return "What happens if a payment is missed is not stated in the terms.";

  const attempts =
    failure.suspendAfter === 1 ? "one failed payment" : `${failure.suspendAfter} failed payments`;
  return `If a payment does not go through, PayPal suspends the plan after ${attempts}.`;
}

/** "shipping", "sales tax", "shipping and sales tax" — the parts the source left out. */
function unstatedNoun(terms: CommitmentTerms): string {
  const parts: string[] = [];
  if (terms.shipping === null) parts.push("shipping");
  if (terms.tax === null) parts.push("sales tax");
  return parts.length > 1 ? `${parts[0]} and ${parts[1]}` : parts[0];
}

/** "Shipping is not stated in this listing." / "Shipping and sales tax are not stated..." */
function unstatedPhrase(terms: CommitmentTerms): string {
  const list = unstatedNoun(terms);
  const separate = terms.shipping === null && terms.tax === null;
  return `${list.charAt(0).toUpperCase()}${list.slice(1)} ${separate ? "are" : "is"} not stated here.`;
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
