import { CancelSubscription } from "@/components/CancelSubscription";
import { FigureGrid } from "@/components/FigureGrid";
import { ReadAloud } from "@/components/ReadAloud";
import { formatMoney, type Money } from "@/lib/money";
import type { FigureSource, RenderedFigure } from "@/lib/commitment/present";

export type RecordNextCharge = { date: Date | null; amount: Money | null } | null;

/**
 * Where the commitment stands, as PayPal states it (IPD 23).
 *
 * Only two of PayPal's states reach a settled record in a shape the product can
 * act on. `running` is a plan still taking payments, and it is the only case that
 * offers the cancel; `cancelled` is one PayPal reports ended, which the record
 * states rather than hiding behind a "nothing has been taken".
 *
 * `agreement` is what PayPal holds, in the shopper's words: a repeating
 * subscription or a payment plan being paid off in instalments. Both are
 * subscriptions to PayPal and both are ended the same way, so the record says
 * which one it is instead of calling every arrangement a subscription.
 */
export type AgreementKind = "subscription" | "payment plan";

export type RecordStanding =
  | { kind: "running"; subscriptionId: string; agreement: AgreementKind }
  | { kind: "cancelled"; at: Date | null; agreement: AgreementKind };

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
    ? `Next charge: none. PayPal reports this ${record.standing.agreement} as cancelled.`
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

  // The three figures, in the order the product puts them everywhere else. The
  // next charge is not one of them: it is a fact about the agreement, so it
  // sits on the standing line above rather than opening a grid whose other
  // tiles are the thing the page is for (ITD 25).
  const figures: RenderedFigure[] = [
    {
      id: "acrossTerm",
      label: "Across the term",
      amount: record.acrossTerm,
      floor: false,
      arithmetic: null,
      source: null,
    },
    {
      id: "exit",
      label: "Cost to leave",
      amount: record.exit,
      floor: false,
      arithmetic: null,
      // The record quotes too: a figure a shopper keeps is the one most worth
      // tracing back to the seller's words (ITD 19).
      source: record.exitSource,
    },
    {
      id: "today",
      label: "Charged today",
      amount: record.paidToday,
      floor: false,
      arithmetic: null,
      source: null,
    },
  ];

  const nextCharge = cancelled
    ? `None — PayPal reports this ${cancelled.agreement} as cancelled.`
    : record.nextCharge === null
      ? "None — this was a single payment."
      : `${
          record.nextCharge.date ? formatDate(record.nextCharge.date) : "Date not yet set"
        } — ${
          record.nextCharge.amount === null
            ? "amount not stated by PayPal"
            : formatMoney(record.nextCharge.amount)
        }`;

  return (
    <section className="receipt" aria-labelledby="receipt-heading">
      <h1 id="receipt-heading">Your record: {record.productName}</h1>

      <p className="commitment-summary">Keep this page — it is the only copy.</p>

      {cancelled ? (
        // Said separately from the figures, because the figures are what the
        // agreement was and this is what PayPal says about it now (IPD 23).
        <p className="notice" role="status" data-standing="cancelled">
          PayPal reports this {cancelled.agreement} as cancelled
          {cancelled.at ? ` on ${formatDate(cancelled.at)}` : ""}. It will take no further payments
          for it.
        </p>
      ) : null}

      <p className="record-standing">
        <span className="record-standing-label">Next charge</span> {nextCharge}
      </p>

      <FigureGrid
        figures={figures}
        figureNotes={{
          acrossTerm: "PayPal did not state the price this payment runs on.",
          today: "PayPal did not return the amount it charged.",
          // No default sentence: the reason is the caller's to state, and "the
          // seller published nothing" is wrong when the read failed.
          exit: record.exitNote ?? undefined,
        }}
        figureExtras={{
          acrossTerm:
            cancelled && record.acrossTerm !== null ? (
              // The figure stays as the agreement stated it. Reconciling it with
              // what was actually paid would mean keeping state this product
              // does not keep, so the record says which of the two it shows.
              <span className="commitment-hint">
                The whole agreement was for this much. It ended early, so this is what it was for,
                not what it will cost.
              </span>
            ) : null,
          // The figure and its verb in one place (IPD 23): what leaving costs,
          // and the way to leave, are the same sentence of the record.
          exit:
            record.standing?.kind === "running" ? (
              <CancelSubscription
                subscriptionId={record.standing.subscriptionId}
                agreement={record.standing.agreement}
                productName={record.productName}
                reference={record.reference}
                manageUrl={record.manageUrl}
              />
            ) : null,
        }}
      />

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
        {record.calendarHref && !cancelled ? (
          // A cancelled agreement has no next charge to remind anyone about —
          // the figure above already says so — and the route behind this link
          // answers 404 for the same reason. An offer that cannot be honoured is
          // worse than no offer.
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
