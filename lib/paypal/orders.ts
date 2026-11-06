import { fromDecimalString, formatMoney, type Currency, type Money } from "@/lib/money";
import { paypalRequest, toPayPalAmount } from "./client";

export type CreateOrderInput = {
  referenceId: string;
  description: string;
  amount: Money;
  /** Where PayPal sends the shopper back after approving. */
  returnUrl: string;
  cancelUrl: string;
};

export type PayPalOrder = { id: string; amount: Money; approveUrl: string | null };

export type PayPalCapture = { id: string; status: string; amount: Money };

type PayPalAmountJson = { currency_code?: string; value?: string };

function parsePayPalAmount(amount: PayPalAmountJson | undefined): Money | null {
  if (!amount?.value || !amount.currency_code) return null;
  if (amount.currency_code !== "USD") {
    throw new Error(`Unsupported PayPal currency: ${amount.currency_code}`);
  }
  return fromDecimalString(amount.value, amount.currency_code as Currency);
}

export async function createPayPalOrder(input: CreateOrderInput): Promise<PayPalOrder> {
  const order = await paypalRequest<{
    id: string;
    purchase_units?: Array<{ amount?: PayPalAmountJson }>;
    links?: Array<{ href?: string; rel?: string }>;
  }>("/v2/checkout/orders", {
    method: "POST",
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: input.referenceId,
          description: input.description,
          amount: toPayPalAmount(input.amount),
        },
      ],
      application_context: {
        // The amount already covers shipping, so PayPal must not ask for an
        // address; and without a return URL the shopper has no way back.
        shipping_preference: "NO_SHIPPING",
        user_action: "PAY_NOW",
        return_url: input.returnUrl,
        cancel_url: input.cancelUrl,
      },
    }),
  });

  const returned = parsePayPalAmount(order.purchase_units?.[0]?.amount) ?? input.amount;

  // The screen must show a figure PayPal will actually charge. If the processor
  // comes back with a different one, there is no honest total to display.
  if (returned.minor !== input.amount.minor) {
    throw new Error(
      `PayPal returned ${formatMoney(returned)}, but ${formatMoney(input.amount)} was requested.`,
    );
  }

  // An order is never captured until the payer approves it at PayPal, and the
  // only way to get them there is the link PayPal hands back.
  const approveUrl =
    order.links?.find((link) => link.rel === "approve")?.href ??
    order.links?.find((link) => link.rel === "payer-action")?.href ??
    null;

  return { id: order.id, amount: returned, approveUrl };
}

export async function capturePayPalOrder(id: string): Promise<PayPalCapture> {
  const order = await paypalRequest<{
    id: string;
    status: string;
    purchase_units?: Array<{
      amount?: PayPalAmountJson;
      payments?: { captures?: Array<{ amount?: PayPalAmountJson }> };
    }>;
  }>(`/v2/checkout/orders/${encodeURIComponent(id)}/capture`, {
    method: "POST",
    body: "{}",
  });

  const unit = order.purchase_units?.[0];
  const captured = unit?.payments?.captures?.[0]?.amount;
  const amount = parsePayPalAmount(captured) ?? parsePayPalAmount(unit?.amount);

  if (!amount) {
    throw new Error("PayPal did not return a captured amount.");
  }

  return { id: order.id ?? id, status: order.status, amount };
}
