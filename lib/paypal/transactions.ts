import { addMoney, zeroMoney, type Money } from "@/lib/money";
import { DETAIL_READ_DEADLINE_MS, paypalRequest, withinDeadline } from "./client";
import { parsePayPalAmount } from "./retrieve";

/**
 * What an agreement has taken, as PayPal's own record states it (IPD 45).
 *
 * The broad transaction search is not available to this app's credentials —
 * measured 403 NOT_AUTHORIZED — and it would be the wrong question anyway: it
 * returns every payer's payments, and this screen asks about one agreement. The
 * per-agreement endpoint answers, and its records hold exactly the three things
 * the line needs: when, what status, how much.
 *
 * **The payer is in every record and never leaves this function.** The parsed
 * type names `time`, `status` and `amount`; the response body is read once and
 * not kept. A record is printed, cached and rendered, and none of those should
 * be able to carry someone's name or address.
 */

/** PayPal's own horizon. The endpoint documents three years; wider is a 400. */
const FALLBACK_WINDOW_MS = 3 * 365 * 864e5;

export type TakenRecord =
  | {
      kind: "read";
      /** Completed payments, counted. Every other status is not money taken. */
      count: number;
      /** The sum of what was taken, or `null` when a payment came without one. */
      amount: Money | null;
    }
  | { kind: "unavailable" };

type TransactionsBody = {
  transactions?: Array<{
    time?: string;
    status?: string;
    amount_with_breakdown?: { gross_amount?: { currency_code?: string; value?: string } };
  }>;
};

/**
 * Reads the payments made for one agreement.
 *
 * The window starts when PayPal says the agreement started — a payment for it
 * cannot precede that — and ends a day from now, because PayPal compares in the
 * merchant's calendar and a boundary at this instant can clip a payment made in
 * the same second.
 *
 * Never throws: a read we could not make is `unavailable`, which is a claim
 * about our ability to look and not about the person's payments (IPD 26).
 */
export async function retrievePaymentsTaken(
  id: string,
  startedAt: string | null,
): Promise<TakenRecord> {
  const started = startedAt ? Date.parse(startedAt) : Number.NaN;
  const start = new Date(
    Number.isNaN(started) ? Date.now() - FALLBACK_WINDOW_MS : started,
  );
  const end = new Date(Date.now() + 864e5);

  try {
    const body = await withinDeadline(
      (signal) =>
        paypalRequest<TransactionsBody>(
          `/v1/billing/subscriptions/${encodeURIComponent(id)}/transactions` +
            `?start_time=${encodeURIComponent(start.toISOString())}` +
            `&end_time=${encodeURIComponent(end.toISOString())}`,
          { method: "GET", signal },
        ),
      DETAIL_READ_DEADLINE_MS,
    );

    let count = 0;
    let total = zeroMoney();
    let everyAmountStated = true;

    for (const transaction of body.transactions ?? []) {
      if (transaction?.status !== "COMPLETED") continue;
      count += 1;

      const paid = parsePayPalAmount(transaction.amount_with_breakdown?.gross_amount);
      if (paid) total = addMoney(total, paid);
      else everyAmountStated = false;
    }

    // Half a total is worse than no total: "$49.98 taken" for three payments is
    // a figure nobody could check. The count is still known, so it is kept.
    return { kind: "read", count, amount: everyAmountStated ? total : null };
  } catch {
    // PayPal refused, could not be reached, ran out of budget, or stated an
    // amount in a currency this product has no sentence for. All four are the
    // same claim: we could not look.
    return { kind: "unavailable" };
  }
}
