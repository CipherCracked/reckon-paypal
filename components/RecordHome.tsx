import { CommitmentRow } from "@/components/CommitmentRow";
import { MarketSearch } from "@/components/MarketSearch";
import { Page } from "@/components/Page";
import { withBudget } from "@/lib/deadline";
import { findSubscriptionsFor } from "@/lib/paypal/records";
import { retrieveSubscription } from "@/lib/paypal/retrieve";

/**
 * The home screen for someone who is signed in (IPD 28).
 *
 * This is the half of the front door the owner asked for: a person who has
 * agreed to something here lands on what they agreed to, without first being
 * told what agreeing means. It is the same address as the proof, rendered for a
 * different reader — so there is one home, not a marketing page and an app.
 *
 * Nothing is kept between visits: the list is rebuilt from PayPal on every load,
 * and the three states IPD 26 separated are still separate — could not look,
 * looked and found none, and found these. The states are this component's job
 * because the list is what can fail; the search under it does not depend on them.
 */
const ROW_DEADLINE_MS = 6_000;

export async function RecordHome({
  person,
}: {
  person: { payerId: string; email: string | null };
}) {
  const discovery = await findSubscriptionsFor(person.payerId);

  // "We could not look" is never "you have none" (IPD 26).
  const reads =
    discovery.kind === "found"
      ? await Promise.all(
          discovery.records.map((record) =>
            withBudget(retrieveSubscription(record.id), ROW_DEADLINE_MS, null),
          ),
        )
      : [];

  return (
    <Page
      title="Your commitments"
      lede="What this store holds under your PayPal account, read from PayPal at the moment you asked. There is no account here to leave behind, and nothing on this page was stored."
      headerExtra={
        <p className="account-identity">
          Read from PayPal just now{person.email ? " for" : ""}{" "}
          {person.email ? <strong>{person.email}</strong> : null}. This store keeps no copy.
        </p>
      }
    >
      {discovery.kind === "unavailable" ? (
        <p className="notice" role="status">
          We could not check what this store holds for you — PayPal did not answer, or the check
          took longer than we will make you wait. This is not a statement that you have no
          subscriptions. Try again in a moment.
        </p>
      ) : discovery.records.length === 0 ? (
        <p className="notice" role="status">
          This store holds no subscriptions under your PayPal account
          {person.email ? ` (${person.email})` : ""}. Only subscriptions can be listed here — a
          purchase you paid once does not appear, because PayPal gives this store no way to look one
          up without an id.
        </p>
      ) : (
        <>
          <ol className="account-rows">
            {discovery.records.map((record, index) => (
              <CommitmentRow key={record.id} record={record} read={reads[index] ?? null} />
            ))}
          </ol>

          {discovery.stopped ? (
            <p className="notice" role="status">
              We stopped after reading {discovery.scanned} subscriptions, so this list may be
              incomplete.
            </p>
          ) : null}

          <p className="hint">
            These are the subscriptions this store set up for you. To see everything you pay by
            subscription, including at other sellers, use PayPal&apos;s own automatic payments page.
          </p>
        </>
      )}

      <section aria-labelledby="home-check-heading" className="home-check">
        <h2 id="home-check-heading">Check something new</h2>
        <p className="lede">
          Any product you are about to buy, and any document someone has sent you, works the same
          way: the seller&apos;s words, then the three figures.
        </p>
        <MarketSearch inputId="home-q" />
        <p className="scope-note">
          <a href="/read">Or paste a document someone sent you</a> — a bill, a contract, a renewal
          notice.
        </p>
      </section>
    </Page>
  );
}
