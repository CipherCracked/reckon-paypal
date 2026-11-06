import { findProduct } from "@/lib/catalog/products";
import { computeCommitment } from "@/lib/commitment/compute";
import { formatMoney } from "@/lib/money";
import { buildCalendar } from "@/lib/receipt/calendar";
import { isSettled, retrieveSubscription } from "@/lib/paypal/retrieve";

type RouteContext = {
  params: Promise<{ orderId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { orderId } = await context.params;
  const slug = new URL(request.url).searchParams.get("slug");
  const product = slug ? findProduct(slug) : undefined;

  if (!product || product.terms.shape !== "recurring") {
    return new Response("This purchase has no next charge to remind you about.", { status: 404 });
  }

  try {
    const subscription = await retrieveSubscription(orderId);

    if (!isSettled(subscription.status) || !subscription.nextBillingTime) {
      return new Response("PayPal has not set a date for the next charge yet.", { status: 404 });
    }

    const amount = subscription.amount ?? computeCommitment(product.terms).today;

    const calendar = buildCalendar({
      title: `${product.name} — payment due`,
      description: `${formatMoney(amount)} will be charged by PayPal for ${product.name}.`,
      start: new Date(subscription.nextBillingTime),
    });

    return new Response(calendar, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${product.slug}-next-payment.ics"`,
      },
    });
  } catch {
    return new Response("PayPal could not confirm the next payment date.", { status: 502 });
  }
}
