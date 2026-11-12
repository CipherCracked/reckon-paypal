import { resolveProductOutcome } from "@/lib/catalog/resolve";
import { noScheduleSentence } from "@/lib/catalog/term-state";
import type { CommitmentTerms } from "@/lib/commitment/types";
import { addMoney, zeroMoney, type Money } from "@/lib/money";
import { PayPalError } from "@/lib/paypal/client";
import { createSubscription, ensurePlan } from "@/lib/paypal/subscriptions";

/**
 * The plan PayPal has to hold for these terms, or nothing.
 *
 * Two shapes are paid over time, and both are a billing plan: a repeating term
 * (a subscription) and a financed purchase (instalments). The second used to
 * skip this route entirely and become a single captured order — the screen
 * promised twelve payments and PayPal was asked for one, which is a figure with
 * nothing behind it. Creating the plan is what makes "across the term" a number
 * PayPal will actually collect.
 */
function planFor(
  terms: CommitmentTerms,
): { amount: Money; interval: "MONTH" | "YEAR"; totalCycles: number } | null {
  if (terms.shape === "recurring" && terms.recurrence) {
    return {
      // One period's charge: the item plus its tax, the same figure the
      // commitment view multiplies by the term. A tax the source never stated
      // is not part of a plan PayPal will charge for, so it adds nothing here.
      amount: addMoney(terms.itemPrice, terms.tax ?? zeroMoney()),
      interval: terms.recurrence.period === "month" ? "MONTH" : "YEAR",
      totalCycles: terms.recurrence.count,
    };
  }

  if (terms.shape === "financed" && terms.installment) {
    return {
      amount: terms.installment.amount,
      // The seller's page and the schedule both say "one a month".
      interval: "MONTH",
      totalCycles: terms.installment.count,
    };
  }

  return null;
}

export async function POST(request: Request) {
  let slug: string | null = null;
  try {
    const body = (await request.json()) as { slug?: unknown };
    slug = typeof body.slug === "string" ? body.slug : null;
  } catch {
    slug = null;
  }

  // PayPal first, the file second — the same resolution the consent screen
  // used to show the figures. Building the plan from the file while the screen
  // read PayPal is how a shopper agrees to one number and is charged another.
  //
  // A catalogue that did not answer is not an unknown product: saying so would
  // tell the shopper a real listing does not exist, on the screen before money.
  const outcome = slug ? await resolveProductOutcome(slug) : ({ kind: "absent" } as const);

  if (outcome.kind !== "found") {
    const unreadable = outcome.kind === "unreadable";
    return Response.json(
      {
        error: unreadable
          ? "The catalogue could not be read just now, so this purchase cannot be started. Nothing has been charged."
          : "Unknown product.",
      },
      { status: unreadable ? 503 : 404 },
    );
  }

  const product = outcome.product;

  // A plan needs a term. A listing whose words nobody has read yet, or whose
  // term cannot be scheduled, has none this request may assume (IPD 40, ITD 34).
  if (!product.terms) {
    return Response.json({ error: noScheduleSentence(product.termState) }, { status: 503 });
  }

  const plan = planFor(product.terms);
  if (!plan) {
    return Response.json(
      { error: "This product is not paid over a repeating term." },
      { status: 400 },
    );
  }

  // PayPal sends the shopper back here after they approve, appending the
  // subscription id to whatever return URL the subscription was created with.
  // Without it there is no way back into this product at all.
  const origin = new URL(request.url).origin;
  const back = `${origin}/consent/pending?slug=${encodeURIComponent(product.slug)}`;

  try {
    const planId = await ensurePlan({
      productId: `DEMO-${product.slug.toUpperCase()}`,
      planId: `P-DEMO-${product.slug.toUpperCase()}`,
      // The seller's copy, so the product PayPal stores can be quoted from —
      // except for a listing, whose copy is longer than PayPal accepts on a
      // product and every screen reads from the catalogue anyway. Sending the
      // first 256 characters of a merchant's paragraph would be a sentence this
      // app cut, offered as one the merchant wrote.
      description: product.listed ? null : product.description,
      amount: plan.amount,
      interval: plan.interval,
      // The same count the screen prints. A plan that never ends would outlive
      // the term the shopper agreed to.
      totalCycles: plan.totalCycles,
      // The same fee the screen says is charged today: PayPal takes it when the
      // plan starts, so leaving it off here would charge a different amount from
      // the one the figures above the button state.
      setupFee: product.terms.openingFee ?? null,
    });

    const subscription = await createSubscription(planId, {
      returnUrl: `${back}&approved=1`,
      cancelUrl: `${back}&cancelled=1`,
    });

    return Response.json({
      subscriptionId: subscription.id,
      status: subscription.status,
      // The shopper approves the commitment in PayPal itself; without this
      // link the consent screen has nowhere to send them.
      approveUrl: subscription.approveUrl,
    });
  } catch (error) {
    // Logged because a 502 with no reason makes every failure look the same: a
    // bad credential, a cut-off description and a rejected plan all answer with
    // the same sentence, and only the error carries the issue code.
    console.warn(
      "POST /api/paypal/subscriptions — subscription failed:",
      error instanceof Error ? `${error.name}: ${error.message}` : String(error),
    );

    const message =
      error instanceof PayPalError
        ? `PayPal could not start this subscription (${error.issue ?? error.status}).`
        : "PayPal could not start this subscription.";

    return Response.json({ error: message }, { status: 502 });
  }
}
