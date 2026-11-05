import { capturePayPalOrder } from "@/lib/paypal/orders";
import { PayPalError } from "@/lib/paypal/client";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!id) {
    return Response.json({ error: "A PayPal order id is required." }, { status: 400 });
  }

  try {
    const capture = await capturePayPalOrder(id);

    return Response.json({ status: "COMPLETED", amount: capture.amount }, { status: 200 });
  } catch (error) {
    // A retried capture is a success, not an error: PayPal's already-captured
    // reply carries no amount, and inventing one is the failure this product
    // exists to prevent.
    if (error instanceof PayPalError && error.issue === "ORDER_ALREADY_CAPTURED") {
      return Response.json({ status: "ALREADY_CAPTURED", amount: null }, { status: 200 });
    }

    const message =
      error instanceof PayPalError
        ? `PayPal could not capture this payment (${error.issue ?? error.status}).`
        : "PayPal could not capture this payment.";

    return Response.json({ error: message }, { status: 502 });
  }
}
