/**
 * What the reader may be told about a document. The model does not answer with
 * any of these values — it answers with a span of the document, and our code
 * reads the value out of that span (ITD 10). This list is therefore the whole
 * vocabulary of the reading path: nothing outside it can reach a figure.
 */
export const FIELDS = [
  /** The whole amount owed at once, as the document states it. */
  "totalDue",
  /** One repeating charge — per month, per instalment. */
  "amountPerPeriod",
  /** How many charges there are. */
  "paymentCount",
  /** The cadence word: per month, a year. */
  "period",
  /** Anything charged once on top of the repeating amount. */
  "oneTimeExtra",
  /** What leaving early costs. */
  "exitFee",
  /** A statement that leaving costs nothing. */
  "freeToLeave",
  /** When the money is owed. */
  "dueDate",
] as const;

export type FieldName = (typeof FIELDS)[number];

export const FIELD_DESCRIPTIONS: Record<FieldName, string> = {
  totalDue: "The complete amount the document says is owed, as one figure.",
  amountPerPeriod: "The amount of one repeating charge, such as a monthly payment.",
  paymentCount: "A sentence saying how many payments there are in total.",
  period: "The words that say how often a payment falls due.",
  oneTimeExtra: "A charge made once, on top of the repeating amount — setup, delivery, activation.",
  exitFee: "What it costs to cancel or leave the agreement early.",
  freeToLeave: "Words stating that cancelling costs nothing.",
  dueDate: "The date by which money must be paid.",
};

export function isFieldName(value: unknown): value is FieldName {
  return typeof value === "string" && (FIELDS as readonly string[]).includes(value);
}
