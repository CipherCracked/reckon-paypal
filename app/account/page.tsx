import { cookies } from "next/headers";
import { BackLink } from "@/components/BackLink";
import { computeCommitment } from "@/lib/commitment/compute";
import { presentFigures } from "@/lib/commitment/present";
import { describeSchedule } from "@/lib/commitment/schedule";
import { withBudget } from "@/lib/deadline";
import { formatMoney } from "@/lib/money";
import { identityConfigured } from "@/lib/paypal/identity";
import { findSubscriptionsFor } from "@/lib/paypal/records";
import { retrieveSubscription, type SubscriptionRecord } from "@/lib/paypal/retrieve";
import { SESSION_COOKIE, readSession, signInConfigured } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * What this store already holds for you (IPD 25).
 *
 * The way back to a commitment whose link was lost. It is not an account: there
 * is no record of the person anywhere, the page asks PayPal on every visit, and
 * the only thing kept is a signed cookie that expires (ITD 22).
 *
 * Three states that must never merge (IPD 26): not signed in, could not look,
 * and looked and found none.
 */

const ROW_DEADLINE_MS = 6_000;

const SIGN_IN_REASONS: Record<string, string> = {
  denied: "That sign-in was not completed. Nothing was read.",
  failed: "PayPal did not complete the sign-in. Nothing was read.",
  unreadable: "PayPal signed you in but did not say which account, so nothing was read.",
  unavailable: "Signing in is not switched on for this deployment.",
};

function Figure({ label, amount, arithmetic }: { label: string; amount: string; arithmetic: string | null }) {
  return (
    <li className="account-figure">
      <span className="account-figure-label">{label}</span>
      <span className="account-figure-amount">{amount}</span>
      {arithmetic ? <span className="account-figure-arithmetic">{arithmetic}</span> : null}
    </li>
  );
}

function Row({ record, read }: { record: { id: string; status: string }; read: SubscriptionRecord | null }) {
  // PayPal is the only source for what this is, so a record it would not
  // describe is reported as unread rather than shown with figures from nowhere.
  if (!read || !read.terms) {
    return (
      <li className="account-row">
        <p className="account-row-heading">A subscription this store holds for you</p>
        <p className="account-row-standing">
          PayPal did not say what this one costs. Its reference is {record.id}.
        </p>
      </li>
    );
  }

  const figures = presentFigures(read.terms, computeCommitment(read.terms));
  const cancelled = record.status.toUpperCase() === "CANCELLED";

  return (
    <li className="account-row">
      <p className="account-row-heading">{describeSchedule(read.terms, { firstPaymentToday: false })}</p>
      <p className="account-row-standing">
        {cancelled
          ? "PayPal says this subscription is cancelled. It will take no further payments for it."
          : `PayPal says this subscription is ${record.status.toLowerCase()}.`}
        {!cancelled && read.nextBillingTime
          ? ` Next charge ${new Date(read.nextBillingTime).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
              timeZone: "UTC",
            })}.`
          : ""}
      </p>

      <ul className="account-figures">
        {figures.map((figure) => (
          <Figure
            key={figure.id}
            label={figure.label}
            amount={figure.amount ? formatMoney(figure.amount) : "Not stated"}
            arithmetic={figure.arithmetic}
          />
        ))}
      </ul>
    </li>
  );
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ signin?: string }>;
}) {
  const { signin } = await searchParams;
  const person = readSession((await cookies()).get(SESSION_COOKIE)?.value);

  // Nothing to sign in with — the one case where the page says the feature is
  // off rather than offering a button that cannot work.
  if (!identityConfigured() || !signInConfigured()) {
    return (
      <div className="page">
        <BackLink href="/">Back to the ways in</BackLink>
        <h1>What this store holds for you</h1>
        <p className="notice">
          We cannot check what this store holds for you. Signing in with PayPal is not switched on
          for this deployment, so nothing was read.
        </p>
      </div>
    );
  }

  if (!person) {
    return (
      <div className="page">
        <BackLink href="/">Back to the ways in</BackLink>
        <h1>What this store holds for you</h1>
        <p>
          Sign in with the PayPal account you paid with. We will show you the subscriptions this
          store holds under that account, each with what it adds up to and what leaving costs.
        </p>
        <p className="hint">
          Signing in does not give this store an account. It reads your subscriptions from PayPal
          when you ask, and keeps nothing afterwards but a sign-in that expires in two hours.
        </p>
        {signin && SIGN_IN_REASONS[signin] ? <p className="notice">{SIGN_IN_REASONS[signin]}</p> : null}
        <p>
          <a className="button-primary" href="/auth/paypal/start">
            Sign in with PayPal
          </a>
        </p>
      </div>
    );
  }

  const discovery = await findSubscriptionsFor(person.payerId);

  // "We could not look" is never "you have none" (IPD 26).
  if (discovery.kind === "unavailable") {
    return (
      <div className="page">
        <BackLink href="/">Back to the ways in</BackLink>
        <h1>What this store holds for you</h1>
        <p className="notice">
          We could not check what this store holds for you — PayPal did not answer, or the check
          took longer than we will make you wait. This is not a statement that you have no
          subscriptions. Try again in a moment.
        </p>
      </div>
    );
  }

  const reads = await Promise.all(
    discovery.records.map((record) =>
      withBudget(retrieveSubscription(record.id), ROW_DEADLINE_MS, null),
    ),
  );

  return (
    <div className="page">
      <BackLink href="/">Back to the ways in</BackLink>
      <h1>What this store holds for you</h1>

      {discovery.records.length === 0 ? (
        <p className="notice">
          This store holds no subscriptions under your PayPal account
          {person.email ? ` (${person.email})` : ""}. Only subscriptions can be listed here — a
          purchase you paid once does not appear, because PayPal gives this store no way to look one
          up without an id.
        </p>
      ) : (
        <>
          <p className="hint">
            Read from PayPal just now, for {person.email || "your account"}. This store keeps no
            copy.
          </p>

          <ol className="account-rows">
            {discovery.records.map((record, index) => (
              <Row key={record.id} record={record} read={reads[index]} />
            ))}
          </ol>

          {discovery.stopped ? (
            <p className="notice">
              We stopped after reading {discovery.scanned} subscriptions, so this list may be
              incomplete.
            </p>
          ) : null}
        </>
      )}

      <p className="hint">
        These are the subscriptions this store set up for you. To see everything you pay by
        subscription, including at other sellers, use PayPal&apos;s own automatic payments page.
      </p>

      <form method="post" action="/auth/paypal/signout">
        <button type="submit" className="button-secondary">
          Sign out
        </button>
      </form>
    </div>
  );
}
