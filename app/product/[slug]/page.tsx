import { notFound } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { ProductScreen } from "@/components/ProductScreen";
import { resolveProductCard } from "@/lib/catalog/resolve";

type PageProps = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

/**
 * The seller's own copy, read from PayPal's catalogue when it answers and from
 * the file when it does not (IPD 20). No line about its source: there are no
 * figures here, and the copy is the input being translated rather than a claim
 * about a number (IPD 18).
 */
export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
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
