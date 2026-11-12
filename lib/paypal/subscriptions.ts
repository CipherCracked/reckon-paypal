import { PayPalError, paypalRequest, toPayPalAmount } from "./client";
import { SUSPEND_AFTER_FAILED_PAYMENTS } from "@/lib/commitment/plan-policy";
import type { Money } from "@/lib/money";

export type EnsurePlanInput = {
  productId: string;
  planId: string;
  /**
   * The seller's published copy, stored on the PayPal product so a screen can
   * quote it. Left out when the copy lives in a catalogue this app reads live:
   * PayPal caps a product description at 256 characters and a merchant's
   * paragraph is longer, so the choice is between sending nothing and sending a
   * sentence someone else's limit cut in half.
   */
  description?: string | null;
  amount: Money;
  interval: "MONTH" | "YEAR";
  /** How many charges the term has. The plan must end when the screen says it does. */
  totalCycles: number;
  /**
   * A charge taken once when the plan starts, on top of the first period. PayPal
   * calls it `setup_fee` and collects it at activation, which is exactly what a
   * screen showing "charged today" must be able to say.
   */
  setupFee?: Money | null;
};

export type Subscription = { id: string; status: string; approveUrl: string | null };

/**
 * What makes one plan a different plan from another.
 *
 * The name carries every field PayPal charges on, because a PayPal plan is
 * immutable once created and a repeat run resolves to the plan it made last time
 * by name. A name that did not state the term would keep handing back an
 * open-ended plan after the screen had learned to promise an end; one that did
 * not state the fee would hand back a plan that charges $60.00 less than the
 * screen says it will. The same goes for the price and the cadence: the shop
 * reads both live, so a merchant can change either while the plan made for the
 * old figure still exists — and matching it would take a price the screen never
 * showed.
 */
type PlanIdentity = Pick<
  EnsurePlanInput,
  "planId" | "totalCycles" | "setupFee" | "amount" | "interval"
>;

function planName(plan: PlanIdentity): string {
  const fee = plan.setupFee && plan.setupFee.minor > 0 ? ` +${toPayPalAmount(plan.setupFee).value}` : "";
  const price = toPayPalAmount(plan.amount).value;
  return `Commitment demo plan ${plan.planId} ${plan.totalCycles}x${price}/${plan.interval.toLowerCase()}${fee}`;
}

function isDuplicate(error: unknown): boolean {
  return (
    error instanceof PayPalError &&
    (error.status === 409 || (error.issue ?? "").toUpperCase().includes("DUPLICATE"))
  );
}

/** PayPal refuses a catalog product description longer than this. */
const DESCRIPTION_MAX = 256;

/**
 * A guard, not a habit. Every caller is expected to send copy that fits or to
 * send none; this exists because the failure it prevents is a dead screen at the
 * moment of agreement, which is the worst place in this product to stop. The cut
 * is marked, so a description that was shortened never reads as a complete
 * sentence someone wrote.
 */
function clampDescription(text: string): string {
  return text.length <= DESCRIPTION_MAX ? text : `${text.slice(0, DESCRIPTION_MAX - 1)}…`;
}

/**
 * Finds the plan this demo created on an earlier run. PayPal refuses a second
 * plan with the same name, and its plan-create call takes no client id, so the
 * only way back to the existing plan is to list the product's plans and match
 * by name.
 */
async function findExistingPlan(productId: string, input: PlanIdentity): Promise<string> {
  const list = await paypalRequest<{ plans?: Array<{ id: string; name?: string }> }>(
    `/v1/billing/plans?product_id=${encodeURIComponent(productId)}&page_size=20&page=1`,
    { method: "GET" },
  );

  const wanted = planName(input);
  const match = list.plans?.find((plan) => plan.name === wanted);
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

  const description = input.description ? clampDescription(input.description) : null;

  const product = await paypalRequest<{ id: string }>("/v1/catalogs/products", {
    method: "POST",
    body: JSON.stringify({
      id: input.productId,
      name: `Commitment demo product ${input.productId}`,
      // The seller's own copy goes onto the PayPal product, because the front
      // door reads the description from here and reads the cost to leave out of
      // it (IPD 21). A product created without one leaves the entry with
      // nothing to quote — which is why a listing, whose copy the front door
      // reads from the catalogue instead, sends none rather than a shortened
      // one.
      ...(description ? { description } : {}),
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
        name: planName(input),
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
          // The same number the catalogue states on the terms, so the sentence
          // the shopper reads before agreeing is the policy PayPal will apply.
          payment_failure_threshold: SUSPEND_AFTER_FAILED_PAYMENTS,
          // The opening fee, so PayPal collects the same figure the screen
          // showed as charged today. Omitted rather than sent as "0.00": a plan
          // with no setup fee says nothing, and a zero is a claim.
          ...(input.setupFee && input.setupFee.minor > 0
            ? { setup_fee: toPayPalAmount(input.setupFee) }
            : {}),
        },
      }),
    });

    return plan.id;
  } catch (error) {
    if (isDuplicate(error)) {
      return findExistingPlan(product.id, input);
    }
    throw error;
  }
}

/**
 * The one sentence PayPal stores as the reason for the cancellation. Fixed text,
 * because nothing about the person should travel to PayPal in a free field.
 */
const CANCEL_REASON = "Cancelled from the receipt for this subscription";

/**
 * Ends a subscription at PayPal (ITD 21).
 *
 * PayPal answers a successful cancel with **no body at all**, so there is
 * nothing to return: the only evidence of success is that the call did not fail.
 * Anything else comes back as a `PayPalError` — an unprocessable-entity reply
 * when the subscription is not in a cancellable state, or a status when it could
 * not be reached — and the caller decides what each of those means.
 *
 * The signal is the caller's: an action a person is waiting on gets a deadline,
 * and aborting mid-request is exactly the case that must be reported as "we
 * cannot tell", never as "nothing changed".
 */
export async function cancelSubscription(
  id: string,
  signal?: AbortSignal | null,
): Promise<void> {
  await paypalRequest<unknown>(
    `/v1/billing/subscriptions/${encodeURIComponent(id)}/cancel`,
    {
      method: "POST",
      body: JSON.stringify({ reason: CANCEL_REASON }),
      signal,
    },
  );
}

export type ApprovalReturn = {
  /** Where PayPal sends the shopper after they approve. */
  returnUrl: string;
  /** Where it sends them if they back out. */
  cancelUrl: string;
};

export async function createSubscription(
  planId: string,
  returnTo: ApprovalReturn,
): Promise<Subscription> {
  const subscription = await paypalRequest<{
    id: string;
    status: string;
    links?: Array<{ href: string; rel: string }>;
  }>("/v1/billing/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      plan_id: planId,
      // Without this PayPal leaves the shopper on its own confirmation page:
      // the subscription exists, they approved it, and this product never
      // sees them again — no receipt, no record, a dead end at the end of the
      // flagship flow. The order path has always sent these. The recurring
      // path, which carries the twelve-month term, did not.
      application_context: {
        user_action: "SUBSCRIBE_NOW",
        return_url: returnTo.returnUrl,
        cancel_url: returnTo.cancelUrl,
      },
    }),
  });

  const approveUrl = subscription.links?.find((link) => link.rel === "approve")?.href ?? null;

  return { id: subscription.id, status: subscription.status, approveUrl };
}
