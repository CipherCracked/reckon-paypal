/**
 * The one line that says a sentence was read by the model rather than taken
 * from a table (IPD 43).
 *
 * Until this pass the product's strongest claim — a model pointed at a sentence,
 * and the server found that sentence word for word in the text before anything
 * was read out of it — lived in the disclosure under the figures. The figures
 * themselves showed their evidence and said nothing about where it came from,
 * so a reader who does not open the disclosure sees quotes and has to take on
 * trust that a model produced them.
 *
 * The words are written for the reader's own document, which is the only screen
 * that carries it today: on `/read` every quotation was cut out of what the
 * reader pasted. A screen reading a seller's published text would need its own
 * sentence rather than this one with a noun swapped.
 *
 * **The mark is the screen's claim, not the sentence's** (ITD 37). A curated
 * quote and a read one render identically, so this line may only appear where
 * the caller can say the model did the reading — never inferred from the
 * presence of a quotation.
 */
export const READ_BY_MODEL = "Read by the model, checked against your text.";
