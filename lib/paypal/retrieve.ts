import { fromDecimalString, type Currency, type Money } from "@/lib/money";
import { paypalRequest } from "./client";

type PayPalAmountJson = { currency_code?: string; value?: string };

export function parsePayPalAmount(amount: PayPalAmountJson | undefined): Money | null {
  if (!amount?.value || !amount.currency_code) return null;
  if (amount.currency_code !== "USD") {
    throw new Error(`Unsupported PayPal currency: ${amount.currency_code}`);
  }
  return fromDecimalString(amount.value, amount.currency_code as Currency);
}

export type OrderRecord = {
  id: string;
  status: string;
  amount: Money | null;
};

export type SubscriptionRecord = {
  id: string;
  status: string;
  /** ISO timestamp of the next charge, when PayPal states one. */
  nextBillingTime: string | null;
  amount: Money | null;
};

/**
 * Reads the order back from PayPal. The receipt is built from this rather than
 * from anything we kept, because we keep nothing (ITD 6).
 */
export async function retrieveOrder(id: string): Promise<OrderRecord> {
  const order = await paypalRequest<{
    id: string;
    status: string;
    purchase_units?: Array<{
      amount?: PayPalAmountJson;
      payments?: { captures?: Array<{ amount?: PayPalAmountJson }> };
    }>;
  }>(`/v2/checkout/orders/${encodeURIComponent(id)}`, { method: "GET" });

  const unit = order.purchase_units?.[0];

  return {
    id: order.id,
    status: order.status,
    amount:
      parsePayPalAmount(unit?.payments?.captures?.[0]?.amount) ??
      parsePayPalAmount(unit?.amount),
  };
}

export async function retrieveSubscription(id: string): Promise<SubscriptionRecord> {
  const subscription = await paypalRequest<{
    id: string;
    status: string;
    plan_id?: string;
    billing_info?: { next_billing_time?: string };
  }>(`/v1/billing/subscriptions/${encodeURIComponent(id)}`, { method: "GET" });

  // The agreed price lives on the plan, not on the subscription.
  const amount = subscription.plan_id
    ? await retrievePlanPrice(subscription.plan_id)
    : null;

  return {
    id: subscription.id,
    status: subscription.status,
    nextBillingTime: subscription.billing_info?.next_billing_time ?? null,
    amount,
  };
}

async function retrievePlanPrice(planId: string): Promise<Money | null> {
  try {
    const plan = await paypalRequest<{
      billing_cycles?: Array<{ pricing_scheme?: { fixed_price?: PayPalAmountJson } }>;
    }>(`/v1/billing/plans/${encodeURIComponent(planId)}`, { method: "GET" });

    return parsePayPalAmount(plan.billing_cycles?.[0]?.pricing_scheme?.fixed_price);
  } catch {
    // A receipt without an amount is worse than one with it, but a wrong
    // amount is worse than both — so a missing price stays missing.
    return null;
  }
}

export function isSettled(status: string): boolean {
  return status === "COMPLETED" || status === "ACTIVE" || status === "APPROVED";
}

export type InvoiceRecord = {
  id: string;
  status: string;
  amount: Money | null;
  /** ISO date the bill falls due, when the biller stated one. */
  dueDate: string | null;
  /** The PayPal-hosted page a payer opens to settle it. */
  payerUrl: string | null;
};

/**
 * Reads a bill back from PayPal. Like the receipt, the screen is built from
 * what PayPal holds rather than from anything we kept — a bill is the biller's
 * to change, and an unauthorised copy of it would be a lie after the first edit.
 */
export async function retrieveInvoice(id: string): Promise<InvoiceRecord> {
  const invoice = await paypalRequest<{
    id: string;
    status: string;
    amount?: PayPalAmountJson;
    detail?: { payment_term?: { due_date?: string } };
    links?: Array<{ href?: string; rel?: string }>;
  }>(`/v2/invoicing/invoices/${encodeURIComponent(id)}`, { method: "GET" });

  return {
    id: invoice.id,
    status: invoice.status,
    amount: parsePayPalAmount(invoice.amount),
    dueDate: invoice.detail?.payment_term?.due_date ?? null,
    payerUrl:
      invoice.links?.find((link) => link.rel === "payer-view")?.href ??
      invoice.links?.find((link) => link.rel === "self")?.href ??
      null,
  };
}
