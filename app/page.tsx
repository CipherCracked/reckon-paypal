import Link from "next/link";
import { BillDoor } from "@/components/BillDoor";
import { CommitmentView } from "@/components/CommitmentView";
import { findBill } from "@/lib/catalog/bills";
import { findProduct } from "@/lib/catalog/products";
import { computeCommitment } from "@/lib/commitment/compute";
import { presentFigures } from "@/lib/commitment/present";
import { describeSchedule } from "@/lib/commitment/schedule";
import { absentFigureNote, describeSources } from "@/lib/commitment/sources";
import { formatMoney } from "@/lib/money";

/**
 * The entry states the product, then proves it on one real commitment before
 * asking anything (IPD 14).
 *
 * Everything below is computed on the server from the catalogue: no model key
 * is needed for the figures to appear, and no PayPal object is created by a
 * visit (ITD 16). The figures come from terms, not from a payment, and the
 * screen says so rather than borrowing the consent screen's stronger claim.
 */
export default function Home() {
  const subscription = findProduct("coffee-subscription");
  const purchase = findProduct("noise-cancelling-headphones");
  const bill = findBill("clinic-visit");

  if (!subscription || !purchase) {
    // The catalogue is a constant in this repository, so this cannot happen in
    // a working build; failing loudly beats a blank front door.
    throw new Error("The entry needs the subscription and the purchase in the catalogue.");
  }

  const translation = computeCommitment(subscription.terms);
  const figures = presentFigures(subscription.terms, translation);

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
          schedule={describeSchedule(subscription.terms)}
          sourceNote={`${describeSources({
            published: "the terms shown here",
            absent: absentFigureNote(figures),
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
