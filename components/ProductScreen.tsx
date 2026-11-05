"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type ProductScreenProps = {
  slug: string;
  name: string;
  description: string;
};

type OrderState = { status: "idle" | "creating" } | { status: "failed"; message: string };

export function ProductScreen({ slug, name, description }: ProductScreenProps) {
  const router = useRouter();
  const [state, setState] = useState<OrderState>({ status: "idle" });

  async function continueToPayment() {
    setState({ status: "creating" });

    try {
      const response = await fetch("/api/paypal/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });

      if (!response.ok) {
        setState({
          status: "failed",
          message: "We could not set up this purchase. Nothing has been charged.",
        });
        return;
      }

      const body = (await response.json()) as { orderId: string };
      router.push(`/consent/${encodeURIComponent(body.orderId)}?slug=${encodeURIComponent(slug)}`);
    } catch {
      setState({
        status: "failed",
        message: "We could not reach the payment service. Nothing has been charged.",
      });
    }
  }

  return (
    <section className="product-screen">
      <header className="page-header">
        <p className="eyebrow">Product</p>
        <h1>{name}</h1>
      </header>

      <p className="product-copy">{description}</p>

      <div className="consent-actions">
        <button
          type="button"
          className="button-primary"
          onClick={() => void continueToPayment()}
          disabled={state.status === "creating"}
        >
          {state.status === "creating" ? "Setting up…" : "Continue to payment"}
        </button>
      </div>

      {state.status === "failed" ? (
        <p className="notice" role="alert">
          {state.message}
        </p>
      ) : null}
    </section>
  );
}
