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
