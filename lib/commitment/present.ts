import { formatMoney, type Money } from "../money.ts";
import type { CommitmentTerms, CommitmentTranslation, UnstatedPart } from "./types";

/**
 * The order the shopper reads the figures in — by decision weight, not by
 * chronology (IPD 7). Today's charge is last because the merchant has already
 * made it unmissable; the two figures a shopper cannot compute come first.
 */
export const FIGURE_ORDER = ["acrossTerm", "exit", "today"] as const;

export type FigureId = (typeof FIGURE_ORDER)[number];

/**
 * A sentence of someone else's, which a figure was read out of (ITD 19).
 *
 * The span is the one verification accepted, character for character — never a
 * substring the screen chose, because a screen that trims a quote can make it
 * say something the check never saw.
 */
export type FigureSource = {
  /** How the screen names where the sentence came from. */
  label: string;
  /** The sentence itself. */
  span: string;
};

export type RenderedFigure = {
  id: FigureId;
  label: string;
  /** `null` only for a cost to leave the seller never published. */
  amount: Money | null;
  /**
   * True when the amount is the sum of the parts the source *stated*, with at
   * least one part unstated. The screen prints "At least", because the figure is
   * a floor: a retailer that never mentions shipping has not said shipping is
   * free.
   */
  floor: boolean;
  /** What the figure was built from, when it can be said without inventing a number. */
  arithmetic: string | null;
  /**
   * The sentence this figure was read out of, or `null` when it was not read
   * from one. A figure carries its evidence or carries nothing; there is no
   * third state, and nothing has to be joined up by convention at a render site
   * (ITD 19).
   */
  source: FigureSource | null;
};

/** Per-figure sentences, for the callers that have just read one. */
export type FigureSources = Partial<Record<FigureId, FigureSource | null>>;

const LABELS: Record<FigureId, string> = {
  acrossTerm: "Across the term",
  exit: "Cost to leave",
  today: "Charged today",
};

function isZero(amount: Money): boolean {
  return amount.minor === 0;
}

/** "$47.99 + $6.95 + $4.01" — the parts of a single charge, in the order the terms state them. */
function sumOfParts(terms: CommitmentTerms): string | null {
  const parts = [terms.itemPrice, terms.shipping, terms.tax].filter(
    (part): part is Money => part !== null && !isZero(part),
  );
  if (parts.length === 0) return null;
  return parts.map(formatMoney).join(" + ");
}

const UNSTATED_NAMES: Record<UnstatedPart, string> = {
  shipping: "shipping",
  tax: "sales tax",
};

/** "shipping", "sales tax", "shipping and sales tax" — the parts no one stated. */
function unstatedText(unstated: UnstatedPart[]): string {
  if (unstated.length === 0) return "";
  if (unstated.length === 1) return UNSTATED_NAMES[unstated[0]];
  return `${UNSTATED_NAMES[unstated[0]]} and ${UNSTATED_NAMES[unstated[1]]}`;
}

/**
 * The arithmetic line names what is missing as well as what is there, so the
 * reader can see that the total above it is the sum of the stated parts rather
 * than the whole charge. Naming a missing part is not a number, so nothing here
 * can put a figure on the screen that the code did not derive.
 */
function withUnstated(arithmetic: string | null, unstated: UnstatedPart[]): string | null {
  if (unstated.length === 0) return arithmetic;
  const missing = `${unstatedText(unstated)} not stated`;
  return arithmetic ? `${arithmetic}, plus ${missing}` : missing;
}

/** ", plus $60.00 taken once" — the opening fee, when the terms state one. */
function openingFeeText(terms: CommitmentTerms): string | null {
  const fee = terms.openingFee;
  if (!fee || isZero(fee)) return null;
  return `${formatMoney(fee)} taken once`;
}

function acrossTermArithmetic(
  terms: CommitmentTerms,
  extra: string,
  unstated: UnstatedPart[],
): string | null {
  const fee = openingFeeText(terms);

  switch (terms.shape) {
    case "one_time": {
      // A stated one-off charge needs no arithmetic — the figure is the charge.
      // Once a part is unstated the total is a floor, and the line has to show
      // what it was summed from and what it left out — starting with the fact
      // that it is one payment, so two identical figures side by side are not
      // read as two charges.
      if (unstated.length === 0) return "1 payment";
      const parts = sumOfParts(terms);
      const missing = `${unstatedText(unstated)} not stated`;
      return parts ? `1 payment of ${parts}, plus ${missing}` : `1 payment; ${missing}`;
    }

    case "recurring": {
      if (!terms.recurrence) return null;
      const perPeriod = formatMoney({
        currency: terms.itemPrice.currency,
        minor: terms.itemPrice.minor + (terms.tax?.minor ?? 0),
      });
      const repeated = `${terms.recurrence.count} × ${perPeriod}`;
      const shipping = terms.shipping;
      const withShipping =
        shipping === null || isZero(shipping)
          ? repeated
          : `${repeated} + ${formatMoney(shipping)} ${extra}`;
      return withUnstated(fee ? `${withShipping} + ${fee}` : withShipping, unstated);
    }

    case "financed": {
      if (!terms.installment) return null;
      const repeated = `${terms.installment.count} × ${formatMoney(terms.installment.amount)}`;
      return withUnstated(fee ? `${repeated} + ${fee}` : repeated, unstated);
    }

    default:
      return null;
  }
}

function todayArithmetic(terms: CommitmentTerms, unstated: UnstatedPart[]): string | null {
  const fee = openingFeeText(terms);

  if (terms.shape === "financed") {
    if (!terms.installment) return null;
    const base = `1 of ${terms.installment.count} payments`;
    return fee ? `${base}, plus ${fee}` : base;
  }

  const base = withUnstated(sumOfParts(terms), unstated);
  return fee ? (base ? `${base}, plus ${fee}` : fee) : base;
}

/**
 * Projects a finished translation into the list the screen renders. It reads
 * the terms and the totals; it never recomputes a figure, so a mistake here is
 * a display mistake and cannot reach the money.
 *
 * `extra` names the one-off part in the arithmetic line: a shop charges
 * shipping, a document charges a joining fee, and calling the second one
 * "shipping" is how a page tells a reader it was not paying attention.
 *
 * `sources` attaches a verified sentence to the figure it produced (ITD 19).
 * It is passed in rather than looked up, because only the caller knows which
 * read produced which figure, and a figure with no verified sentence must say
 * so by carrying `null`.
 */
export function presentFigures(
  terms: CommitmentTerms,
  translation: CommitmentTranslation,
  labels: { extra?: string; sources?: FigureSources } = {},
): RenderedFigure[] {
  const unstated = translation.unstated;
  const arithmetic: Record<FigureId, string | null> = {
    acrossTerm: acrossTermArithmetic(terms, labels.extra ?? "shipping once", unstated),
    exit: null,
    today: todayArithmetic(terms, unstated),
  };

  const amounts: Record<FigureId, Money | null> = {
    acrossTerm: translation.acrossTerm,
    exit: translation.exit,
    today: translation.today,
  };

  // Cost to leave is not a sum of parts, so an unstated part of the charge does
  // not make it a floor; the two totals are.
  const floor = unstated.length > 0;

  return FIGURE_ORDER.map((id) => ({
    id,
    label: LABELS[id],
    amount: amounts[id],
    floor: floor && id !== "exit",
    arithmetic: arithmetic[id],
    source: labels.sources?.[id] ?? null,
  }));
}
