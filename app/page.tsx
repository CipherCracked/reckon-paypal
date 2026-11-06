import Link from "next/link";
import { BillDoor } from "@/components/BillDoor";
import { findBill } from "@/lib/catalog/bills";
import { findProduct } from "@/lib/catalog/products";
import { computeCommitment } from "@/lib/commitment/compute";
import { formatMoney } from "@/lib/money";

function amountFor(slug: string, which: "today" | "acrossTerm"): string {
  const product = findProduct(slug);
  if (!product) return "";
  return formatMoney(computeCommitment(product.terms)[which]);
}

export default function Home() {
  const headphones = findProduct("noise-cancelling-headphones");
  const coffee = findProduct("coffee-subscription");
  const bill = findBill("clinic-visit");

  return (
    <main className="page">
      <header className="page-header">
        <p className="eyebrow">Before you agree</p>
        <h1>Every payment asks you to work something out</h1>
        <p className="lede">
          This shows the answer before you agree to it: what it costs across the whole commitment,
          what it costs to leave, and what is charged today. Same three figures, whichever way the
          money is asked of you.
        </p>
      </header>

      <ul className="product-list" aria-label="Ways money can be asked of you">
        <li className="product-card" data-door="purchase">
          <p className="door-label">A purchase</p>
          <h2>{headphones?.name ?? "A purchase"}</h2>
          <p>Paid once — {amountFor("noise-cancelling-headphones", "today")} today.</p>
          <Link
            className="button-secondary"
            href="/product/noise-cancelling-headphones"
          >
            See the full commitment
          </Link>
        </li>

        <li className="product-card" data-door="subscription">
          <p className="door-label">A subscription</p>
          <h2>{coffee?.name ?? "A subscription"}</h2>
          <p>
            Every month for a year — {amountFor("coffee-subscription", "acrossTerm")} across the
            term.
          </p>
          <Link className="button-secondary" href="/product/coffee-subscription">
            See the full commitment
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
      </ul>

      <p className="door-more">
        <Link href="/shop">Or browse the shop</Link> — three products, each a different shape of
        commitment.
      </p>

      <p className="scope-note">
        The shop is one of these, not the product. Every screen you reach is built from what PayPal
        holds at that moment — nothing about you is stored.
      </p>
    </main>
  );
}
