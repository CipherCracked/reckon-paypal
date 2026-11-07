import Link from "next/link";
import { BillDoor } from "@/components/BillDoor";
import { CommitmentView } from "@/components/CommitmentView";
import { findBill } from "@/lib/catalog/bills";
import { resolveProduct } from "@/lib/catalog/resolve";
import { computeCommitment } from "@/lib/commitment/compute";
import { presentFigures } from "@/lib/commitment/present";
import { resolveExitTerm } from "@/lib/commitment/published-exit";
import { describeSchedule } from "@/lib/commitment/schedule";
import { absentFigureNote, describeSources } from "@/lib/commitment/sources";
import { formatMoney } from "@/lib/money";

/** The catalogue is read per request, so the front door reflects PayPal rather than a build. */
export const dynamic = "force-dynamic";

/**
 * The entry states the product, then proves it on one real commitment before
 * asking anything (IPD 14).
 *
 * The worked commitment is read the same way every other screen reads one —
 * PayPal first, the catalogue file second (IPD 20) — so the front door cannot
 * be the one surface that quietly disagrees with the consent screen. No PayPal
 * object is created by a visit (ITD 16); a read creates nothing, and the
 * screen says so.
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
  const exitOutcome = await resolveExitTerm(
    subscription.terms.exit,
    subscription.description,
    subscription.descriptionLabel,
  );
  const terms = { ...subscription.terms, exit: exitOutcome.exit };

  const translation = computeCommitment(terms);
  const figures = presentFigures(terms, translation);

  return (
    <div className="page">
      <header className="page-header">
        <h1>Every payment asks you to work something out</h1>
        <p className="lede">
          This works it out before you agree: what it costs across the whole commitment, what it
          costs to leave, and what is charged today. Same three figures, whichever way the money is
          asked of you.
        </p>
      </header>

      <section className="entry-worked" aria-labelledby="worked-heading">
        <h2 id="worked-heading">
          {subscription.name}
          <span className="visually-hidden"> — worked through</span>
        </h2>

        <CommitmentView
          figures={figures}
          breakdown={translation.breakdown}
          labels={{ item: "Coffee, one bag", shipping: "Shipping", tax: "Sales tax" }}
          summary={subscription.description}
          schedule={describeSchedule(terms)}
          figureNotes={exitOutcome.note ? { exit: exitOutcome.note } : undefined}
          sourceNote={`${describeSources({
            paypal: subscription.sources.paypal,
            published: subscription.sources.published,
            quoted: exitOutcome.quoted,
            // Only a seller's silence is theirs to report; a read that failed is
            // ours, and the line says which (IPD 19).
            absent: exitOutcome.kind === "unreadable" ? null : absentFigureNote(figures),
            unreadable: exitOutcome.kind === "unreadable" ? "what it costs to leave" : null,
          })} Nothing has been charged and nothing has been created at PayPal.`}
        />

        <Link
          className="button-primary entry-action"
          href={`/product/${subscription.slug}`}
        >
          Continue with this commitment
        </Link>
      </section>

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
        <Link href="/shop">Or browse the shop</Link> — three products, each a different shape of
        commitment.
      </p>
    </div>
  );
}
