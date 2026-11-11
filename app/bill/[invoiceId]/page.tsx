import { notFound } from "next/navigation";
import { CommitmentView } from "@/components/CommitmentView";
import { Page } from "@/components/Page";
import { findBill } from "@/lib/catalog/bills";
import { computeCommitment } from "@/lib/commitment/compute";
import { presentFigures } from "@/lib/commitment/present";
import { resolveExitTerm, EXIT_UNREADABLE_NOTE, type ExitOutcome } from "@/lib/commitment/published-exit";
import { absentFigureNote, describeSources } from "@/lib/commitment/sources";
import { MODEL_READ_DEADLINE_MS, withBudget } from "@/lib/deadline";
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
  //
  // The reading is a model call, and the model is slow enough that a page
  // cannot wait for it: the sellers' texts are read at start-up, so this is
  // normally a cache hit. When it is not, the page gives up after its budget
  // and says the figure could not be read — a statement about this attempt,
  // not about the biller — while the reading carries on and is remembered for
  // the next view.
  const exitOutcome = await withBudget(
    resolveExitTerm(bill.terms.exit, bill.description, `what ${bill.biller} published`, {
      retries: 0,
    }),
    MODEL_READ_DEADLINE_MS,
    {
      kind: "unreadable",
      exit: { kind: "unknown" },
      note: EXIT_UNREADABLE_NOTE,
      quoted: null,
    } satisfies ExitOutcome,
  );
  const terms = { ...bill.terms, exit: exitOutcome.exit };

  const translation = computeCommitment(terms);
  // The biller's sentence rides on the figure it produced (ITD 19).
  const figures = presentFigures(terms, translation, { sources: { exit: exitOutcome.quoted } });
  const figureNotes = exitOutcome.note ? { exit: exitOutcome.note } : undefined;

  let record;
  try {
    record = await retrieveInvoice(invoiceId);
  } catch {
    return (
      <Page
        back={{ href: "/read", label: "Back to the document reader" }}
        eyebrow={`Bill from ${bill.biller}`}
        title={bill.name}
      >
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
            absent: exitOutcome.kind === "unreadable" ? null : absentFigureNote(figures),
            unreadable: exitOutcome.kind === "unreadable" ? "what it costs to leave" : null,
          })}
        />

        {/* A read that timed out is worth retrying: the bill PayPal holds has
            not changed, only this attempt failed. Without this the visitor's
            only move is to give up on a page that would answer next time. */}
        <p className="scope-note">
          This bill is an example, created in PayPal&apos;s sandbox, so no real money is owed or
          moves.{" "}
          <a href={`/bill/${encodeURIComponent(invoiceId)}?slug=${encodeURIComponent(bill.slug)}`}>
            Try reading PayPal&apos;s copy again
          </a>
          .
        </p>
      </Page>
    );
  }

  // A bill whose amount PayPal and our own computation disagree on has no
  // honest total to show. Say so rather than pick one.
  const disagreement =
    record.amount !== null && record.amount.minor !== translation.today.minor;
  const dueDate = formatDueDate(record.dueDate);

  return (
    <Page
      back={{ href: "/read", label: "Back to the document reader" }}
      eyebrow={`Bill from ${bill.biller}`}
      title={bill.name}
    >
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
              ? `Due ${dueDate} — the due date PayPal holds on this invoice.`
              : "No due date given — PayPal's copy of this invoice does not carry one."
          }
          figureNotes={figureNotes}
          sourceNote={describeSources({
            // The figures are the biller's arithmetic, not PayPal's: the invoice
            // was read to agree the total, not to supply one. Saying "read from
            // PayPal" here would claim a source the numbers never came from.
            published: `what ${bill.biller} published, with the total agreeing with PayPal's copy of this invoice`,
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
        This bill is an example, created in PayPal&apos;s sandbox, so no real money is owed or
        moves. The page is built from the bill PayPal holds each time it opens; nothing about you
        is stored here.
      </p>
    </Page>
  );
}
