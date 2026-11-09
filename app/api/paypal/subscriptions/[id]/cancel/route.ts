import { withinDeadline } from "@/lib/deadline";
import { PayPalError } from "@/lib/paypal/client";
import { cancelSubscription } from "@/lib/paypal/subscriptions";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * How long the shopper waits before being told we cannot tell.
 *
 * Short enough to be an answer rather than a stall; the outcome it produces is
 * the honest one — after an abort, whether PayPal committed is unknown, and
 * that is what the screen says.
 */
const CANCEL_DEADLINE_MS = 10_000;

/**
 * The issue codes PayPal answers when there is no running subscription to end.
 * The cancel endpoint refuses anything that is not `ACTIVE`, and says so with an
 * unprocessable-entity reply rather than a success.
 */
const NOT_RUNNING: ReadonlySet<string> = new Set([
  "SUBSCRIPTION_STATUS_INVALID",
  "RESOURCE_NOT_FOUND",
  "INVALID_RESOURCE_ID",
]);

type CancelOutcome =
  | { outcome: "cancelled" }
  /** PayPal's own state: there was nothing running to end. */
  | { outcome: "not-running"; issue: string | null }
  /** Neither committed nor refused. The one thing we may not claim is that nothing happened. */
  | { outcome: "unconfirmed" };

/**
 * Ends a subscription at PayPal and reports what PayPal said.
 *
 * Three outcomes, not two, and all three are answered with the same status
 * because all three are reports rather than transport failures: the request was
 * served, and what it says is the result. `cancelled` is returned only when
 * PayPal returned success — a subscription reported as cancelled on the strength
 * of our own request would be the same mistake as calling a `PENDING` capture
 * complete (IPD 23, ITD 21).
 */
export async function POST(_request: Request, context: RouteContext): Promise<Response> {
  const { id } = await context.params;

  if (!id) {
    return Response.json({ error: "A subscription id is required." }, { status: 400 });
  }

  try {
    await withinDeadline((signal) => cancelSubscription(id, signal), CANCEL_DEADLINE_MS);
    return Response.json({ outcome: "cancelled" } satisfies CancelOutcome);
  } catch (error) {
    if (error instanceof PayPalError) {
      const issue = error.issue ?? null;
      if ((issue && NOT_RUNNING.has(issue)) || error.status === 404) {
        return Response.json({ outcome: "not-running", issue } satisfies CancelOutcome);
      }
    }

    // A timeout, a reset, a 5xx, or anything else we cannot read: PayPal may have
    // committed before the answer was lost, so this is not "nothing changed".
    // Logged because every unconfirmed outcome looks alike on the screen, and the
    // operator needs to know which one it was.
    console.warn(
      "POST /api/paypal/subscriptions/:id/cancel — PayPal did not confirm:",
      error instanceof Error ? `${error.name}: ${error.message}` : String(error),
    );
    return Response.json({ outcome: "unconfirmed" } satisfies CancelOutcome);
  }
}
