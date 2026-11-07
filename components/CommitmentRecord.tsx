import { formatMoney, type Money } from "@/lib/money";

export type RecordNextCharge = { date: Date | null; amount: Money | null } | null;

export type CommitmentRecordData = {
  productName: string;
  /** The PayPal reference — the shopper's only way back to the transaction. */
  reference: string;
  /** `null` when PayPal confirmed the payment but returned no amount for it. */
  paidToday: Money | null;
  acrossTerm: Money | null;
  /** `null` means no source stated what it costs to leave. */
  exit: Money | null;
  /** Why the exit figure has no amount, when it has none (IPD 19). */
  exitNote: string | null;
  /** `null` when there is no further charge. */
  nextCharge: RecordNextCharge;
  manageUrl: string;
  /** Offered only when there is a dated next charge. */
  calendarHref: string | null;
  /** Where the figures came from, built with `describeSources` (IPD 18). */
  sourceNote: string;
};

/**
 * A figure PayPal did not state. Never filled from the catalogue: the record
 * exists because a payment happened, and a figure nobody stated is not evidence
 * that it did.
 */
function amountOrNotStated(amount: Money | null, note?: string) {
  if (amount !== null) return formatMoney(amount);
  return (
    <>
      Not stated
      {note ? <span className="commitment-hint">{note}</span> : null}
    </>
  );
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function CommitmentRecord(record: CommitmentRecordData) {
  return (
    <section className="receipt" aria-labelledby="receipt-heading">
      <h1 id="receipt-heading">Your record: {record.productName}</h1>

      <p className="commitment-summary">
        Keep this page. It is the only copy — nothing about this purchase is stored on this site.
      </p>

      <dl className="commitment-figures">
        <div className="commitment-figure" data-figure="nextCharge">
          <dt>Next charge</dt>
          <dd>
            {record.nextCharge === null
              ? "None — this was a single payment."
              : `${record.nextCharge.date ? formatDate(record.nextCharge.date) : "Date not yet set"} — ${
                  record.nextCharge.amount === null
                    ? "amount not stated by PayPal"
                    : formatMoney(record.nextCharge.amount)
                }`}
          </dd>
        </div>

        <div className="commitment-figure" data-figure="acrossTerm">
          <dt>Across the term</dt>
          <dd>
            {amountOrNotStated(
              record.acrossTerm,
              "PayPal did not state the price this payment runs on.",
            )}
          </dd>
        </div>

        <div className="commitment-figure" data-figure="exit">
          <dt>Cost to leave</dt>
          {/* No default sentence here: the reason is the caller's to state, and
              "the seller published nothing" is wrong when the read failed. */}
          <dd>{amountOrNotStated(record.exit, record.exitNote ?? undefined)}</dd>
        </div>

        <div className="commitment-figure" data-figure="paidToday">
          <dt>Charged today</dt>
          <dd>
            {amountOrNotStated(
              record.paidToday,
              "PayPal did not return the amount it charged.",
            )}
          </dd>
        </div>
      </dl>

      <h2>What to do next</h2>
      <ul className="receipt-actions">
        <li>
          <a href={record.manageUrl}>Manage this payment at PayPal</a> — change or cancel it there.
          PayPal holds the agreement, not this site.
        </li>
        {record.calendarHref ? (
          <li>
            <a href={record.calendarHref} download>
              Add the next charge to your calendar
            </a>{" "}
            — it will remind you a day before.
          </li>
        ) : null}
        <li>
          Print this page with your browser (Ctrl+P or ⌘P), or save it as a PDF.
        </li>
      </ul>

      <p className="commitment-source">
        Payment reference {record.reference}. {record.sourceNote} The agreement itself is held by
        PayPal.
      </p>
    </section>
  );
}
