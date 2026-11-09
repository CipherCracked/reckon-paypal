import { CancelSubscription } from "@/components/CancelSubscription";
import { ReadAloud } from "@/components/ReadAloud";
import { formatMoney, type Money } from "@/lib/money";
import type { FigureSource } from "@/lib/commitment/present";

export type RecordNextCharge = { date: Date | null; amount: Money | null } | null;

/**
 * Where the commitment stands, as PayPal states it (IPD 23).
 *
 * Only two of PayPal's states reach a settled record in a shape the product can
 * act on. `running` is a subscription still taking payments, and it is the only
 * case that offers the cancel; `cancelled` is one PayPal reports ended, which the
 * record states rather than hiding behind a "nothing has been taken".
 */
export type RecordStanding =
  | { kind: "running"; subscriptionId: string }
  | { kind: "cancelled"; at: Date | null };

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
  /** The seller's sentence the exit figure was read out of, when one was (ITD 19). */
  exitSource: FigureSource | null;
  /** `null` when there is no further charge. */
  nextCharge: RecordNextCharge;
  /** `null` for a one-time payment, which has nothing to run or to end. */
  standing: RecordStanding | null;
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

/**
 * What "Read this aloud" says on a record. Same shape as the figures elsewhere —
 * each figure with its amount, in the order shown — because a reader who learned
 * the control on one screen should hear the same thing on the next (IPD 24).
 */
function spokenRecord(record: CommitmentRecordData): string {
  const figure = (label: string, amount: Money | null) =>
    amount === null ? `${label}: not stated.` : `${label}: ${formatMoney(amount)}.`;

  const next = record.standing?.kind === "cancelled"
    ? "Next charge: none. PayPal reports this subscription as cancelled."
    : record.nextCharge === null
      ? "Next charge: none. This was a single payment."
      : record.nextCharge.date
        ? `Next charge: ${formatDate(record.nextCharge.date)}, ${
            record.nextCharge.amount === null
              ? "amount not stated."
              : `${formatMoney(record.nextCharge.amount)}.`
          }`
        : "Next charge: date not yet set.";

  return [
    `Your record for ${record.productName}.`,
    figure("Charged today", record.paidToday),
    figure("Across the term", record.acrossTerm),
    figure("Cost to leave", record.exit),
    next,
  ].join(" ");
}

export function CommitmentRecord(record: CommitmentRecordData) {
  const cancelled = record.standing?.kind === "cancelled" ? record.standing : null;

  return (
    <section className="receipt" aria-labelledby="receipt-heading">
      <h1 id="receipt-heading">Your record: {record.productName}</h1>

      <p className="commitment-summary">
        Keep this page. It is the only copy — nothing about this purchase is stored on this site.
      </p>

      {cancelled ? (
        // Said separately from the figures, because the figures are what the
        // agreement was and this is what PayPal says about it now (IPD 23).
        <p className="notice" role="status" data-standing="cancelled">
          PayPal reports this subscription as cancelled
          {cancelled.at ? ` on ${formatDate(cancelled.at)}` : ""}. It will take no further payments
          for it.
        </p>
      ) : null}

      <dl className="commitment-figures">
        <div className="commitment-figure" data-figure="nextCharge">
          <dt>Next charge</dt>
          <dd>
            {cancelled
              ? "None — PayPal reports this subscription as cancelled."
              : record.nextCharge === null
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
            {cancelled && record.acrossTerm !== null ? (
              // The figure stays as the agreement stated it. Reconciling it with
              // what was actually paid would mean keeping state this product
              // does not keep, so the record says which of the two it shows.
              <span className="commitment-hint">
                The whole agreement was for this much. It ended early, so this is what it was for,
                not what it will cost.
              </span>
            ) : null}
          </dd>
        </div>

        <div className="commitment-figure" data-figure="exit">
          <dt>Cost to leave</dt>
          {/* No default sentence here: the reason is the caller's to state, and
              "the seller published nothing" is wrong when the read failed. */}
          <dd>
            {amountOrNotStated(record.exit, record.exitNote ?? undefined)}
            {record.exitSource ? (
              // The record quotes too: a figure a shopper keeps is the one most
              // worth tracing back to the seller's words (ITD 19).
              <span className="commitment-quote">
                <q>{record.exitSource.span}</q>{" "}
                <span className="commitment-quote-source">— {record.exitSource.label}</span>
              </span>
            ) : null}
            {/* The figure and its verb in one place (IPD 23): what leaving costs,
                and the way to leave, are the same sentence of the record. */}
            {record.standing?.kind === "running" ? (
              <CancelSubscription
                subscriptionId={record.standing.subscriptionId}
                productName={record.productName}
                reference={record.reference}
                manageUrl={record.manageUrl}
              />
            ) : null}
          </dd>
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

      <div className="commitment-spoken">
        <ReadAloud text={spokenRecord(record)} />
      </div>

      <h2>What to do next</h2>
      <ul className="receipt-actions">
        <li>
          <a href={record.manageUrl}>Manage this payment at PayPal</a> —{" "}
          {cancelled
            ? "PayPal holds the agreement, not this site."
            : "change or cancel it there. PayPal holds the agreement, not this site."}
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
