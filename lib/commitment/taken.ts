import { formatMoney, money, type Money } from "@/lib/money";
import type { TakenRecord } from "@/lib/paypal/transactions";

/**
 * What the receipt says about money PayPal has actually taken (IPD 45).
 *
 * The fact is two facts — how many payments, and how much — and the count is
 * the half that matters: *1 of 6* is what tells a person where in the agreement
 * they are. That is why this is a line rather than a fourth figure, and why it
 * has a sentence for every state the two sources can produce. A figure tile has
 * room for an amount and not for a state; this has room for both.
 *
 * The money comes from PayPal's transactions. The *of 6* comes from the plan,
 * which is the only place a term's length is stated. Neither is derived from
 * the other, and neither is derived from the calendar: the count is what PayPal
 * recorded, not what should have happened by now.
 */

export type TakenLine = {
  kind:
    | "some"
    | "all"
    | "none"
    | "no-term"
    | "unstated-amount"
    | "disagrees"
    | "unavailable";
  /** What the line reads on screen, after its label. */
  text: string;
  /** The same fact for the read-aloud, which has no label beside it. */
  spoken: string;
};

function payments(count: number): string {
  return count === 1 ? "1 payment" : `${count} payments`;
}

export function takenLine(
  record: TakenRecord,
  termCount: number | null,
  acrossTerm: Money | null,
): TakenLine {
  if (record.kind === "unavailable") {
    return {
      kind: "unavailable",
      text: "Not read — PayPal's payment record could not be read just now.",
      spoken: "Taken so far: not read. PayPal's payment record could not be read just now.",
    };
  }

  const { count, amount } = record;

  if (count === 0) {
    // A statement about PayPal's record, not about the shopper's money: a trial
    // and a payment that has not settled both look like this.
    return {
      kind: "none",
      text: "Nothing yet — PayPal's record lists no completed payment.",
      spoken: "Taken so far: nothing yet. PayPal's record lists no completed payment.",
    };
  }

  if (amount === null) {
    const completed = count === 1 ? "1 completed payment" : `${count} completed payments`;
    return {
      kind: "unstated-amount",
      text: `${completed} — PayPal did not state the amount.`,
      spoken: `Taken so far: ${completed}. PayPal did not state the amount.`,
    };
  }

  const taken = formatMoney(amount);

  if (termCount === null || acrossTerm === null) {
    return {
      kind: "no-term",
      text: `${taken} — PayPal did not state how many payments this agreement runs to.`,
      spoken: `Taken so far: ${taken}. PayPal did not state how many payments this agreement runs to.`,
    };
  }

  // The plan says the agreement was for this much and PayPal's record says more
  // was taken. A remainder computed across the two would be a figure neither
  // source states, so the disagreement is what gets said.
  if (count > termCount || amount.minor > acrossTerm.minor) {
    return {
      kind: "disagrees",
      text: `${taken} — more than the ${formatMoney(acrossTerm)} this agreement was for. Check it with PayPal.`,
      spoken: `Taken so far: ${taken}, more than the ${formatMoney(acrossTerm)} this agreement was for. Check it with PayPal.`,
    };
  }

  if (count === termCount) {
    return {
      kind: "all",
      text: `${taken} — all ${payments(termCount)}.`,
      spoken: `Taken so far: ${taken}, all ${payments(termCount)}.`,
    };
  }

  return {
    kind: "some",
    text: `${taken} — ${count} of ${termCount} payments.`,
    spoken: `Taken so far: ${taken}, ${count} of ${termCount} payments.`,
  };
}

/**
 * The facts a plain-language sentence may be written from (IPD 46).
 *
 * Only a state where both sources agree and something has happened has facts
 * worth explaining: a record we could not read, a record with nothing completed,
 * a payment whose amount PayPal withheld, a plan with no stated length, and a
 * disagreement between the two are each already the whole sentence. Handing the
 * model one of those would be asking it to explain an absence, which is the
 * line's job.
 *
 * `stillToCome` is the server's subtraction over PayPal's figures, in minor
 * units. The model is never asked to do it; it is handed the result and may
 * only write that result.
 */
export type PlainWordsFacts = {
  count: number;
  taken: Money;
  termCount: number;
  acrossTerm: Money;
  stillToCome: Money;
};

export function plainWordsFacts(
  record: TakenRecord,
  termCount: number | null,
  acrossTerm: Money | null,
): PlainWordsFacts | null {
  if (record.kind !== "read" || record.amount === null) return null;
  if (termCount === null || acrossTerm === null) return null;
  if (record.count === 0) return null;
  if (record.count > termCount || record.amount.minor > acrossTerm.minor) return null;

  return {
    count: record.count,
    taken: record.amount,
    termCount,
    acrossTerm,
    stillToCome: money(acrossTerm.minor - record.amount.minor),
  };
}
