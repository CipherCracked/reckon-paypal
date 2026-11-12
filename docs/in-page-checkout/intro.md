# In-Page Checkout — Problem Decomposition

**Status:** Decided (2026-11-12) — four IPDs, two ITDs, nothing built
**Date:** 2026-11-12
**Raised by:** the owner's queue item R4 — *In-page checkout with `@paypal/react-paypal-js`*, from the audit that produced §19. Ranked #2 by value after R2, and the last item in that queue with no decisions behind it.

---

## Problem Statement

The product's argument is that the commitment is understood **here**, on this screen, before the money moves. The figures, the optional recognition check, the pacing control, the read-aloud and the plain-language summary all exist to make one decision legible. Then the shopper presses a button, and the decision is taken somewhere else.

The moment of paying is the only part of this journey the product does not host and cannot see. The shopper is handed a **link** — inside a notice, after the button they just pressed has been disabled — and leaves for PayPal's own page. Everything the product spent five trees building ends at a hyperlink, and what the shopper experiences next belongs to another company's screen. For an audience of adults with dyscalculia, ADHD and dyslexia, the screen where the money actually leaves is the one screen with none of the work on it.

There is a second problem, and it is about how the integration reads rather than how it behaves. A link labelled *Approve the payment with PayPal* is indistinguishable from any other outbound link. PayPal's own button is not: it is the object people have been taught to trust, and its absence on a screen that says *PayPal* is the tell that the integration is a redirect. Judges read it the same way the audience does.

**The question between those two:** may the payment be approved **here**, on the screen where the decision was made — and if it may, what happens to everything that screen was built to do?

## Background and Context

### The path today, read from the code

| Step | What happens |
|---|---|
| 1. The shopper presses the primary button | `Pay now`, `Approve subscription with PayPal` or `Approve payment plan with PayPal` (`components/ConsentScreen.tsx:344-366`) |
| 2. A route creates the object | `/api/paypal/orders` (one-time) or `/api/paypal/subscriptions` (repeating, instalments). Both build the return and cancel URLs from **our own origin**, never from the request body (`app/api/paypal/orders/route.ts:72-81`) |
| 3. The button is **disabled** and a **link** appears | the only way on is a `button-secondary` link inside a `role="status"` notice (`components/ConsentScreen.tsx:366-375`) — a second press |
| 4. The shopper leaves | `paypal.com/checkoutnow?token=…` |
| 5. Return | **Orders:** `/consent/pending?…&approved=1&token=<id>`, then a client POST to `/api/paypal/orders/{id}/capture`. **Subscriptions:** PayPal appends `subscription_id`, and the page redirects straight to the receipt |
| 6. The receipt | **Orders:** a *Keep a record of this payment* link — a third press. **Subscriptions:** the redirect lands on it |

So a one-time purchase costs **three presses and one departure**, and a subscription costs **two presses and one departure**, for a decision the page already explained.

### What "approved" means for each shape

- **One-time:** the order is `CREATED`, the payer approves at PayPal, and money moves only when our server captures. Capture can answer `COMPLETED`, `PENDING` (an eCheque, a review) or `ALREADY_CAPTURED`, and the screen already distinguishes all three (`app/api/paypal/orders/[id]/capture/route.ts`).
- **Repeating and instalments:** both are PayPal **subscriptions** created `APPROVAL_PENDING` with the plan's id, and **never captured** — capturing a subscription would charge one period and call it the term. The plan is created by `ensurePlan` under a deterministic id (`P-DEMO-<SLUG>`), and its cycle count is the same number the figures print.
- **Returning from a subscription approval verifies nothing.** `app/consent/[orderId]/page.tsx` redirects on the presence of `subscription_id`; the receipt then reads the subscription from PayPal and refuses to show figures unless `isSettled(status)`. An approval PayPal has not yet activated therefore lands on *Nothing has been taken yet*. Honest, and a dead end until the shopper reloads.

### What the SDK offers, verified 2026-11-12

| Fact | Where |
|---|---|
| `@paypal/react-paypal-js` is at **10.6.1**, peer deps `react ^16.8 \|\| ^17 \|\| ^18 \|\| ^19` — this project's React 19 is supported | `npm view @paypal/react-paypal-js version peerDependencies` |
| `PayPalButtons` takes `createOrder` **or** `createSubscription`. `createSubscription` is `() => Promise<{ subscriptionId: string }>` — **our own route can create the subscription and hand PayPal its id**, so the plan and the amount agreement stay server-side. A static `subscriptionId` is the alternative. | the SDK's README |
| A second surface exists — `usePayPalSubscriptionPaymentSession` — for a custom button over the same session. | the SDK's README |
| PayPal's official Next.js guide is written for **Next 16 + their server SDK**; this project calls PayPal's REST API directly and would take the guide's client boundary only. | `developer.paypal.com/guides/nextjs-checkout` |

The important thing in that table is the second row. The subscription does **not** have to be created in the browser: the button's job can be to *approve* an agreement our server made, which is exactly the shape the product already has.

### What this would cost the money screen

- **A third-party script, for the first time.** `next.config.ts` sets no headers and the repo loads no third-party JavaScript. Everything else — Channel3, PayPal's REST API — is fetched by our server. The button puts PayPal's origin in the page that asks for money.
- **A third-party interface, for the first time.** The product's screens answer to the reader: a text-size control, a pacing control, read-aloud, sentences instead of tables. PayPal's button renders inside its own DOM and answers to none of those. This is the sharpest tension in the whole item, and the audit's ranking does not weigh it.
- **The audience is not the one on fast connections with the newest hardware.** A 200 KB-ish script is not free on the connections this product was built for, and a blocked script is a money screen with no way to pay on it.

### Who this is for

Adults with dyscalculia, ADHD and dyslexia, deciding about commitments they may be paying for months. They need the button to be recognisable — which argues for PayPal's own — and they need the screen to be legible and controllable, which argues against handing the decisive control to a third party.

## Goals

1. The shopper can approve the payment **on this product's own screen**, without leaving it to find the button.
2. What is approved is the thing the figures promised: the same amount, the same plan, the same cycle count.
3. Every state the button can be in has a sentence, and **none of them claims money moved** until PayPal says it did.
4. The screen's own work survives: the figures keep their sources and their arithmetic, and the optional recognition check still leads somewhere a reader can follow.
5. The browser may request; it may not decide. Plan creation, the amount agreement and the capture stay server-side.

## Non-Goals

- **Not a redesign of the consent screen.** The figures, the copy, the breakdown and the read-aloud are not in scope; the payment control is.
- **Not a new payment capability.** No vaulting, no stored methods, no wallets, no credit lines, no installments product other than the plan this product already sells.
- **Not the removal of server-side creation.** The order and the subscription continue to be created by our routes, so the amount agreement check (PayPal's figure against ours) still gates the money.
- **Not the invoice or pay-by-link doors.** The bill door stays a link, because there is no session to host.
- **Not PayPal's branding as our own.** No imitation button, no restyled PayPal mark.
- **Not the receipt.** Where the shopper lands afterwards is a question, not a deliverable.

## Constraints

- **The deadline is today**, and the video is unrecorded. This item touches the one path where a wrong state is worst, so whatever is built must be revertible by one commit.
- **It is the repo's first vendor client SDK.** Every PayPal call today is a raw REST request in `lib/paypal/`. That is a deliberate habit, and the reason for breaking it must be written down.
- **jsdom cannot run the SDK.** Whatever tests exist must assert *our* half — the routes, the states, the sentences — and the untestable surface has to stay as small as possible.
- **The three shapes are approved differently** (capture versus approval), and one control has to be honest about both.
- **Sandbox only.** No live credentials, and the sandbox's quirks are the environment the demo runs in.
- **Money is integer minor units**, and every figure on this screen already has a source rule (IPD 18, IPD 19, ITD 17). A second party rendering a number does not exempt it.
- **The product promises nothing is stored.** Where a session id or an approval lives during the flow is part of that promise.

## Assumptions

- Judges and shoppers recognise PayPal's own button as the genuine integration in a way a link cannot be recognised. This is the audit's claim; it is plausible and unmeasured.
- The SDK's approval surface works in the sandbox for all three shapes this product sells — a plan with `total_cycles` included.
- PayPal's button can be told which amount to display, or displays the order's own amount, which is the one our figures already agree with.
- A shorter path is better for this audience: every product decision so far has preferred fewer presses and fewer decisions at the money screen (IPD 29).
- The redirect can be kept as an escape hatch without weakening the in-page path — that is a decision, not yet a fact.

## Problem Tree

```text
├── Q1. What does the shopper's path become, and where does the record come from?
│   ├── Does PayPal's button replace the primary button, sit beside it, or open a second step?
│   ├── What is on screen between the press and PayPal opening?
│   └── After approval, who lands the shopper on the receipt, and with what?
│
├── Q2. Which purchases can be approved in place, when the three shapes settle differently?
│   ├── One-time captures; repeating and financed plans only approve. Can one control do both?
│   ├── Where does the plan id come from, when the plan must exist before the button renders?
│   └── What is said when approval returns but PayPal has not reported the agreement ACTIVE?
│
├── Q3. What happens to this screen's own work when PayPal's interface is on it?
│   ├── The optional recognition check: does "yes" still lead somewhere a reader can follow?
│   ├── Which numbers does PayPal render, and must they agree with the ones we printed?
│   └── Loading, blocked, or no JavaScript: what stands where the button should be?
│
├── Q4. What is stated when the payment does not happen, and what may be claimed about how it did?
│   ├── Declined, cancelled, half-finished, pending — the sentences and who owns each state
│   ├── Does the redirect survive as the fallback, and how is it offered without confusing the first path?
│   └── May the receipt say the payment was approved here, and does that change what it claims?
│
└── Q5. What does the button cost, and what can be proven before it is claimed to work?
    ├── What a third-party script and a third-party control add to the screen that asks for money
    ├── What a test can assert about a control it cannot render
    └── What must be demonstrated live, in the sandbox, before this is called built
```

## Decisions

| # | Question | Document |
|---|---|---|
| IPD 47 | Q1 — the path becomes one press, with PayPal's own button in the slot the primary button occupied | [`ipds/the-button-where-the-link-stood.md`](ipds/the-button-where-the-link-stood.md) |
| IPD 48 | Q2 — all three shapes are approved in place, one control, and a sentence in our words says what approval does | [`ipds/all-three-shapes.md`](ipds/all-three-shapes.md) |
| IPD 49 | Q3 — the check stays optional and its acknowledgement stays true; focus moves only where it can | [`ipds/the-check-keeps-its-promise.md`](ipds/the-check-keeps-its-promise.md) |
| IPD 50 | Q4 — a sentence per state, and the link returns only when the script cannot load | [`ipds/when-the-button-cannot-appear.md`](ipds/when-the-button-cannot-appear.md) |
| ITD 39 | Q2, Q5 — the callbacks call the existing routes, only the client id reaches the browser, and approval is verified by the receipt reading PayPal again | [`itds/the-subscription-our-route-makes.md`](itds/the-subscription-our-route-makes.md) |
| ITD 40 | Q1, Q3, Q5 — one client component owns the provider and the button, loaded after the figures; the suite stubs that one module | [`itds/the-script-behind-the-screen.md`](itds/the-script-behind-the-screen.md) |

Two children of the tree are answered inside these documents rather than given decisions of their own. *Which numbers PayPal renders* is settled by IPD 48: the button's label is PayPal's, so the amount is stated in the sentence above it, in the product's own words and from the same source as the figures. *What must be demonstrated live* is settled by ITD 40's notes: a blocked script, a preparing script and a real approval, each recorded when it runs.

Q5's cost question is answered as a rejection in IPD 47's tradeoffs — the third-party script is accepted as the price of a recognisable act, and the interface's inability to answer to the reader's settings is written down rather than mitigated.

## Open Questions

Answered by the decisions above, kept here because the answer is where the record of the question should be:

- **Does the product want a third-party interface at the moment of decision at all?** Yes — IPD 47, with the cost written into its tradeoffs rather than argued away.
- **What happens to `?approved=1`?** It stays. IPD 50 keeps the fallback link, and ITD 39 leaves both routes and their return URLs unchanged.

Still open, and each one can change an implementation without changing a decision:

- **Is `createSubscription`'s hand-our-own-id shape stable in the sandbox?** It is documented and it is the basis of ITD 39; it has not been tried here. If it fails, the fallback is Option 3 of ITD 39 — creating the subscription in the browser — which moves the plan out of our routes and should force ITD 39 to be rewritten rather than quietly bent.
- **What does the button display?** If it prints an amount, that is a figure on a screen whose every figure is sourced. IPD 48 puts the amount in the sentence above it, so the screen is correct either way — but whether two amounts are visible at once has to be looked at.
- **How long does `ACTIVE` take after approval in sandbox?** Nothing waits for it; the receipt says *Nothing has been taken yet* until PayPal reports the agreement settled. Whether that is a moment or a minute decides whether the screen needs a sentence about waiting.
- **Is this worth the hours, before the video exists?** The queue's own instruction is that nothing beats the video, and this is the largest item left. The decisions do not answer it; the owner does.
