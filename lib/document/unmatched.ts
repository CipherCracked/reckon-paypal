/**
 * What a figure says when the check threw away the sentence that would have
 * answered it (IPD 44).
 *
 * The reader has three absences and two sentences to explain them
 * (`lib/commitment/absence.ts`): the seller wrote nothing, or we could not read
 * their words. A pasted document has a third, and until this pass it had no
 * sentence of its own: the model offered the sentence about leaving, the copy
 * was not found in the text, so it was discarded — and the figure underneath
 * said *the document does not say what it costs to cancel*, which is false and
 * is contradicted, one line later, by the panel quoting the sentence the model
 * offered.
 *
 * So the absence is named for what actually happened: the sentence was not in
 * the text. It does not say the document is silent, because it is not, and it
 * does not put the number on the figure, because nothing was verified.
 *
 * One sentence per question, because a reader learns one sentence once — and
 * both point at the same place as the figure above them, never at the model's
 * vocabulary.
 */
export const UNMATCHED_LEAVING =
  "The sentence about leaving was not in your text, so no figure is shown.";

export const UNMATCHED_TERM =
  "The sentence about how long it runs was not in your text, so no total is shown.";

/**
 * Which refused sentences answer which question. A refusal about a date or a
 * total does not turn a silent document into an unmatched one: only the fields
 * that could have produced the missing figure count.
 */
export const EXIT_ANSWER_FIELDS: ReadonlySet<string> = new Set(["exitFee", "freeToLeave"]);

export const TERM_ANSWER_FIELDS: ReadonlySet<string> = new Set(["paymentCount"]);
