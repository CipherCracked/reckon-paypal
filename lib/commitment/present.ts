import { formatMoney, type Money } from "../money.ts";
import type { CommitmentTerms, CommitmentTranslation } from "./types";

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
  const parts = [terms.itemPrice, terms.shipping, terms.tax].filter((part) => !isZero(part));
  if (parts.length === 0) return null;
  return parts.map(formatMoney).join(" + ");
}

function acrossTermArithmetic(terms: CommitmentTerms, extra: string): string | null {
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
      return isZero(terms.shipping) ? repeated : `${repeated} + ${formatMoney(terms.shipping)} ${extra}`;
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
  const arithmetic: Record<FigureId, string | null> = {
    acrossTerm: acrossTermArithmetic(terms, labels.extra ?? "shipping once"),
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
    source: labels.sources?.[id] ?? null,
  }));
}
