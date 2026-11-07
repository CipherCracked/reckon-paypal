/**
 * What a screen may say about where its figures came from (IPD 18).
 *
 * One line, in the order the reader meets the figures: what was read from a
 * PayPal object, what was computed from the seller's own words, and what
 * nobody stated. There is no default anywhere — a screen that does not build
 * one of these cannot render, so an omission is a type error rather than a
 * claim the screen did not mean to make.
 */
export type FigureSources = {
  /** The PayPal object the figures were read from, named as a reader would name it. */
  paypal?: string | null;
  /** The seller's words the remaining figures were computed from. */
  published?: string | null;
  /**
   * A sentence of the seller's that the exit figure was read out of, with the
   * source it came from (IPD 19). The figure keeps the span that produced it,
   * so the line shows it rather than describing it.
   */
  quoted?: { source: string; span: string } | null;
  /** What no source states, phrased as a subject: "what it costs to leave". */
  absent?: string | null;
};

export function describeSources({ paypal, published, quoted, absent }: FigureSources): string {
  const sentences: string[] = [];

  if (paypal) {
    sentences.push(`Read from ${paypal}.`);
  }

  if (published) {
    sentences.push(
      paypal ? `The rest is computed from ${published}.` : `Computed from ${published}.`,
    );
  }

  if (quoted) {
    // The span is the seller's own sentence, printed rather than summarised.
    // One trailing full stop, ours, because the span usually carries its own.
    const span = quoted.span.trim().replace(/\.$/, "");
    sentences.push(`What it costs to leave is quoted from ${quoted.source}: "${span}".`);
  }

  if (absent) {
    // Not "Not stated": the figure itself already says that. This line says why.
    sentences.push(`Nobody published ${absent}.`);
  }

  if (sentences.length === 0) {
    throw new Error("A screen must say where its figures came from (IPD 18).");
  }

  return sentences.join(" ");
}

/**
 * The source nobody supplied, read off the figures rather than the terms: if
 * the exit figure has no amount, no source stated it. PayPal has no field for
 * this figure, so a screen can only report whether the seller's words said
 * anything (IPD 19).
 */
export function absentFigureNote(
  figures: { id: string; amount: { minor: number } | null }[],
): string | null {
  const exit = figures.find((figure) => figure.id === "exit");
  return exit && exit.amount === null ? "what it costs to leave" : null;
}
