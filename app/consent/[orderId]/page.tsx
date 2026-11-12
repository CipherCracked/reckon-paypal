import { redirect } from "next/navigation";
import { ConsentScreen } from "@/components/ConsentScreen";
import { Page } from "@/components/Page";
import { findProduct } from "@/lib/catalog/products";
import { isMarketSlug } from "@/lib/market/channel3";
import { paypalEnvironment } from "@/lib/paypal/client";

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
    <Page
      back={{
        href: product ? `/product/${product.slug}` : listed ? `/product/${listed}` : "/",
        label: product ? `Back to ${product.name}` : listed ? "Back to this product" : "Back to the start",
      }}
      eyebrow="Before you agree"
      // The thing being bought is the one word this screen used to leave out:
      // the page immediately before the money named the act, not the product.
      title={product ? `Check what ${product.name} asks of you` : "Check what you are taking on"}
    >
      <ConsentScreen
        orderId={token ?? orderId}
        slug={slug ?? ""}
        // The client id is public by design and is the only PayPal value the
        // browser is ever given; the secret is read in `lib/paypal/client.ts`
        // and has no path to this prop boundary (ITD 39).
        clientId={process.env.PAYPAL_CLIENT_ID ?? ""}
        environment={paypalEnvironment()}
        // PayPal sends the shopper back with ?approved=1&token=<order id>
        // once they have approved the payment.
        returning={approved === "1"}
        cancelled={cancelled === "1"}
      />
    </Page>
  );
}
