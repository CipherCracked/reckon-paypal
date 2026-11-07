import Link from "next/link";
import { BackLink } from "@/components/BackLink";
import { resolveCatalogue, type ResolvedCard } from "@/lib/catalog/resolve";

/** The listing is read per request, so it reflects PayPal rather than a build. */
export const dynamic = "force-dynamic";

/**
 * A catalog product carries a name and a description and no price, which is
 * exactly what a listing shows — so the shop reads PayPal's catalogue one call
 * per product and falls back per card (IPD 20). It deliberately shows no
 * figures: this screen is for choosing, not for agreeing.
 */
function sourceNote(catalogue: ResolvedCard[]): string | null {
  const fromPayPal = catalogue.filter((card) => card.sources.paypal).length;
  if (fromPayPal === 0) return null;
  return fromPayPal === catalogue.length
    ? "Every product above is read from PayPal's catalogue."
    : "Some products above are read from PayPal's catalogue; the rest are the example products in this repository.";
}

export default async function Shop() {
  const catalogue = await resolveCatalogue();
  const note = sourceNote(catalogue);

  return (
    <div className="page">
      <BackLink href="/">Back to the ways in</BackLink>

      <header className="page-header">
        <p className="eyebrow">The shop</p>
        <h1>Choose something to buy</h1>
        <p className="lede">
          Before you agree to any purchase, you will see three things: what is charged today, what
          the commitment costs in total, and what it costs to leave.
        </p>
      </header>

      <ul className="product-list">
        {catalogue.map((product) => (
          <li key={product.slug} className="product-card">
            <h2>
              <Link href={`/product/${product.slug}`}>{product.name}</Link>
            </h2>
            <p>{product.description}</p>
            <Link className="button-secondary" href={`/product/${product.slug}`}>
              See the full commitment<span className="visually-hidden"> for {product.name}</span>
            </Link>
          </li>
        ))}
      </ul>

      {note ? <p className="scope-note">{note}</p> : null}
    </div>
  );
}
