import Link from "next/link";
import { FigureGrid } from "@/components/FigureGrid";
import { computeCommitment } from "@/lib/commitment/compute";
import { presentFigures } from "@/lib/commitment/present";
import { describeSchedule } from "@/lib/commitment/schedule";
import type { SubscriptionRecord } from "@/lib/paypal/retrieve";

/**
 * One commitment in the list on the home screen (ITD 25).
 *
 * The list is a summary, and a summary a person cannot open is a dead end: the
 * rows used to show the three figures with no way to the record they summarised,
 * so the only route to a receipt was the link the shopper had already lost. Each
 * row now ends in the record's own address.
 *
 * The figures are `compact` — the label, the amount and the arithmetic, with no
 * quotation — because the record is one click away and is where the seller's
 * sentences live.
 */
export function CommitmentRow({
  record,
  read,
}: {
  record: { id: string; status: string };
  read: SubscriptionRecord | null;
}) {
  const href = `/receipt/${encodeURIComponent(record.id)}`;

  // PayPal is the only source for what this is, so a record it would not
  // describe is reported as unread rather than shown with figures from nowhere.
  if (!read || !read.terms) {
    return (
      <li className="account-row">
        <div className="account-row-head">
          <p className="account-row-heading">A subscription this store holds for you</p>
        </div>
        <p className="account-row-standing">
          PayPal did not say what this one costs. Its reference is {record.id}.
        </p>
        <Link className="row-link" href={href}>
          Open the record
        </Link>
      </li>
    );
  }

  const figures = presentFigures(read.terms, computeCommitment(read.terms));
  const cancelled = record.status.toUpperCase() === "CANCELLED";

  return (
    <li className="account-row">
      <div className="account-row-head">
        <p className="account-row-heading">
          {describeSchedule(read.terms, { firstPaymentToday: false })}
        </p>
        {/* PayPal's own word for the state, not this page's summary of it. */}
        <span className="status-chip" data-tone={cancelled ? "closed" : "open"}>
          {record.status.toLowerCase()}
        </span>
      </div>
      <p className="account-row-standing">
        {cancelled
          ? "PayPal says this subscription is cancelled. It will take no further payments for it."
          : `PayPal says this subscription is ${record.status.toLowerCase()}.`}
        {!cancelled && read.nextBillingTime
          ? ` Next charge ${new Date(read.nextBillingTime).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
              timeZone: "UTC",
            })}.`
          : ""}
      </p>

      <FigureGrid figures={figures} variant="compact" />

      <Link className="row-link" href={href}>
        Open the record
      </Link>
    </li>
  );
}
