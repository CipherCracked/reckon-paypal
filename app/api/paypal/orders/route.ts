import { computeCommitment } from "@/lib/commitment/compute";
import { findProduct } from "@/lib/catalog/products";
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
  const product = slug ? findProduct(slug) : undefined;

  if (!product) {
    return Response.json({ error: "Unknown product." }, { status: 404 });
  }

  // A repeating commitment is a subscription, not an order: capturing it as a
  // one-time payment would charge one period and call it the whole term.
  if (product.terms.shape === "recurring") {
    return Response.json(
      { error: "This product is paid over a repeating term and needs a subscription." },
      { status: 400 },
    );
  }

  const translation = computeCommitment(product.terms);

  try {
    const order = await createPayPalOrder({
      referenceId: product.slug,
      description: product.name,
      amount: translation.today,
    });

    return Response.json({
      orderId: order.id,
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
