import { notFound } from "next/navigation";
import Link from "next/link";
import { BackLink } from "@/components/BackLink";
import { MarketProduct } from "@/components/MarketProduct";
import { ProductScreen } from "@/components/ProductScreen";
import { resolveProductCard } from "@/lib/catalog/resolve";
import { isMarketSlug, readMarketProduct } from "@/lib/market/channel3";

type PageProps = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

/**
 * Two kinds of product, resolved by two different rules.
 *
 * A `ch3-` slug names a real retail listing and is read from the live
 * catalogue; any other slug is one of the demo entries, read from PayPal's
 * catalogue when it answers and from the file when it does not (IPD 20). The
 * prefix keeps the two from ever answering for each other.
 */
export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;

  if (isMarketSlug(slug)) {
    let product;
    try {
      product = await readMarketProduct(slug);
    } catch {
      return (
        <div className="page">
          <BackLink href="/shop">Back to the search</BackLink>
          <header className="page-header">
            <p className="eyebrow">A real listing</p>
            <h1>This product could not be read</h1>
          </header>
          <p className="notice" role="status">
            The live catalogue did not answer just now, so there is no price to show. Nothing is
            invented to fill the gap.
          </p>
          <Link className="button-secondary" href={`/product/${encodeURIComponent(slug)}`}>
            Try again
          </Link>
        </div>
      );
    }

    if (!product) notFound();

    return (
      <div className="page">
        <BackLink href="/shop">Back to the search</BackLink>
        <MarketProduct product={product} slug={slug} />
      </div>
    );
  }

  const product = await resolveProductCard(slug);

  if (!product) {
    notFound();
  }

  return (
    <div className="page">
      <BackLink href="/">Back to the ways in</BackLink>

      <ProductScreen
        slug={product.slug}
        name={product.name}
        description={product.description}
      />
    </div>
  );
}
