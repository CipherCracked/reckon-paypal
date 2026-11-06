# IPD — Trust and Agency

**Status:** Proposed
**Date:** 2026-11-05
**Answers:** Problem tree root question 5 — *How does the product earn trust and preserve agency?*

---

## Problem to solve

The companion sits at the moment of payment and asks the shopper to believe a number. IPD 2 recorded the risk plainly: the product must be more trustworthy than the page it explains, or it adds doubt to the step it exists to clarify.

Trust here cannot come from tone or confidence. The product is fallible — it reads copy it did not write, on pages that vary, and it can be wrong. The decision is what the product does about its own fallibility, and what it asks of the shopper in return.

Three child questions follow from that: what the shopper must disclose, how the product avoids speaking down to them, and what happens when a translation fails.

---

## Options

### **Option 1 — A labelled aid that shows its source**

Every figure the companion states is attributed to the PayPal order it came from. When it cannot read a product description or a set of terms, it says so and shows the raw charge rather than offering a guess. It asks nothing about the person — no profile, no diagnosis, no history, no account. It makes no recommendation.

The shopper sees a total they can trace, and keeps the decision.

### Option 2 — A confident authority

One clean number, presented without attribution or stated limits. The interface is calmer and the product appears more capable, until it is wrong — at which point the shopper has no way to tell, and no way to check.

### Option 3 — A second opinion

The total arrives with a judgement attached: this looks correct, or this is worth checking. The shopper is asked to trust the companion's assessment of its own work, which is the least verifiable thing it can offer.

### Option 4 — A guardian

The companion remembers past purchases, builds a profile, and intervenes based on the shopper's history. It can catch patterns a single order cannot show, and it requires the shopper to disclose their condition and their spending to a system in exchange.

---

## Reasoning

Trust has to rest on something the shopper can check. Attribution does that: the amount comes from the order PayPal will charge, and the shopper can see that is where it came from. Confidence and judgement cannot be checked, so they borrow credibility the product has not earned.

The same logic settles what the product asks for. Everything needed to state a total is already in the order. A profile, a diagnosis, and a purchase history are not needed to translate a payment, so the product collects none of them — which also means there is nothing sensitive to lose, and nothing that marks the shopper as different when they use it.

Agency follows from the same restraint. The companion explains; it does not advise, score, or remember. A shopper who reads the true total and proceeds has done exactly what the product is for.

---

## Tradeoffs

Showing the source adds visual load to the busiest screen in the flow, and stating limits can make the product appear less capable than a competitor that simply asserts a number.

Collecting nothing means the product cannot improve across sessions, cannot personalise, and cannot catch a shopper repeating a harmful pattern. That capability is given up deliberately.

---

## Notes

- **When the product is wrong.** It states that it could not read the charge and shows the raw amount. It never substitutes a guess for a figure it could not verify.
- **Tone.** Plain language without childishness. The product never explains dyscalculia back to the shopper and never characterises their arithmetic as an error.
- **Caregivers.** Out of scope. A shared view changes who the product is for and doubles the interaction surface; it is a later product, not a feature of this one.
- **Data.** The order is held for the session and not retained beyond it.
- **Universal design is the required consequence.** Because the product stores no diagnosis, adaptation cannot depend on one. A single rendering has to serve the primary user and lower load for others without being told who they are. IPD 5 records that scope.
