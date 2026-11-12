import { resolveProductOutcome } from "@/lib/catalog/resolve";
import { computeCommitment } from "@/lib/commitment/compute";
import { formatMoney } from "@/lib/money";
import { buildCalendar } from "@/lib/receipt/calendar";
import { isSettled, retrieveSubscription } from "@/lib/paypal/retrieve";

type RouteContext = {
  params: Promise<{ orderId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { orderId } = await context.params;
  const slug = new URL(request.url).searchParams.get("slug");
  // The same resolver the screens use: a subscription may have come from PayPal
  // or from a live catalogue listing, and the calendar has no business knowing
  // which. Reading only the file would refuse to remind anyone about a real
  // subscription.
  //
  // A catalogue that did not answer is not a commitment with no next charge —
  // that sentence is a fact about the purchase, and this read supports none.
  const outcome = slug ? await resolveProductOutcome(slug) : ({ kind: "absent" } as const);

  if (outcome.kind === "unreadable") {
    return new Response(
      "The catalogue could not be read just now, so there is no reminder to make from it.",
      { status: 503 },
    );
  }

  const product = outcome.kind === "found" ? outcome.product : null;

  // A financed purchase is scheduled monthly too, so it has a next charge.
  // Anything paid once has none.
  if (!product || product.terms.shape === "one_time") {
    return new Response("This purchase has no next charge to remind you about.", { status: 404 });
  }

  try {
    const subscription = await retrieveSubscription(orderId);

    if (!isSettled(subscription.status) || !subscription.nextBillingTime) {
      return new Response("PayPal has not set a date for the next charge yet.", { status: 404 });
    }

    // One period, not what was charged at the start: the opening fee is taken
    // once, and a reminder that added it again would overstate every later
    // charge. A plan PayPal would not state leaves the amount unstated rather
    // than filled in from the catalogue.
    const amount = subscription.terms
      ? computeCommitment(subscription.terms).perPeriod
      : null;

    if (!amount) {
      return new Response("PayPal has not stated the amount of the next charge.", { status: 404 });
    }

    const calendar = buildCalendar({
      title: `${product.name} — payment due`,
      description: `${formatMoney(amount)} will be charged by PayPal for ${product.name}.`,
      start: new Date(subscription.nextBillingTime),
    });

    return new Response(calendar, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${product.slug}-next-payment.ics"`,
      },
    });
  } catch {
    return new Response("PayPal could not confirm the next payment date.", { status: 502 });
  }
}
