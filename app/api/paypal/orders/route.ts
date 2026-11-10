import { computeCommitment } from "@/lib/commitment/compute";
import { resolveProduct } from "@/lib/catalog/resolve";
import { createPayPalOrder } from "@/lib/paypal/orders";
import { PayPalError } from "@/lib/paypal/client";

type OrderRequestBody = { slug?: unknown };

async function readBody(request: Request): Promise<OrderRequestBody | null> {
  try {
    const body = (await request.json()) as unknown;
    return typeof body === "object" && body !== null ? (body as OrderRequestBody) : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const body = await readBody(request);
  const slug = typeof body?.slug === "string" ? body.slug : null;
  // The same resolution the consent screen used to show the figures: PayPal
  // first, the file second. Creating the order from the file alone while the
  // screen read PayPal's plan is how a shopper is shown one number and charged
  // another — the one failure this product exists to prevent.
  const product = slug ? await resolveProduct(slug) : null;

  if (!product) {
    return Response.json({ error: "Unknown product." }, { status: 404 });
  }

  // A commitment paid over time is a subscription, not an order: capturing it
  // as a one-time payment would charge one period and call it the whole term.
  // A financed purchase is the case that used to slip through here — the screen
  // said twelve payments and PayPal was asked for the first one only.
  if (product.terms.shape !== "one_time") {
    return Response.json(
      {
        error:
          product.terms.shape === "financed"
            ? "This product is paid in instalments and needs a payment plan."
            : "This product is paid over a repeating term and needs a subscription.",
      },
      { status: 400 },
    );
  }

  const translation = computeCommitment(product.terms);

  // PayPal sends the shopper back here after they approve. Both URLs are built
  // from our own origin rather than the request body, so a caller cannot point
  // the redirect somewhere else.
  const origin = new URL(request.url).origin;
  const back = `${origin}/consent/pending?slug=${encodeURIComponent(product.slug)}`;

  try {
    const order = await createPayPalOrder({
      referenceId: product.slug,
      description: product.name,
      amount: translation.today,
      returnUrl: `${back}&approved=1`,
      cancelUrl: `${back}&cancelled=1`,
    });

    return Response.json({
      orderId: order.id,
      // Without this the shopper can never approve, and an unapproved order can
      // never be captured.
      approveUrl: order.approveUrl,
      translation,
      productName: product.name,
      productText: product.description,
    });
  } catch (error) {
    // No translation is returned on failure: a figure the processor never
    // agreed to is worse than no figure at all.
    const message =
      error instanceof PayPalError
        ? `PayPal could not create this order (${error.issue ?? error.status}).`
        : "PayPal could not create this order.";

    return Response.json({ error: message }, { status: 502 });
  }
}
