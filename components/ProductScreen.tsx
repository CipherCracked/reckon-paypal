"use client";

import { useRouter } from "next/navigation";

export type ProductScreenProps = {
  slug: string;
  name: string;
  description: string;
};

export function ProductScreen({ slug, name, description }: ProductScreenProps) {
  const router = useRouter();

  function continueToPayment() {
    // Nothing is created yet, for any shape: the PayPal object is created when
    // the shopper asks to pay, so an abandoned visit leaves no half-made order.
    router.push(`/consent/pending?slug=${encodeURIComponent(slug)}`);
  }

  return (
    <section className="product-screen">
      <header className="page-header">
        <p className="eyebrow">Product</p>
        <h1>{name}</h1>
      </header>

      <p className="product-copy">{description}</p>

      <div className="consent-actions">
        <button type="button" className="button-primary" onClick={continueToPayment}>
          Continue to payment
        </button>
      </div>
    </section>
  );
}
