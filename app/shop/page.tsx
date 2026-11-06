import Link from "next/link";
import { products } from "@/lib/catalog/products";

export default function Shop() {
  return (
    <main className="page">
      <header className="page-header">
        <p className="eyebrow">The shop</p>
        <h1>Choose something to buy</h1>
        <p className="lede">
          Before you agree to any purchase, you will see three things: what is charged today, what
          the commitment costs in total, and what it costs to leave.
        </p>
      </header>

      <ul className="product-list">
        {products.map((product) => (
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
    </main>
  );
}
