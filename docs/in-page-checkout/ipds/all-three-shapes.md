# IPD 48 — All Three Shapes Are Approved in Place, and Each Says What Approval Means

**Status:** Decided (2026-11-12)
**Date:** 2026-11-12
**Answers:** Problem tree Q2 of `../intro.md` — *which purchases can be approved in place, when the three shapes settle differently?*
**Serves:** IPD 47, which put the button where the link stood; IPD 45, which made the record state what PayPal has taken; ITD 17, which made the figures PayPal's.

---

## Problem to solve

The product sells three shapes and PayPal settles two of them differently. A **one-time** purchase is an order: the payer approves, and money moves only when our server captures — and capture can answer `COMPLETED`, `PENDING` or `ALREADY_CAPTURED`. A **repeating** term and a **financed** purchase are both subscriptions: created `APPROVAL_PENDING` against a plan, approved by the payer, and **never captured**, because capturing a subscription would charge one period and call it the term.

Today one primary button covers all three, with the label changing to match: *Pay now*, *Approve subscription with PayPal*, *Approve payment plan with PayPal*. Its branch is by shape, and it is the reason the screen can say one thing and PayPal can do another without contradiction.

PayPal's button, however, is not shape-neutral. Its one-time button creates and captures an order; its subscription button creates and approves a subscription. They are different components with different callbacks, and a screen that picks the wrong one is a screen that charges one month of a twelve-month agreement. So the in-page path has to choose, per purchase, and then say — in the product's words, above a control whose label is now someone else's — what pressing it does.

The stakes are asymmetric. If the one-time path keeps the old link, the recognisable control is absent from the simplest purchase. If the subscription path keeps it, the control is absent from the *only* purchase this product is really about — and from every screen the demo opens.

## Options

### Option 1 — **One control for all three shapes; the sentence above it says what approval does**

The screen renders PayPal's one-time button or its subscription button according to the shape the terms resolve to — the same choice the current button already makes. Above it, one sentence in the product's own words states the act: *PayPal will charge $24.99 today* or *PayPal will charge $24.99 today and again monthly for six months — approving this starts the plan; the money moves on PayPal's schedule.*

*How it feels:* whatever the shopper is buying, the control that takes the money is the same object, in the same place, and the sentence above it says what it will do in words the shopper can check against the figures. A one-time purchase stops looking less legitimate than a subscription, and a subscription stops being the shape that gets the link.

### Option 2 — In-page for one-time purchases; subscriptions keep the link

The simple path gets the button; the twelve-month agreement keeps the two-press redirect.

*How it feels:* the path this product is least about gets the good control, and the commitment with the longest consequence gets the one that looks like an outbound link. It also splits the code: two payment paths, one of them surviving only for the shape that matters most.

### Option 3 — In-page for subscriptions; one-time purchases keep the link

The flagship gets the button; a single payment keeps the redirect.

*How it feels:* the demo looks right and the product is inconsistent — the same shopper, buying two things from the same shop in one visit, meets two different checkouts, one of which says *PayPal* and one of which is a link. And the one-time path is the simpler of the two to host, so the inconsistency buys nothing.

### Option 4 — One control that always creates an order, and subscriptions are started after capture

A single one-time button for everything; once the capture succeeds, a subscription is created for the remaining term.

*How it feels:* the shopper approves what they think is a subscription and the first month is captured as a one-off payment; the plan begins afterwards, from a screen that cannot show it. This is the defect the current code branches *against* — capturing a plan charges one period and calls it the term — and it would put a number on the screen that neither PayPal nor the seller agreed to.

### Option 5 — Two controls on the screen, one per shape, both shown

The shopper is offered the one-time button and the subscription button and picks.

*How it feels:* the screen asks the shopper to make a payment-mechanics decision the terms already made. Two buttons that look alike and behave differently, on the one screen where choosing wrongly costs money — the opposite of every decision in this product about what a shopper should be asked to decide.

## Reasoning

The deciding factor is **which shape the product exists for**. This is a product about commitments that run: the twelve-month term, the financed plan, the subscription that renews. Any option that leaves the link on the recurring path leaves the link on the flagship, and every demonstration of this product opens on that path. Option 2 is therefore rejected on the product's own terms even though it is the smaller change.

The second factor is **consistency of the checkout**. Options 2 and 3 give one shop two checkouts, and the difference between them would be invisible until the shopper reached it. A shopper who has learned that this shop's commitment screen ends in PayPal's button should not meet a link because they chose a different shape from the same listing. Option 1 is the only one where the control is a property of the screen rather than of the purchase.

The third is **what approval means**, which is the thing the label used to carry. Under Option 1 the meaning moves into a sentence the product writes, above a control it does not: for a one-time purchase the money moves on capture, today; for a subscription approval starts the plan and the money moves on PayPal's own schedule, one period at a time. That is also the sentence that keeps *Approved* from being read as *everything has been charged* — a distinction the receipt then closes with *Taken so far* (IPD 45).

Options 4 and 5 are rejected because they change what the shopper agreed to, one by charging it as something else and the other by asking the shopper to decide it.

## Tradeoffs

- **One control, two meanings.** Because the same object does two different things, the difference lives entirely in the sentence above it. A shopper who reads only the button will believe a subscription charges the whole term today — the receipt's *Taken so far* line and the cancelled notice are the screen's only chance to correct that, and they arrive after the money.
- **The sentence is longer on a subscription.** The one-time sentence is the amount and the day. The subscription sentence has to mention the term, the cadence and the fact that PayPal charges it — which is more words immediately above a button, on a screen this product has spent trees shortening.
- **Two components to keep true.** The one-time and subscription buttons have different props and callbacks, and the shape graph that chooses between them is now load-bearing on the money path. A shape that resolves wrongly renders the wrong button rather than no button.
- **The financed plan shares the subscription path.** It is a PayPal subscription with a cycle count and an opening fee, so it inherits the subscription sentence — which has to be written so it is true for a twelve-month instalment plan as well as a monthly box.

## Notes

- The branch is the same one the primary button makes today (`components/ConsentScreen.tsx:175-232`): `recurring` and `financed` are subscriptions; `one_time` is an order. It moves from the click handler into the render, because the button has to exist before it is pressed.
- PayPal's subscription button declares `components: ["paypal-subscriptions"]` on the provider; the one-time button needs the payments component. The provider is given the array the shape needs (ITD 40).
- The sentence above the button is new copy and it is a figure-bearing sentence: the amount is already on screen and the sentence restates it. It goes through the same money formatting as every other figure (ITD 2), never a literal.
- For a subscription, `onApprove` is not a payment. The receipt already refuses to show figures unless PayPal reports the agreement settled, so the landing after approval is honest by construction (ITD 39).
- *Approved* and *charged* stay separate words everywhere on this path, as they already are at the capture route.
