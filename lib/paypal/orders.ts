import { fromDecimalString, formatMoney, type Currency, type Money } from "@/lib/money";
import { paypalRequest, toPayPalAmount } from "./client";

export type CreateOrderInput = {
  referenceId: string;
  description: string;
  amount: Money;
};

export type PayPalOrder = { id: string; amount: Money };

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

  return { id: order.id, amount: returned };
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
