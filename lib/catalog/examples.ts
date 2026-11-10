/**
 * The documents the reader page offers, so a visitor can watch the reader work
 * before deciding whether to trust it with their own (IPD 22).
 *
 * They are content, like the products and the bills, and they are held to the
 * same rule: every figure they state is a figure the reading can support. None
 * of them is a real seller, and the page says so where they appear.
 *
 * Each is written the way a document writes, including the parts that make it
 * hard to read — a fee buried in a sentence, a term stated in one clause and a
 * waiver in another. Short enough to read on screen, and over the route's
 * forty-character minimum.
 */
export type ExampleDocument = {
  slug: string;
  /** The button's own words: what the visitor is about to ask for. */
  label: string;
  /** One line saying what the document is, so the click is not a gamble. */
  note: string;
  /**
   * The one written to be refused. It states amounts and no commitment, which
   * is the deterministic candidate path rather than a model failure (IPD 22).
   */
  refused?: boolean;
  text: string;
};

export const exampleDocuments: ExampleDocument[] = [
  {
    slug: "phone-contract",
    label: "Read a phone contract",
    note: "24 months at $32.00 a month, with a fee for leaving early.",
    text: `Mobile service agreement — Amberline Mobile

You are agreeing to 24 months of service at $32.00 per month. A connection fee of $15.00 is charged once, with your first payment. If you cancel before the end of the 24 months, an early termination fee of $180.00 is charged. Your first payment is due 1 December 2026.`,
  },
  {
    slug: "gym-membership",
    label: "Read a gym membership",
    note: "A joining fee, a stated term, and a sentence saying leaving is free.",
    text: `Gym membership agreement — Marchmont Fitness

This membership runs for 12 months at $45.00 a month. A joining fee of $30.00 is charged once, with the first payment. You may cancel at any time and there is no cancellation fee.`,
  },
  {
    slug: "payment-plan",
    label: "Read a payment plan",
    note: "One total, the date it is owed by, and what cancelling costs.",
    text: `Repayment plan — Halden Electrical

The agreed total for the work is $1,860.00, payable by 30 November 2026. This is the whole amount: nothing further is charged. If you cancel the booking, a call-out fee of $95.00 is charged.`,
  },
  {
    slug: "fee-schedule",
    label: "Try a page of fees",
    note: "It states amounts and never says what is owed in total, so this page refuses it and shows you the amounts it found.",
    refused: true,
    text: `Boathouse Club — schedule of fees, 10 November 2026

Replacement key card: $15.00, charged once.
Cancelling more than 30 days before your renewal date costs $25.00.
Cancelling within 30 days of your renewal date costs $50.00.
Your annual membership charge is set out in the notice we send you, not on this page.`,
  },
];

export function findExample(slug: string): ExampleDocument | undefined {
  return exampleDocuments.find((example) => example.slug === slug);
}
