import { findProduct } from "@/lib/catalog/products";
import { addMoney } from "@/lib/money";
import { PayPalError } from "@/lib/paypal/client";
import { createSubscription, ensurePlan } from "@/lib/paypal/subscriptions";

export async function POST(request: Request) {
  let slug: string | null = null;
  try {
    const body = (await request.json()) as { slug?: unknown };
    slug = typeof body.slug === "string" ? body.slug : null;
  } catch {
    slug = null;
  }

  const product = slug ? findProduct(slug) : undefined;

  if (!product) {
    return Response.json({ error: "Unknown product." }, { status: 404 });
  }

  if (product.terms.shape !== "recurring" || !product.terms.recurrence) {
    return Response.json(
      { error: "This product is not paid over a repeating term." },
      { status: 400 },
    );
  }

  try {
    const planId = await ensurePlan({
      productId: `DEMO-${product.slug.toUpperCase()}`,
      planId: `P-DEMO-${product.slug.toUpperCase()}`,
      // One period's charge: the item plus its tax, the same figure the
      // commitment view multiplies by the term.
      amount: addMoney(product.terms.itemPrice, product.terms.tax),
      interval: product.terms.recurrence.period === "month" ? "MONTH" : "YEAR",
      // The same count the screen prints. A plan that never ends would outlive
      // the term the shopper agreed to.
      totalCycles: product.terms.recurrence.count,
    });

    const subscription = await createSubscription(planId);
    return Response.json({
      subscriptionId: subscription.id,
      status: subscription.status,
      // The shopper approves the commitment in PayPal itself; without this
      // link the consent screen has nowhere to send them.
      approveUrl: subscription.approveUrl,
    });
  } catch (error) {
    const message =
      error instanceof PayPalError
        ? `PayPal could not start this subscription (${error.issue ?? error.status}).`
        : "PayPal could not start this subscription.";

    return Response.json({ error: message }, { status: 502 });
  }
}
