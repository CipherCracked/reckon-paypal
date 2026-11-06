# IPD — Intervention Point

**Status:** Proposed (revised)
**Date:** 2026-11-05
**Answers:** Problem tree root question 2 — *Where in the purchase journey does the problem occur, and where should the product intervene?*

---

## Problem to solve

Dyscalculia fails wherever several numbers must be combined. In commerce that happens across the whole journey, but the decisions that carry consequence cluster at one point: the moment the shopper agrees to pay. Before it, nothing is committed. After it, the money has moved and the terms are fixed.

The question is what that moment contains. A payment is not always one number — it can be a charge today, a charge that repeats, or a charge spread across a term. The product has to decide which of those it serves, because each carries a different set of figures the shopper cannot derive.

---

## Options

### **Option 1 — The moment of consent, across every commitment shape**

The shopper arrives at the point of agreement. The product reads the commitment from PayPal's object and restates it: what is charged today, what the commitment costs across its term, and what it costs to leave. The same mechanism applies whether the payment is one-time, recurring, or financed.

### Option 2 — Checkout only, one-time purchases

The product handles a single charge at a single merchant. It is the narrowest version, and the one a checkout page most naturally supports.

### Option 3 — Before purchase, on the product page

The shopper meets a price while the decision is still open. The figures there are provisional — tax and shipping depend on address and method — so any number the product states can change before payment.

### Option 4 — After purchase, on statements and receipts

The product explains what was already charged. The shopper learns from a commitment they have made rather than one they are about to make.

---

## Reasoning

The moment of consent is where a number becomes an obligation, and it is the only point where PayPal holds the authoritative terms. Before it, figures are estimates. After it, the shopper has already agreed.

Covering every commitment shape is what makes the product meet the disability. The quantities dyscalculia makes hardest are the derived ones — a subscription's cost across a year, an instalment plan's total, the gap between a headline rate and what is actually paid. A one-time checkout carries the least of that work, so a product limited to it would serve the easiest case of the problem it names.

---

## Tradeoffs

Recurring and financed commitments do not share PayPal's object model with a one-time order, so the integration has more than one path and the interface has more than one shape. The mechanism stays constant; the rendering does not.

Consent is also late. The shopper has already chosen the item, so the product clarifies the obligation rather than the desire.

---

## Notes

- The boundary is consent. Monitoring commitments after the fact would require remembering them, which IPD 4 rules out.
- Whether PayPal exposes a financed/instalment path usable in sandbox is unverified and belongs to the ITD on integration.

---

## Revision — 2026-11-07: consent is necessary, and provably not sufficient

The reasoning above is unchanged and still correct on its own terms: consent is where a number
becomes an obligation and where PayPal holds the authoritative terms. This revision records what the
evidence adds, and it does not overturn the choice — it narrows its claim.

**What the evidence shows.** The measurable harm is not a single misunderstood price; it is the
commitment nobody looks at again. Consumers manage an average of **12 subscriptions** and **42% have
forgotten about one**; over 40% pay for "ghost" subscriptions at roughly **$200 a year**.
Every product that addresses this today — Rocket Money, with 5M+ users, is the largest — does so
**after the fact, from bank feeds**. None intervenes before authorisation.

Our tradeoff section already admitted consent is "late". The stronger statement is that consent is
the **right moment for comprehension and the wrong moment alone for harm**: a product that ends at
the payment has helped exactly once, and the damage accrues over the months that follow.

**What changes.** The intervention point is now *consent plus the commitment it creates*, not
consent alone. Consent remains where the product acts — it is the only point where our figures can
be attributed to an authoritative order — but it is no longer the boundary of the product's
responsibility. Anything the shopper needs later (a record of what was agreed, a renewal date, how to
leave) is in scope for the product even if it is not in scope for this build.

**What does not change.** No monitoring of a person across merchants, no account, no stored history:
the boundary in the Notes above is a consequence of IPD 4, and this revision does not relax it. The
question of how a commitment survives after payment *without* storing anything about the person is
carried forward as an open product question, not silently assumed away.

**Effect on the built app.** None yet. The app still ends at "payment complete", which this revision
now records as an unfinished edge rather than a design choice.
