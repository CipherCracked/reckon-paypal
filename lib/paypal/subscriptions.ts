import { PayPalError, paypalRequest, toPayPalAmount } from "./client";
import type { Money } from "@/lib/money";

export type EnsurePlanInput = {
  productId: string;
  planId: string;
  amount: Money;
  interval: "MONTH" | "YEAR";
};

function isDuplicate(error: unknown): boolean {
  return (
    error instanceof PayPalError &&
    (error.status === 409 || (error.issue ?? "").toUpperCase().includes("DUPLICATE"))
  );
}

/**
 * Creates the catalog product and billing plan this demo reuses on every run.
 * PayPal mints its own ids, so a repeated run answers DUPLICATE_RESOURCE for
 * the same product and plan names; that reply means the objects exist, which
 * is exactly what this function needs, so it is treated as success.
 */
export async function ensurePlan(input: EnsurePlanInput): Promise<string> {
  const product = await paypalRequest<{ id: string }>("/v1/catalogs/products", {
    method: "POST",
    body: JSON.stringify({
      id: input.productId,
      name: `Commitment demo product ${input.productId}`,
      type: "SERVICE",
      category: "SOFTWARE",
    }),
  }).catch((error: unknown) => {
    if (isDuplicate(error)) return { id: input.productId };
    throw error;
  });

  const plan = await paypalRequest<{ id: string }>("/v1/billing/plans", {
    method: "POST",
    body: JSON.stringify({
      id: input.planId,
      product_id: product.id,
      name: `Commitment demo plan ${input.planId}`,
      status: "ACTIVE",
      billing_cycles: [
        {
          frequency: { interval_unit: input.interval, interval_count: 1 },
          tenure_type: "REGULAR",
          sequence: 1,
          total_cycles: 0,
          pricing_scheme: { fixed_price: toPayPalAmount(input.amount) },
        },
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        payment_failure_threshold: 1,
      },
    }),
  }).catch((error: unknown) => {
    if (isDuplicate(error)) return { id: input.planId };
    throw error;
  });

  return plan.id;
}

export async function createSubscription(
  planId: string,
): Promise<{ id: string; status: string }> {
  return paypalRequest<{ id: string; status: string }>("/v1/billing/subscriptions", {
    method: "POST",
    body: JSON.stringify({ plan_id: planId }),
  });
}
