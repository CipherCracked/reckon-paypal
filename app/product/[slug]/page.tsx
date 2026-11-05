import { notFound } from "next/navigation";
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
    <main className="page">
      <ProductScreen
        slug={product.slug}
        name={product.name}
        description={product.description}
        shape={product.terms.shape}
      />
    </main>
  );
}
