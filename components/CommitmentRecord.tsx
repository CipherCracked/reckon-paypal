import { formatMoney, type Money } from "@/lib/money";

export type RecordNextCharge = { date: Date | null; amount: Money } | null;

export type CommitmentRecordData = {
  productName: string;
  /** The PayPal reference — the shopper's only way back to the transaction. */
  reference: string;
  paidToday: Money;
  acrossTerm: Money;
  /** `null` means the seller published no exit terms. */
  exit: Money | null;
  /** `null` when there is no further charge. */
  nextCharge: RecordNextCharge;
  manageUrl: string;
  /** Offered only when there is a dated next charge. */
  calendarHref: string | null;
};

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
              : `${record.nextCharge.date ? formatDate(record.nextCharge.date) : "Date not yet set"} — ${formatMoney(record.nextCharge.amount)}`}
          </dd>
        </div>

        <div className="commitment-figure" data-figure="acrossTerm">
          <dt>Across the term</dt>
          <dd>{formatMoney(record.acrossTerm)}</dd>
        </div>

        <div className="commitment-figure" data-figure="exit">
          <dt>Cost to leave</dt>
          <dd>
            {record.exit === null
              ? "Not stated. The seller published no cancellation terms."
              : formatMoney(record.exit)}
          </dd>
        </div>

        <div className="commitment-figure" data-figure="paidToday">
          <dt>Charged today</dt>
          <dd>{formatMoney(record.paidToday)}</dd>
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
        Payment reference {record.reference}. These figures are the ones you were shown before
        paying; the agreement itself is held by PayPal.
      </p>
    </section>
  );
}
