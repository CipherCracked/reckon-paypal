import { notFound } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { ProductScreen } from "@/components/ProductScreen";
import { findProduct } from "@/lib/catalog/products";

type PageProps = { params: Promise<{ slug: string }> };

export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const product = findProduct(slug);

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
