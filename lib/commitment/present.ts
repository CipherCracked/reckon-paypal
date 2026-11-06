import { formatMoney, type Money } from "@/lib/money";
import type { CommitmentTerms, CommitmentTranslation } from "./types";

/**
 * The order the shopper reads the figures in — by decision weight, not by
 * chronology (IPD 7). Today's charge is last because the merchant has already
 * made it unmissable; the two figures a shopper cannot compute come first.
 */
export const FIGURE_ORDER = ["acrossTerm", "exit", "today"] as const;

export type FigureId = (typeof FIGURE_ORDER)[number];

export type RenderedFigure = {
  id: FigureId;
  label: string;
  /** `null` only for a cost to leave the seller never published. */
  amount: Money | null;
  /** What the figure was built from, when it can be said without inventing a number. */
  arithmetic: string | null;
};

const LABELS: Record<FigureId, string> = {
  acrossTerm: "Across the term",
  exit: "Cost to leave",
  today: "Charged today",
};

function isZero(amount: Money): boolean {
  return amount.minor === 0;
}

/** "$47.99 + $6.95 + $4.01" — the parts of a single charge, largest first as stated. */
function sumOfParts(terms: CommitmentTerms): string | null {
  const parts = [terms.itemPrice, terms.shipping, terms.tax].filter((part) => !isZero(part));
  if (parts.length === 0) return null;
  return parts.map(formatMoney).join(" + ");
}

function acrossTermArithmetic(terms: CommitmentTerms): string | null {
  switch (terms.shape) {
    case "one_time":
      return "1 payment";

    case "recurring": {
      if (!terms.recurrence) return null;
      const perPeriod = formatMoney({
        currency: terms.itemPrice.currency,
        minor: terms.itemPrice.minor + terms.tax.minor,
      });
      const repeated = `${terms.recurrence.count} × ${perPeriod}`;
      return isZero(terms.shipping) ? repeated : `${repeated} + ${formatMoney(terms.shipping)} shipping once`;
    }

    case "financed": {
      if (!terms.installment) return null;
      const repeated = `${terms.installment.count} × ${formatMoney(terms.installment.amount)}`;
      return isZero(terms.installment.fee)
        ? repeated
        : `${repeated} + ${formatMoney(terms.installment.fee)} fee`;
    }

    default:
      return null;
  }
}

function todayArithmetic(terms: CommitmentTerms): string | null {
  if (terms.shape === "financed") {
    if (!terms.installment) return null;
    return `1 of ${terms.installment.count} payments`;
  }
  return sumOfParts(terms);
}

/**
 * Projects a finished translation into the list the screen renders. It reads
 * the terms and the totals; it never recomputes a figure, so a mistake here is
 * a display mistake and cannot reach the money.
 */
export function presentFigures(
  terms: CommitmentTerms,
  translation: CommitmentTranslation,
): RenderedFigure[] {
  const arithmetic: Record<FigureId, string | null> = {
    acrossTerm: acrossTermArithmetic(terms),
    exit: null,
    today: todayArithmetic(terms),
  };

  const amounts: Record<FigureId, Money | null> = {
    acrossTerm: translation.acrossTerm,
    exit: translation.exit,
    today: translation.today,
  };

  return FIGURE_ORDER.map((id) => ({
    id,
    label: LABELS[id],
    amount: amounts[id],
    arithmetic: arithmetic[id],
  }));
}
