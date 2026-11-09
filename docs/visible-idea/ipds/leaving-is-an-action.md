# IPD 23 — Leaving Is an Action

**Status:** Adopted and built (2026-11-10)
**Date:** 2026-11-10
**Answers:** Problem tree Q4 of `../intro.md` — *what should "cost to leave" let a person do*.
**Amends:** IPD 15 (`../../universal-commitment-companion/ipds/receipt.md`, the journey's end) — the receipt stops being a record that points elsewhere and becomes a record that can act.
**Supersedes:** nothing.

---

## Problem to solve

The product's defining figure is the one nobody else shows, and it has no verb attached to it.

On the receipt, "Cost to leave" states an amount and then hands the shopper a link to `paypal.com/myaccount/autopay/` — PayPal's own list of automatic payments, which the shopper must search for the subscription and cancel themselves. The judge reading called this precisely: *the most interesting number in the product has no verb attached to it.*

That ending is inconsistent with the rest of the product in a way the user put plainly:

> I think we allow buying as well? If buying is allowed so should cancelling be?

The product is not a bystander at the start of the commitment. It creates the order and **captures the money** (`app/api/paypal/orders/[id]/capture/route.ts`); for a subscription it creates the plan and the subscription itself. Having taken the person into the contract, it declines to help them out of it at exactly the moment the product's own figure says leaving is possible.

The inconsistency costs more than symmetry. The person this product is built for — someone who cannot easily hold a term in mind or find a cancellation clause — is the same person least able to navigate PayPal's autopay screen unaided. The product states "no fee to cancel" and then requires the hardest step of the whole journey to be completed elsewhere.

## Options

### Option 1 — Keep the figure and the link out

The receipt states the cost and links to PayPal's management page. *How it feels:* an honest disclosure that stops one step short of being useful — the product knows the answer and will not do the thing.

### Option 2 — **Cancel from the receipt, with a confirmation step, and report what PayPal actually did**

A button beside "Cost to leave" on a record whose commitment is still running. Pressing it asks a second time, in plain words: this ends the subscription, PayPal will stop charging, and it cannot be undone from here. Confirming calls PayPal and then states its answer — cancelled, already cancelled, or not changed.

*How it feels:* the product that told you leaving was free is the product that lets you leave.

### Option 3 — Cancel immediately on a single press

One button, no second step. *How it feels:* faster, and one stray click ends someone's payment arrangement with no confirmation of what it meant.

### Option 4 — A support link or an email address

The receipt offers to help rather than acting. *How it feels:* a form to fill in and a wait — the opposite of the product's claim that a figure can be checked on the spot.

## Reasoning

The symmetry argument is sound because the acts are the same kind. Creating a subscription and cancelling one are both operations on the shopper's own PayPal arrangement, performed with the shopper's approval, on the id PayPal returned for that arrangement. The product already initiates the first. Declining the second is not caution — it is an asymmetry in whose interests the product is arranged around.

The confirmation step is what separates an action from a trap. Cancelling a subscription is irreversible at PayPal, and the product keeps no record of what the person intended; a single press would let a mis-click end an arrangement with nothing on screen to undo. Asking once, in words that say what will happen, costs one press and makes the outcome the shopper's decision rather than the page's.

Reporting PayPal's answer rather than our own is already the rule everywhere money is involved: the capture route returns PayPal's status verbatim, and a capture that is `PENDING` is never called complete. Cancellation follows the same rule. A cancelled subscription that PayPal later reports as unchanged, or an attempt on one already cancelled, must be said in PayPal's terms — "PayPal says this subscription is already cancelled" — not smoothed into a success the product did not observe.

The alternative — telling the shopper to go to PayPal — is not neutral. For the audience this product claims, it moves the hardest step outside the product at the moment the product's own promise is being tested.

## Decision

**Option 2.**

1. **The action appears on the receipt for a recurring commitment PayPal reports as active**, beside the "Cost to leave" figure — the figure and its verb in one place.
2. **Two steps.** The first press opens a short confirmation naming the subscription, stating that PayPal will stop charging, and stating that it cannot be undone here. Nothing is sent until the second press.
3. **The server calls PayPal's cancel on the subscription id**, and the screen reports PayPal's own outcome:
   - cancelled — said plainly, with the fact that no further charges will be taken;
   - already cancelled or not active — said as PayPal's state, not as an error;
   - not confirmed — when the call fails or times out, said as "we cannot tell whether that went through — check PayPal", never as "nothing has changed". A dropped connection after PayPal committed the cancellation is not evidence that it did not happen, and this product does not report outcomes it did not observe.
4. **No figure is restated as a result.** The record continues to show what it showed; the action's outcome is a separate, dated statement.
5. **The action is not offered on a one-time payment**, where there is nothing to cancel, and not on a commitment PayPal has already ended.

## Tradeoffs

- **The receipt URL is the only credential.** The product keeps no session and no account, so anyone holding a subscription id can reach the receipt and cancel. The id is unguessable and appears only in the shopper's own browser history and in PayPal's redirect, and the confirmation step means a stray visit alone cancels nothing — but this is a property of the design, not an accident, and it is acceptable here because the payments are sandbox payments. A deployment taking real subscriptions would need an authenticated owner before offering the action.
- **Cancellation cannot be undone from this product.** PayPal offers no restore for a cancelled subscription; a person who changes their mind must subscribe again. The confirmation step is the only protection, and it must say this.
- **A cancel that succeeds leaves the record showing a figure for a commitment that no longer runs.** The record's figures stay as PayPal last stated them; the screen says what was done, not a revised total. Reconciling the two would require keeping state the product does not keep.
- **The action is unavailable when PayPal cannot be reached**, and the button must say so rather than failing silently.

## Notes

- The receipt already distinguishes settled from unsettled commitments (`isSettled`); the action belongs only to the settled, active, recurring case.
- PayPal's cancel answers with no body on success and an error for a subscription that is not in a cancellable state. Both are outcomes to report, not exceptions to swallow (ITD 21).
- The screen must not call the subscription "cancelled" on the strength of our request. Only PayPal's answer may be reported, in the same discipline as `COMPLETED` on a capture.

## Revision — 2026-11-10 (adversarial review, before any build)

1. **A cancelled subscription currently produces a false statement about money.** `isSettled` accepts only `COMPLETED` and `ACTIVE` (`lib/paypal/retrieve.ts:111-113`), and the receipt answers every other state with *"PayPal has not confirmed this payment, so there is nothing to record yet. Nothing has been taken."* (`app/receipt/[orderId]/page.tsx:79-89`). After this decision is used, the shopper who cancelled is told nothing was taken — after they paid, possibly for months — and the record they were told to keep is replaced by a notice. **`CANCELLED` must become a settled state of its own on the receipt**: a record that shows what was paid and states, separately, that PayPal reports the subscription cancelled. This is a condition of building the action, not a follow-up.
2. **The "already cancelled" branch is unreachable as the page stands.** The same early return fires before the action can be offered, so the outcome can only be reached by cancelling twice within one page's life. The record must render for a cancelled subscription for that branch to mean anything.
3. **A successful cancel is not the end of the record.** The figures stay as PayPal last stated them and the screen says what was done; reconciling them would mean keeping state the product does not keep (Tradeoffs, above). The record must make clear which of the two it is showing.

## Built — 2026-11-10

The action exists on the receipt, and the receipt survives the action. Nothing in the build changed the decision; two of its sentences changed shape when they met the screen.

| The decision | Where it is |
| :---- | :---- |
| The action beside "Cost to leave", on an active recurring commitment only | `components/CommitmentRecord.tsx` — the `standing.kind === "running"` branch inside the exit `<dd>`; the page decides it (`app/receipt/[orderId]/page.tsx`, `standing`) |
| Two steps, the first sending nothing | `components/CancelSubscription.tsx` — `idle → confirm → cancelling`, where only `cancel()` touches the network |
| PayPal's own outcome, three ways | `app/api/paypal/subscriptions/[id]/cancel/route.ts` — `cancelled` / `not-running` / `unconfirmed`, all answered 200 because all three are reports |
| No figure restated as a result | `CommitmentRecord` gains a `role="status"` statement, never a revised total |
| Not offered on a one-time payment or an ended commitment | `standing` is `null` unless PayPal reported `ACTIVE` or `CANCELLED` |

**The revision's condition was met first.** `CANCELLED` is settled (`lib/paypal/retrieve.ts`), so a cancelled subscription renders the record — what was paid, as PayPal stated it — and the statement that it is cancelled sits separately, with PayPal's `status_change_time` as its date. Without that, the act would have replaced the shopper's record with "nothing has been taken".

**Two wordings moved when they met the screen.**

1. The confirmation originally read "Cancel the {product} subscription ({id})?". The catalogue's product is named *Coffee Subscription*, so the sentence said "subscription subscription". It is now "Cancel {product} ({reference})? PayPal will stop taking payments for it. It cannot be undone here — if you change your mind you would have to subscribe again." — which is true of the product name either way.
2. The across-term figure on a cancelled record would have read as a live promise. It now carries the hint *"The whole agreement was for this much. It ended early, so this is what it was for, not what it will cost."* — the revision's third point made visible rather than left to inference.

**Verified live (sandbox), partially.** `POST /api/paypal/subscriptions/I-ZZZZZZZZZZZZ/cancel` (well-formed, no such subscription) returned `{"outcome":"not-running","issue":"INVALID_RESOURCE_ID"}` in 0.65 s — so the credentials, the path, the POST and the error mapping all work against PayPal for real.

Two things this proved that the decision had assumed, both now written down in ITD 21:
- PayPal answers `400 INVALID_PARAMETER_SYNTAX` for an id that is not shaped like `I-` + 12 characters — the product's `unconfirmed` sentence ("we cannot tell whether that went through") is therefore the wrong wording for a *malformed* id, though it is unreachable from the page, where the id always came from PayPal.
- The field `status_change_time` is populated for a subscription PayPal reports ended — which is what dates the cancelled statement.

**Not verified live: the success path.** Ending a subscription that is actually running needs an `ACTIVE` one, and the only sandbox subscription on this account is `APPROVAL_PENDING` — it awaits a buyer login that is the user's to perform (`todo.md` §1). The success branch is covered by tests through both the route and the component, but the video must show it on a real approved subscription before the demo claims it. This is stated, not hidden.

