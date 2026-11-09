import { PayPalError, paypalRequest, toPayPalAmount } from "./client";
import type { Money } from "@/lib/money";

export type EnsurePlanInput = {
  productId: string;
  planId: string;
  amount: Money;
  interval: "MONTH" | "YEAR";
  /** How many charges the term has. The plan must end when the screen says it does. */
  totalCycles: number;
};

export type Subscription = { id: string; status: string; approveUrl: string | null };

/**
 * The plan's name carries its cycle count. A PayPal plan is immutable once
 * created, and a repeat run resolves to the plan it made last time by name —
 * so a name that did not state the term would keep handing back an open-ended
 * plan after the screen had learned to promise an end.
 */
function planName(planId: string, totalCycles: number): string {
  return `Commitment demo plan ${planId} ${totalCycles}x`;
}

function isDuplicate(error: unknown): boolean {
  return (
    error instanceof PayPalError &&
    (error.status === 409 || (error.issue ?? "").toUpperCase().includes("DUPLICATE"))
  );
}

/**
 * Finds the plan this demo created on an earlier run. PayPal refuses a second
 * plan with the same name, and its plan-create call takes no client id, so the
 * only way back to the existing plan is to list the product's plans and match
 * by name.
 */
async function findExistingPlan(
  productId: string,
  planId: string,
  totalCycles: number,
): Promise<string> {
  const list = await paypalRequest<{ plans?: Array<{ id: string; name?: string }> }>(
    `/v1/billing/plans?product_id=${encodeURIComponent(productId)}&page_size=20&page=1`,
    { method: "GET" },
  );

  const match = list.plans?.find((plan) => plan.name === planName(planId, totalCycles));
  if (!match) {
    throw new Error("PayPal reports the plan exists, but it could not be found.");
  }
  return match.id;
}

/**
 * Creates the catalog product and billing plan this demo reuses on every run.
 * A repeat run answers DUPLICATE_RESOURCE for the same product and plan names;
 * that reply means the objects exist, which is what this function needs, so it
 * resolves to the existing plan instead of failing.
 */
export async function ensurePlan(input: EnsurePlanInput): Promise<string> {
  // A plan with no end charges until it is cancelled. The screen says how many
  // payments there are, so the plan has to say the same thing.
  if (!Number.isInteger(input.totalCycles) || input.totalCycles < 1) {
    throw new RangeError(
      `A plan needs a whole number of charges, received ${input.totalCycles}`,
    );
  }

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

  try {
    const plan = await paypalRequest<{ id: string }>("/v1/billing/plans", {
      method: "POST",
      body: JSON.stringify({
        product_id: product.id,
        name: planName(input.planId, input.totalCycles),
        status: "ACTIVE",
        billing_cycles: [
          {
            frequency: { interval_unit: input.interval, interval_count: 1 },
            tenure_type: "REGULAR",
            sequence: 1,
            total_cycles: input.totalCycles,
            pricing_scheme: { fixed_price: toPayPalAmount(input.amount) },
          },
        ],
        payment_preferences: {
          auto_bill_outstanding: true,
          payment_failure_threshold: 1,
        },
      }),
    });

    return plan.id;
  } catch (error) {
    if (isDuplicate(error)) {
      return findExistingPlan(product.id, input.planId, input.totalCycles);
    }
    throw error;
  }
}

export async function createSubscription(planId: string): Promise<Subscription> {
  const subscription = await paypalRequest<{
    id: string;
    status: string;
    links?: Array<{ href: string; rel: string }>;
  }>("/v1/billing/subscriptions", {
    method: "POST",
    body: JSON.stringify({ plan_id: planId }),
  });

  const approveUrl = subscription.links?.find((link) => link.rel === "approve")?.href ?? null;

  return { id: subscription.id, status: subscription.status, approveUrl };
}
