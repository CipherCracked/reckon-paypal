import { formatMoney } from "@/lib/money";
import type { RenderedFigure } from "@/lib/commitment/present";

export type SpokenCommitment = {
  /** The plain-language summary, when the screen shows one. */
  summary?: string | null;
  /** The figures in the order they are shown. */
  figures: RenderedFigure[];
  /** When the money leaves — a fact, spoken after the figures. */
  schedule?: string | null;
};

/**
 * What "Read this aloud" says, composed from what the screen is showing (IPD 24).
 *
 * It lives here rather than in a component because the rule is the sentence, not
 * the button: the figures in their order, the arithmetic that produced each one,
 * then when the money leaves. Every screen that shows figures speaks the same
 * way, and there is one place to change if that stops being right.
 *
 * The model is never asked to write this. It is the page's own data, read out —
 * the same discipline as the figures themselves.
 */
export function spokenCommitment({ summary, figures, schedule }: SpokenCommitment): string {
  const spoken = figures.map((figure) => {
    // The screen says "At least $179.95"; the voice has to say the same thing,
    // or the two readings of the same screen disagree.
    const amount =
      figure.amount === null
        ? `${figure.label}: not stated.`
        : `${figure.label}: ${figure.floor ? "at least " : ""}${formatMoney(figure.amount)}.`;
    return figure.arithmetic ? `${amount} That is ${figure.arithmetic}.` : amount;
  });

  return [summary ?? "", ...spoken, schedule ?? ""].filter(Boolean).join(" ");
}
