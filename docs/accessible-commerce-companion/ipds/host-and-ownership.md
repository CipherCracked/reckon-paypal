# IPD 6 — Host and Ownership

**Status:** Proposed
**Date:** 2026-11-07
**Answers:** Problem tree question Q2 (rev. 3) — *Whose tool is this, and who has a reason to show it?*

---

## Problem to solve

Every other decision document assumes the companion runs inside a checkout somebody else owns. No
document decided that. ITD 3 chose a demo store we control for reasons of inspectability, which is
an argument about building, not about deploying.

The gap matters because the screen may talk a shopper out of a sale. A merchant hosting it pays for
the privilege of losing conversions, and nothing in the product compensates them for it. If no actor
has a reason to show the screen, the product is a demonstration of an idea rather than a product,
however well it is built.

So: who is present at the moment of consent *and* has a reason to want the shopper to understand?

## What the evidence says

- **No legal duty exists to translate a commitment.** Price-transparency law (EU Omnibus, unit
  pricing) governs *price claims* — fake reductions, headline prices, drip fees — not the
  across-term or exit cost of a commitment. There is no compliance reason for a merchant to show it.
  — https://www.benamic.com/blog/eu-omnibus-directive
- **There is a weak merchant incentive, but it is real.** Processing a return costs roughly $26.50
  per $100 of merchandise, and returns are growing faster than online sales; a screen that prevents
  a misjudged commitment can reduce both returns and complaints.
  — https://www.bloomreach.com/en/blog/e-commerce-returns
- **The platform is already in the space, after the fact.** PayPal's own app lets shoppers link and
  manage subscriptions, update payment methods and track payments — which is the post-purchase
  surface IPD 2 does not cover. — https://www.paypal.com/us/digital-wallet/manage-money/manage-subscriptions
- **Everything that intervenes today intervenes late.** Subscription monitors and cancellation
  services (Rocket Money: 5M+ users, $500M cancelled) all work from bank feeds, after money has
  moved. No consumer-side product was found that intervenes before authorisation.
  — https://greenlight.com/learning-center/reviews/rocket-money-review
- **Regulation moved the wrong way in the US.** The FTC's click-to-cancel rule was vacated in July
  2025, so "make leaving as easy as joining" is no longer a federal obligation — leaving is a market
  gap, not a compliance one. — https://www.crowell.com/en/insights/client-alerts/clicking-all-the-right-boxes-ftc-moves-to-revive-click-to-cancel-rule-following-eighth-circuit-vacatur

## Options

### **Option 1 — The payment platform, at its own approval step**

The translation appears where the payer already authorises the payment — inside the PayPal approval
flow, or in the payer's PayPal surface — rather than on the merchant's page.

### Option 2 — The merchant's checkout

The screen lives in the merchant's own flow, deployed by the merchant, as the current demo does.

### Option 3 — The payer's side, as a tool they arrive with

A browser extension or wallet-side companion that reads the checkout the shopper is already on.

### Option 4 — After the fact, from statements and bank feeds

The companion explains what was already committed, alongside existing subscription monitors.

---

## Reasoning

**Option 1 is the only place where the three conditions hold at once.** The platform is present at
every merchant's checkout, so it does not need each merchant's cooperation; it already holds the
authoritative terms of the transaction, which is what makes every figure attributable (IPD 4); and
it is the only actor whose incentive can survive the screen, because its revenue is not this one
sale. It is also where the post-purchase half of the problem already lives, which means consent and
renewal can be one continuous relationship rather than two disconnected products.

**Option 2 is not a business, but it is a demonstration.** A merchant willing to host this is
either regulated into it, unusually principled, or losing money. That does not make the screen
worthless — it makes it an illustration of what the platform could do at scale.

**Option 3 fails on the one thing that matters.** An extension must read totals it cannot verify
from pages it does not own, which is the exact failure the product exists to prevent: a figure the
shopper cannot trace back to an authoritative source. Its permissions also make it the most
frightening thing a person with a cognitive disability could be asked to install.

**Option 4 is already occupied** by tools with a five-year head start, and it treats the harm after
the decision instead of at it.

## Decision

**The companion belongs to the payment platform, at the moment the payer authorises the payment.
The merchant store is the demonstration vehicle for this submission, not the business model, and the
product says so.**

Two consequences follow and are accepted:

1. **The demo cannot be the real thing.** A hosted checkout of our own is the closest honest
   stand-in. The app states plainly that in production this screen belongs on the platform's
   authorisation step — one line in the interface and one in the README, not a footnote.
2. **The merchant-side framing is dropped from the pitch.** The product is not sold to merchants;
   it is what a payment platform owes the person paying.

## Tradeoffs

- **Unproven with the actual owner.** No conversation with PayPal has happened; the argument is
  structural, not endorsed. If the platform's incentive is conversion above all, the screen never
  ships, and the honest answer is that this needs regulation to exist at all.
- **Terms may not travel.** A platform sees the transaction, not necessarily the merchant's
  cancellation clause, so the exit figure — the most valuable one — may be unavailable more often
  than in a merchant-hosted version.
- **Demonstration risk.** A judge may read a store we built as the product, and the "this belongs on
  the platform" argument as an excuse. The demo must therefore make the platform argument in the
  flow itself, not only in the write-up.

## Notes

- This supersedes the implicit assumption in ITD 3. That ITD remains the decision about what to
  *build* for the demonstration; this IPD is the decision about who the product is *for*.
- Out of scope: negotiating with PayPal, building inside PayPal's own surfaces, or any integration
  that requires the platform's cooperation.
- Revisit if the payer-side option can ever verify a total against an authoritative source without
  the merchant's involvement.

---

**Revision — 2026-11-07: what "on the platform's approval step" can and cannot mean today.**

The decision above is a statement about where the screen *belongs*, not a claim that it can be
deployed there now. Checked against PayPal's current surfaces (developer.paypal.com hosted-checkout
configuration; paypal.com business checkout comparison, 2026-11-07):

- **A third party cannot add UI to PayPal's approval page.** What a merchant can change there is
  branding — logo, colours, layout of the hosted template — configured in their own account. There
  is no extension point for a translated commitment, and no API that injects a review step.
- **The closest shippable version of the thesis is the merchant's last screen before the hand-off**,
  which is what the demo build already is: figures, then PayPal's approval, then the return.
- **The platform version is a product proposal to PayPal**, not an integration we can perform. That
  is consistent with the tradeoff recorded above — this needs the platform to decide, or regulation
  to compel — but it must be said that way rather than implied as a deployment choice.

**Consequence for the copy.** The consent screen should say where the check belongs, not that it is
running there: it now reads "this check belongs on the payment provider's approval step — PayPal's,
before you authorise the payment". No claim of endorsement, no claim of modifying PayPal's checkout,
and nothing in the demo that a judge could read as a screenshot of someone else's product.

**Consequence for the pitch.** The honest claim is: *this is what a payment provider could show,
at the one moment it already owns, and here is the screen working with real PayPal orders.* The
weaker claim — *we built this into PayPal* — is false and would be caught.
