import { notFound } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { CommitmentView } from "@/components/CommitmentView";
import { findBill } from "@/lib/catalog/bills";
import { computeCommitment } from "@/lib/commitment/compute";
import { presentFigures } from "@/lib/commitment/present";
import { resolveExitTerm } from "@/lib/commitment/published-exit";
import { absentFigureNote, describeSources } from "@/lib/commitment/sources";
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

  // The third figure is the biller's, and a bill is where they are most likely
  // to have said nothing: PayPal has no field for it, so when the terms are
  // silent the biller's own words are read and the absence is reported as
  // theirs (IPD 19). Same rule as the consent screen, same code.
  const exitOutcome = await resolveExitTerm(
    bill.terms.exit,
    bill.description,
    `what ${bill.biller} published`,
  );
  const terms = { ...bill.terms, exit: exitOutcome.exit };

  const translation = computeCommitment(terms);
  const figures = presentFigures(terms, translation);
  const figureNotes = exitOutcome.note ? { exit: exitOutcome.note } : undefined;

  let record;
  try {
    record = await retrieveInvoice(invoiceId);
  } catch {
    return (
      <div className="page">
        <BackLink href="/">Back to the ways in</BackLink>

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
          figureNotes={figureNotes}
          // PayPal did not answer, so there is no due date to state either.
          schedule="No due date stated — PayPal could not be reached to read this bill."
          sourceNote={describeSources({
            published: `what ${bill.biller} published`,
            quoted: exitOutcome.quoted,
            absent: exitOutcome.kind === "unreadable" ? null : absentFigureNote(figures),
            unreadable: exitOutcome.kind === "unreadable" ? "what it costs to leave" : null,
          })}
        />
      </div>
    );
  }

  // A bill whose amount PayPal and our own computation disagree on has no
  // honest total to show. Say so rather than pick one.
  const disagreement =
    record.amount !== null && record.amount.minor !== translation.today.minor;
  const dueDate = formatDueDate(record.dueDate);

  return (
    <div className="page">
      <BackLink href="/">Back to the ways in</BackLink>

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
          figureNotes={figureNotes}
          sourceNote={describeSources({
            // The figures are the biller's arithmetic, not PayPal's: the invoice
            // was read to agree the total, not to supply one. Saying "read from
            // PayPal" here would claim a source the numbers never came from.
            published: `what ${bill.biller} published, with the total agreeing with PayPal's copy of this invoice`,
            quoted: exitOutcome.quoted,
            absent: absentFigureNote(figures),
          })}
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
    </div>
  );
}
