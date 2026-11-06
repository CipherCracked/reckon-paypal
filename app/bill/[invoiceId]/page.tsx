import { notFound } from "next/navigation";
import { CommitmentView } from "@/components/CommitmentView";
import { findBill } from "@/lib/catalog/bills";
import { computeCommitment } from "@/lib/commitment/compute";
import { presentFigures } from "@/lib/commitment/present";
import { formatMoney } from "@/lib/money";
import { retrieveInvoice } from "@/lib/paypal/retrieve";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ invoiceId: string }>;
  searchParams: Promise<{ slug?: string }>;
};

function formatDueDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return null;
  // Day first, spelled out, built from UTC parts so the date cannot shift with
  // the reader's timezone or locale.
  const month = date.toLocaleDateString("en-GB", { month: "long", timeZone: "UTC" });
  return `${date.getUTCDate()} ${month} ${date.getUTCFullYear()}`;
}

export default async function BillPage({ params, searchParams }: PageProps) {
  const { invoiceId } = await params;
  const { slug } = await searchParams;
  const bill = slug ? findBill(slug) : undefined;

  if (!bill) {
    notFound();
  }

  const translation = computeCommitment(bill.terms);
  const figures = presentFigures(bill.terms, translation);

  let record;
  try {
    record = await retrieveInvoice(invoiceId);
  } catch {
    return (
      <main className="page">
        <header className="page-header">
          <p className="eyebrow">Bill from {bill.biller}</p>
          <h1>{bill.name}</h1>
        </header>
        <p className="notice" role="status">
          PayPal could not show this bill right now. The figures below are computed from what{" "}
          {bill.biller} published, not from PayPal&apos;s copy — check the amount with them before
          paying.
        </p>
        <CommitmentView
          figures={figures}
          breakdown={translation.breakdown}
          labels={{ item: "Before tax", shipping: "Additional charge", tax: "Tax" }}
          summary={bill.description}
          // PayPal did not answer, so there is no due date to state either.
          schedule="No due date stated — PayPal could not be reached to read this bill."
        />
      </main>
    );
  }

  // A bill whose amount PayPal and our own computation disagree on has no
  // honest total to show. Say so rather than pick one.
  const disagreement =
    record.amount !== null && record.amount.minor !== translation.today.minor;
  const dueDate = formatDueDate(record.dueDate);

  return (
    <main className="page">
      <header className="page-header">
        <p className="eyebrow">Bill from {bill.biller}</p>
        <h1>{bill.name}</h1>
      </header>

      {disagreement ? (
        <p className="notice" role="alert">
          PayPal holds {record.amount ? formatMoney(record.amount) : "an amount"} for this bill, but
          the published terms add up to {formatMoney(translation.today)}. The figures below are not
          shown until that is resolved — ask {bill.biller} which amount is correct.
        </p>
      ) : (
        <CommitmentView
          figures={figures}
          breakdown={translation.breakdown}
          labels={{ item: "Before tax", shipping: "Additional charge", tax: "Tax" }}
          summary={bill.description}
          schedule={
            dueDate
              ? `Due ${dueDate} — the date ${bill.biller} set on the bill.`
              : "No due date stated — the biller did not put one on this invoice."
          }
        />
      )}

      {record.payerUrl && !disagreement ? (
        <p className="pay-link">
          <a href={record.payerUrl} rel="noreferrer">
            Pay this bill at PayPal
          </a>
          <span className="pay-link-note">
            {" "}
            — you pay on PayPal&apos;s page; this screen never asks for card details.
          </span>
        </p>
      ) : null}

      <p className="scope-note">
        This page is built from the bill PayPal holds each time it opens. Nothing about you is
        stored here.
      </p>
    </main>
  );
}
