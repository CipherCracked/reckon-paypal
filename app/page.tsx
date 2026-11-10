import Link from "next/link";
import { BillDoor } from "@/components/BillDoor";
import { CommitmentView } from "@/components/CommitmentView";
import { findBill } from "@/lib/catalog/bills";
import { resolveProduct } from "@/lib/catalog/resolve";
import { computeCommitment } from "@/lib/commitment/compute";
import { presentFigures } from "@/lib/commitment/present";
import {
  EXIT_UNREADABLE_NOTE,
  resolveExitTerm,
  type ExitOutcome,
} from "@/lib/commitment/published-exit";
import { describeSchedule } from "@/lib/commitment/schedule";
import { absentFigureNote, describeSources } from "@/lib/commitment/sources";
import { MODEL_READ_DEADLINE_MS, withBudget } from "@/lib/deadline";
import { formatMoney } from "@/lib/money";

/** The catalogue is read per request, so the front door reflects PayPal rather than a build. */
export const dynamic = "force-dynamic";

/**
 * The sentence that says what the two columns are to each other (IPD 21 §4).
 *
 * It is derived from what actually happened rather than written once and hoped
 * for: the only figure read out of the seller's words is the cost to leave, the
 * other two are arithmetic over the price, and when the reading found nothing
 * the line says that instead of claiming a quote the screen does not show.
 */
function relationshipSentence(outcome: ExitOutcome): string {
  switch (outcome.kind) {
    case "stated":
      return "Cost to leave was read out of the seller's own words above — the reader copies the sentence and this page checks it against the text. The other two figures are arithmetic over the price the seller states, and the line under them says which source that price came from.";
    case "silent":
      return "The seller's words above say nothing about leaving, so the cost to leave reads Not stated rather than a number this page would have had to invent. The other two figures are arithmetic over the price the seller states.";
    case "unreadable":
      return "The seller's words above could not be read just now, so the cost to leave is not shown. A figure is never filled in from a guess.";
  }
}

/**
 * The entry states the product, then proves it on one real commitment before
 * asking anything (IPD 14).
 *
 * The worked commitment is read the same way every other screen reads one —
 * PayPal first, the catalogue file second (IPD 20) — so the front door cannot
 * be the one surface that quietly disagrees with the consent screen. No PayPal
 * object is created by a visit (ITD 16); a read creates nothing, and the
 * screen says so.
 *
 * Since IPD 21 it also shows the work: the seller's own words on the left, the
 * figures and the sentence behind each on the right, so the transformation the
 * product exists for is visible without a click.
 */
export default async function Home() {
  const [subscription, purchase] = await Promise.all([
    resolveProduct("coffee-subscription"),
    resolveProduct("noise-cancelling-headphones"),
  ]);
  const bill = findBill("clinic-visit");

  if (!subscription || !purchase) {
    // The file is a constant in this repository, so this cannot happen in a
    // working build; failing loudly beats a blank front door.
    throw new Error("The entry needs the subscription and the purchase in the catalogue.");
  }

  // The third figure is the seller's, so it is read from the seller's words
  // whenever the terms left it unanswered (IPD 19) — the same rule as consent.
  //
  // That reading is a model call, and the model is slow: the sellers' texts are
  // read at start-up, so this is normally a cache hit. When it is not, the front
  // door gives the reading the same budget the bill does rather than holding a
  // visitor for most of a minute — a front door that takes 47 seconds is not a
  // front door (IPD 21).
  const exitOutcome = await withBudget(
    resolveExitTerm(subscription.terms.exit, subscription.description, subscription.descriptionLabel, {
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
  const terms = { ...subscription.terms, exit: exitOutcome.exit };

  const translation = computeCommitment(terms);
  // The seller's sentence and the figure it produced travel together, so the
  // entry can put them side by side without joining anything up itself (ITD 19).
  const figures = presentFigures(terms, translation, {
    sources: { exit: exitOutcome.quoted },
  });

  return (
    <div className="page">
      <header className="page-header">
        <h1>What it costs, before you agree to it</h1>
        <p className="lede">
          Three figures for any commitment — what it costs across the whole term, what it costs to
          leave, and what is charged today — each with the words it was worked out from. Built for
          adults who find billing language hard, including people with dyscalculia, ADHD and
          dyslexia.
        </p>
      </header>

      <section className="entry-worked" aria-labelledby="worked-heading">
        <h2 id="worked-heading" className="eyebrow">
          {subscription.name} — one commitment, worked through
        </h2>

        <div className="entry-pair">
          <section className="entry-said" aria-labelledby="said-heading">
            <h2 id="said-heading">What the seller wrote</h2>
            {subscription.description ? (
              // The shop's own copy, unedited and attributed. Never restyled into
              // our voice, because it is evidence, not a summary (IPD 21).
              <blockquote className="entry-words">{subscription.description}</blockquote>
            ) : (
              <p className="entry-words entry-words-absent">
                This product is listed at PayPal with no description, so this screen has no words
                of the seller&apos;s to quote. The figures beside it come from the price and term
                PayPal holds.
              </p>
            )}
          </section>

          <CommitmentView
            figures={figures}
            breakdown={translation.breakdown}
            labels={{ item: "Coffee, one bag", shipping: "Shipping", tax: "Sales tax" }}
            // No summary here: the seller's sentence is already in the column
            // beside this one, and repeating it word for word made the plain
            // version look identical to the version it exists to explain.
            summary=""
            schedule={describeSchedule(terms)}
            figureNotes={exitOutcome.note ? { exit: exitOutcome.note } : undefined}
            sourceNote={`${describeSources({
              paypal: subscription.sources.paypal,
              published: subscription.sources.published,
              // Only a seller's silence is theirs to report; a read that failed is
              // ours, and the line says which (IPD 19).
              absent: exitOutcome.kind === "unreadable" ? null : absentFigureNote(figures),
              unreadable: exitOutcome.kind === "unreadable" ? "what it costs to leave" : null,
            })} Nothing has been charged and nothing has been created at PayPal.`}
          />
        </div>

        <p className="entry-relationship" data-entry-relationship={exitOutcome.kind}>
          {relationshipSentence(exitOutcome)}
        </p>

        <Link
          className="button-primary entry-action"
          href={`/product/${subscription.slug}`}
        >
          Check this commitment
        </Link>
      </section>

      <p className="entry-contrast">
        Not every seller says. Where the words say nothing about leaving, the cost to leave reads{" "}
        <strong>Not stated</strong> — never $0.00 — and the line beneath the figures names whose
        silence it is.
      </p>

      <section aria-labelledby="other-heading">
        <h2 id="other-heading" className="eyebrow">
          The other ways money is asked of you
        </h2>

        <ul className="second-rank">
          <li className="door" data-door="purchase">
            <span className="door-label">A purchase you pay once</span>
            <Link className="door-link" href={`/product/${purchase.slug}`}>
              {purchase.name} — {formatMoney(computeCommitment(purchase.terms).today)} today
            </Link>
          </li>

          {bill ? (
            <BillDoor
              slug={bill.slug}
              name={bill.name}
              biller={bill.biller}
              amount={formatMoney(computeCommitment(bill.terms).today)}
            />
          ) : null}

          <li className="door" data-door="document">
            <span className="door-label">A document someone sent you</span>
            <Link className="door-link" href="/read">
              Paste it and read the same three figures
            </Link>
          </li>
        </ul>
      </section>

      <p className="scope-note">
        <Link href="/shop">Or search real products</Link> — live listings and prices from thousands
        of shops, so the figures are about something you could actually buy.
      </p>
    </div>
  );
}
