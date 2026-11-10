import { money, type Money } from "../money";
import type { BillingPeriod, CommitmentTerms } from "../commitment/types";
import { paypalRequest, withinDeadline } from "./client";

/**
 * Reading a subscription's terms from PayPal instead of from the catalogue file
 * (ITD 17, IPD 20).
 *
 * A catalog product carries a name and a description and **no price at all**;
 * the price lives on a billing plan. So a product's terms only exist once a
 * plan has been read, and a product without a plan is a name with no number —
 * which is not a commitment the product can show.
 */

type PayPalProduct = {
  id: string;
  name: string;
  description?: string;
};

export type PayPalPlan = {
  id?: string;
  status?: string;
  billing_cycles?: {
    frequency?: { interval_unit?: string; interval_count?: number };
    tenure_type?: string;
    total_cycles?: number;
    pricing_scheme?: { fixed_price?: { currency_code?: string; value?: string } };
  }[];
  payment_preferences?: {
    auto_bill_outstanding?: boolean;
    setup_fee?: { currency_code?: string; value?: string };
    setup_fee_failure_action?: string;
    payment_failure_threshold?: number;
  };
};

/** The PayPal product id for a slug, if one has been created deliberately. */
export function paypalProductIdFor(slug: string): string | null {
  const ids: Record<string, string | undefined> = {
    "noise-cancelling-headphones": process.env.PAYPAL_PRODUCT_HEADPHONES,
  };
  return ids[slug]?.trim() || null;
}

/** "12.00" → 1200. PayPal sends decimal strings; every figure here is minor units. */
export function minorFromPayPal(value: string | undefined): number | null {
  if (value === undefined) return null;
  // Parse as a decimal string rather than through floating point: 12.005 must
  // not become 1200 because of a binary rounding step.
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!match) return null;
  const [, whole, fraction = ""] = match;
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

function priceOf(amount: { value?: string } | undefined): Money | null {
  const minor = minorFromPayPal(amount?.value);
  return minor === null ? null : money(minor);
}

function periodOf(unit: string | undefined): BillingPeriod | null {
  if (unit === "MONTH") return "month";
  if (unit === "YEAR") return "year";
  return null;
}

/**
 * A plan becomes terms, or nothing. It becomes nothing when it has no fixed
 * price, no readable interval, or a cadence this product cannot show — an
 * approximation here would be a figure nobody published.
 *
 * The opening fee is read from `payment_preferences.setup_fee`, because that is
 * the charge PayPal takes when the plan starts. A reader that skipped it would
 * report a term total $60.00 below the one the plan actually collects.
 *
 * The same goes for `payment_failure_threshold`: it is a term of the plan, and a
 * plan that is suspended after one failed payment says so on the screen before
 * the shopper agrees. A plan that carries no threshold states no policy, and the
 * schedule says that instead of guessing one.
 *
 * The exit term is always `unknown`: PayPal has no field for what it costs to
 * leave (IPD 19), so a plan cannot answer the third figure.
 */
export function termsFromPlan(plan: PayPalPlan): CommitmentTerms | null {
  const cycle = plan.billing_cycles?.find((entry) => entry.tenure_type !== "TRIAL");
  const period = periodOf(cycle?.frequency?.interval_unit);
  const price = priceOf(cycle?.pricing_scheme?.fixed_price);

  if (!cycle || !period || !price) return null;

  const count = cycle.total_cycles && cycle.total_cycles > 0 ? cycle.total_cycles : null;
  if (count === null) return null;

  const setupFee = priceOf(plan.payment_preferences?.setup_fee);
  const suspendAfter = plan.payment_preferences?.payment_failure_threshold;

  return {
    shape: "recurring",
    itemPrice: price,
    shipping: money(0),
    tax: money(0),
    recurrence: { count, period },
    ...(setupFee && setupFee.minor > 0 ? { openingFee: setupFee } : {}),
    ...(typeof suspendAfter === "number" && Number.isInteger(suspendAfter) && suspendAfter > 0
      ? { failure: { suspendAfter } }
      : {}),
    exit: { kind: "unknown" },
  };
}

/**
 * What a catalog product holds: a name, a description, a type, a category — and
 * no price. That makes it enough to list a shop and not enough to show a
 * commitment, which is why the shop can read one call per product and the
 * payment screens read the plan as well.
 */
export type PayPalProductCard = {
  slug: string;
  paypalProductId: string;
  name: string;
  description: string;
};

export async function readProductCardFromPayPal(slug: string): Promise<PayPalProductCard | null> {
  const productId = paypalProductIdFor(slug);
  if (!productId) return null;

  const product = await withinDeadline((signal) =>
    paypalRequest<PayPalProduct>(`/v1/catalogs/products/${productId}`, { signal }),
  );

  return {
    slug,
    paypalProductId: product.id,
    name: product.name,
    description: product.description ?? "",
  };
}

export type PayPalCatalogueEntry = PayPalProductCard & {
  terms: CommitmentTerms;
  /** The plan the terms were read from, named as the screen should name it. */
  planLabel: string;
};

/**
 * Read one product and its first usable plan from PayPal. Returns null when
 * anything is missing, so the caller falls back to the published terms in the
 * catalogue file and says so (IPD 20, rule 2).
 */
export async function readProductFromPayPal(slug: string): Promise<PayPalCatalogueEntry | null> {
  const product = await readProductCardFromPayPal(slug);
  if (!product) return null;

  const productId = product.paypalProductId;
  const plans = await withinDeadline((signal) =>
    paypalRequest<{ plans?: PayPalPlan[] }>(
      `/v1/billing/plans?product_id=${encodeURIComponent(productId)}&page_size=20`,
      { signal },
    ),
  );

  const usable = (plans.plans ?? [])
    .map((plan) => ({ plan, terms: termsFromPlan(plan) }))
    .find((entry) => entry.terms !== null);

  if (!usable || !usable.terms) return null;

  return { ...product, terms: usable.terms, planLabel: `the PayPal plan for ${product.name}` };
}
