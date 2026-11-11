/**
 * The two absences the seller can be responsible for, in the words a reader
 * already has (IPD 31).
 *
 * There are two of them and they are not the same fact: a seller who published
 * nothing about leaving, and a reading that did not happen. `published-exit.ts`
 * exists to keep them apart, and before this module each screen explained its
 * one in a paragraph of its own wording — four paraphrases of two sentences, on
 * a product whose promise is that a person does not have to read prose to know
 * what a figure means.
 *
 * So the sentences live here, once, and every caller that reports an absence
 * uses the same words in the same place. Short on purpose: *the seller's words
 * don't say* is a finding, and a finding that takes a line to read has stopped
 * being one for the reader this is for.
 *
 * They are about the seller's words rather than about money, so neither can be
 * reused for an absence of another kind — the record's *PayPal did not state the
 * price* is a different sentence about a different source.
 */
export const SELLER_SAYS_NOTHING = "The seller's words don't say what leaving costs.";

/**
 * *Couldn't read* is a statement about this attempt, never about the seller. The
 * figure above still reads *Not stated*, and this line is what keeps that from
 * being a claim the seller stayed silent.
 */
export const SELLER_UNREADABLE = "We couldn't read the seller's words.";
