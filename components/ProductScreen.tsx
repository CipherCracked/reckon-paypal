"use client";

import { useRouter } from "next/navigation";
import { CommitmentView } from "@/components/CommitmentView";
import type { RenderedFigure } from "@/lib/commitment/present";
import type { CommitmentBreakdown } from "@/lib/commitment/types";

export type ProductScreenProps = {
  slug: string;
  name: string;
  description: string;
  /** The three figures, computed by the page from the same terms consent uses. */
  figures: RenderedFigure[];
  breakdown: CommitmentBreakdown;
  schedule: string;
  /** Why the exit figure has no amount, when it has none. */
  exitNote: string | null;
  sourceNote: string;
  /** Where a part the listing did not state is charged, when the screen knows. */
  unstatedAt?: "checkout" | null;
};

export function ProductScreen({
  slug,
  name,
  description,
  figures,
  breakdown,
  schedule,
  exitNote,
  sourceNote,
  unstatedAt = null,
}: ProductScreenProps) {
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

      {/* The figures come before the button, the same rule as every other
          screen: a page that asks for money and shows no number is the page
          this product exists to replace. */}
      <CommitmentView
        figures={figures}
        breakdown={breakdown}
        labels={{ item: name, shipping: "Shipping", tax: "Sales tax" }}
        summary=""
        schedule={schedule}
        figureNotes={exitNote ? { exit: exitNote } : undefined}
        sourceNote={sourceNote}
        unstatedAt={unstatedAt}
      />

      <div className="consent-actions">
        <button type="button" className="button-primary" onClick={continueToPayment}>
          Check this commitment
        </button>
      </div>
    </section>
  );
}
