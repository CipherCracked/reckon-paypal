import { resolveProduct } from "@/lib/catalog/resolve";
import { addMoney, zeroMoney } from "@/lib/money";
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

  // PayPal first, the file second — the same resolution the consent screen
  // used to show the figures. Building the plan from the file while the screen
  // read PayPal is how a shopper agrees to one number and is charged another.
  const product = slug ? await resolveProduct(slug) : null;

  if (!product) {
    return Response.json({ error: "Unknown product." }, { status: 404 });
  }

  if (product.terms.shape !== "recurring" || !product.terms.recurrence) {
    return Response.json(
      { error: "This product is not paid over a repeating term." },
      { status: 400 },
    );
  }

  // PayPal sends the shopper back here after they approve, appending the
  // subscription id to whatever return URL the subscription was created with.
  // Without it there is no way back into this product at all.
  const origin = new URL(request.url).origin;
  const back = `${origin}/consent/pending?slug=${encodeURIComponent(product.slug)}`;

  try {
    const planId = await ensurePlan({
      productId: `DEMO-${product.slug.toUpperCase()}`,
      planId: `P-DEMO-${product.slug.toUpperCase()}`,
      // The seller's copy, so the product PayPal stores can be quoted from.
      description: product.description,
      // One period's charge: the item plus its tax, the same figure the
      // commitment view multiplies by the term. A tax the source never stated
      // is not part of a plan PayPal will charge for, so it adds nothing here.
      amount: addMoney(product.terms.itemPrice, product.terms.tax ?? zeroMoney()),
      interval: product.terms.recurrence.period === "month" ? "MONTH" : "YEAR",
      // The same count the screen prints. A plan that never ends would outlive
      // the term the shopper agreed to.
      totalCycles: product.terms.recurrence.count,
    });

    const subscription = await createSubscription(planId, {
      returnUrl: `${back}&approved=1`,
      cancelUrl: `${back}&cancelled=1`,
    });

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
