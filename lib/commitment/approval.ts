import { formatMoney } from "../money.ts";
import type { CommitmentShape } from "./types.ts";
import type { FigureId, RenderedFigure } from "./present.ts";

/**
 * What PayPal's button will do, in the product's own words, above the button.
 *
 * IPD 48 decided the money screen would carry one control for all three shapes
 * and a sentence of ours above it saying what approval does — because the
 * control's label belongs to PayPal and says only "Subscribe", and because, seen
 * in a browser on 2026-11-12, **PayPal's button prints no amount at all**. Beside
 * the control this sentence is therefore the only place the money is named: the
 * three figures are hundreds of pixels up the page, and a shopper who has
 * scrolled to the button should not have to scroll back to learn what pressing
 * it costs.
 *
 * The sentence never computes a figure. It reads the two the screen already
 * rendered, keeps a floor a floor ("at least", where the seller never said what
 * shipping is), and says nothing at all rather than guess if they are missing.
 */
export function describeApproval(
  shape: CommitmentShape,
  figures: RenderedFigure[],
): string | null {
  const today = find(figures, "today");
  if (!today) return null;

  if (shape === "one_time") {
    return `PayPal's button charges ${atLeast(today)} now, once.`;
  }

  const acrossTerm = find(figures, "acrossTerm");
  if (!acrossTerm) return null;

  // "The plan above" rather than a count: the schedule line has already said how
  // many payments there are and what they are, and a second count is a second
  // number that could drift from the first.
  const plan = shape === "financed" ? "the instalment plan above" : "the plan above";
  return `PayPal's button approves ${plan}: ${atLeast(today)} today, ${atLeast(acrossTerm)} across the term.`;
}

function find(figures: RenderedFigure[], id: FigureId): RenderedFigure | null {
  const figure = figures.find((candidate) => candidate.id === id);
  return figure && figure.amount ? figure : null;
}

/** "at least $24.99" where the amount is the sum of what was stated and no more. */
function atLeast(figure: RenderedFigure): string {
  const amount = formatMoney(figure.amount!);
  return figure.floor ? `at least ${amount}` : amount;
}
