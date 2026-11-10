import { redirect } from "next/navigation";
import { BackLink } from "@/components/BackLink";
import { ConsentScreen } from "@/components/ConsentScreen";
import { findProduct } from "@/lib/catalog/products";
import { isMarketSlug } from "@/lib/market/channel3";

type PageProps = {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{
    slug?: string;
    approved?: string;
    cancelled?: string;
    token?: string;
    /** Appended by PayPal when a subscription is approved. */
    subscription_id?: string;
  }>;
};

export default async function ConsentPage({ params, searchParams }: PageProps) {
  const { orderId } = await params;
  const { slug, approved, cancelled, token, subscription_id } = await searchParams;

  // A subscription is approved at PayPal and needs no capture: the money moves
  // on PayPal's own schedule, and the receipt is the record. Sending it through
  // the order-capture path would call capture on a subscription id and report
  // a failure for a payment that succeeded.
  if (subscription_id) {
    redirect(
      `/receipt/${encodeURIComponent(subscription_id)}?slug=${encodeURIComponent(slug ?? "")}`,
    );
  }

  const product = slug ? findProduct(slug) : undefined;
  const listed = slug && isMarketSlug(slug) ? slug : null;

  return (
    <div className="page">
      <BackLink
        href={product ? `/product/${product.slug}` : listed ? `/product/${listed}` : "/"}
      >
        {product ? `Back to ${product.name}` : listed ? "Back to this product" : "Back to the ways in"}
      </BackLink>

      <header className="page-header">
        <p className="eyebrow">Before you agree</p>
        <h1>Check what you are taking on</h1>
      </header>

      <ConsentScreen
        orderId={token ?? orderId}
        slug={slug ?? ""}
        // PayPal sends the shopper back with ?approved=1&token=<order id>
        // once they have approved the payment.
        returning={approved === "1"}
        cancelled={cancelled === "1"}
      />
    </div>
  );
}
