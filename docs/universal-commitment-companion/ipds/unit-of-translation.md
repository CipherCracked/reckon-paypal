# IPD 11 — The Unit, and How Far It Reaches

**Status:** Proposed
**Date:** 2026-11-07
**Answers:** Problem tree Q1 of `../intro.md` — *what is the unit at its widest, and where does widening stop being the same problem?*
**Builds on:** IPD 2 (intervention at consent), IPD 6 (host and ownership), IPD 9 (accountability).

---

## Problem to solve

The product today is a page inside a store we built, selling three products we invented. Every claim
it makes about helping someone rests on that page being the place where their commitment happens. It
is not. Nobody's real commitment begins at a demo store they were sent a link to.

The user's instruction is precise and it is a tension, not a direction: **make it work for everyone,
and keep it specialised for the people it was built for.** Two ways to fail that. Widen until it is a
generic "simplify this text" tool that is good for no one in particular, and the accessibility claim
becomes decoration. Or stay narrow, and the impact story stays a demo of a demo.

The research in `../intro.md` says where the *harm* actually is: unpaid bills, benefits letters,
insurance, BNPL delinquency — not shopping carts. LendingTree's 2026 tracker puts late BNPL payments
at 47% of users, up from 41% and 34% in the two prior years. Low numeracy is documented to impair
insurance and medical decisions specifically. If the product keeps selling headphones, it is arguing
against its own evidence.

So the question this IPD answers: **what exactly is being translated, and how many different kinds of
thing can arrive at it without the product turning into something else?**

---

## Options

### Option 1 — Stay a store checkout

The product remains the consent screen inside our demo store. Broadening happens in the audience
claim only: the same screen is said to suit any commitment, because it needs only the amount and the
terms.

*How it feels to the shopper:* exactly as today — three products, one payment path, a receipt.

### Option 2 — **Every commitment PayPal itself presents: an order, a subscription, a bill**

The screen is the same artefact, but it is no longer a checkout step — it is what appears whenever a
commitment is put to a person. Three real ways one arrives, all of them PayPal primitives:

1. **An order** — a one-time purchase (today's headphones).
2. **A subscription** — a recurring commitment with a renewal date (today's coffee).
3. **An invoice** — a bill owed by a date, sent through PayPal Invoicing, paid through a
   PayPal-hosted link (new: a clinic bill, a repair, a fee).

The shopper meets the same three figures — across the term, cost to leave, charged today — plus the
one a bill adds: when it is due. The store stops being the product and becomes one of three
demonstrations of it.

*How it feels to the shopper:* the check shows up wherever money is being asked for. The shop screen
is familiar; the bill screen says what is owed, when, and what happens if it isn't — in dollars, not
in fine print.

### Option 3 — Any money document

The shopper brings a bill, a contract, a benefits letter or an insurance schedule — uploaded, pasted
or linked — and the product extracts the terms, computes the figures, and states what it could not
read. The store becomes an optional payment step at the end.

*How it feels to the shopper:* one place for every money document they were ever confused by.

### Option 4 — A personal ledger of everything owed

The product collects all of a person's commitments into one view: what leaves the account this month,
what is locked in, what can be cancelled.

*How it feels to the shopper:* a single honest picture of what they are committed to.

---

## Reasoning

**Option 4 is the best product and is not available to us.** Every PayPal API we can authenticate
against is merchant-scoped — Transaction Search filters records "the merchant sells", Invoicing lists
the merchant's invoices. A third party cannot obtain a shopper's own transaction history through a
PayPal integration; Log in with PayPal returns identity scopes, not activity. The consumer-data right
that would have made this plausible — CFPB Section 1033 — was finalised in October 2024, enjoined by
a federal court in late 2025, and its first compliance date passed in April 2026 without effect; a
rewrite is still under review. Building on it in November 2026 would be building on a rule that is
not in force. This option also needs the one thing IPD 4 forbids, a store of a person's records. It
fails on capability before it fails on principle.

**Option 3 is the strongest story and the weakest demonstration.** It is what the evidence describes —
bills, insurance, benefits — and its reach is genuinely "everyone". But it moves the source of truth
from PayPal to a model reading an arbitrary document, which is the one place this product has refused
to trust a model. A figure that comes from a misread invoice is a wrong figure presented as the total,
and the fix (quote attribution for every extracted term) is the revision we deliberately deferred
because it is not a five-day job. It also risks the hackathon's own test: with the money arriving at
the end as a generic PayPal order, PayPal becomes the payment afterthought and a document summariser
becomes the product.

**Option 1 fails the instruction it was given.** It is what we have, and it is honest, but it cannot
say "everyone" without the sentence being a claim rather than a showing — the judging criterion is
impact *based on what is demonstrated*.

**Option 2 changes the unit without changing the source of truth.** All three shapes are commitments
in the same sense the product already defines: a stated amount, terms, and a way out. All three are
created and paid through PayPal by a merchant, so PayPal stays the authority for the money and the
model stays confined to wording. All three are demonstrable in a sandbox without a partner, a
merchant relationship, or an uploaded document. And the three are not decoration: the order is paid
now, the subscription is paid on a schedule, the invoice is owed by a date — which is exactly the
range of "what will this cost me, and when" that the target reader gets wrong.

**What makes it specialised rather than generic** is that the three disability profiles are served by
three different properties of the *same* artefact, not by three modes. The derived figures in dollars
with their arithmetic are the dyscalculia answer. The schedule — next charge, due date, what the
commitment totals by the time it ends — is the ADHD answer; the research on missed bills and
delinquency is a timing finding, not an arithmetic one. The medium — read-aloud, text size, one figure
at a time — is the dyslexia and low-literacy answer. One rendering carries all three, which is what
IPD 5 and IPD 10 already committed to, and it widens the evidence base without adding a single new
claim about effectiveness.

**The deciding factor is what can be shown on 12 November.** Option 2 adds one PayPal API and one
document type to a screen that already exists; the store, the money model, the figures, the guard,
the receipt and the comparison document are untouched. It turns "this fits any commitment" from a
sentence in a README into a second and third thing a viewer watches work.

## Decision

**Option 2**, with one condition: the invoice path must be working against the PayPal sandbox, not
mocked, before it enters the demo. If it is not working by the end of 9 November, the submission
shows the two surfaces that do work and the README says so — the claim shrinks to the evidence rather
than the evidence stretching to the claim.

## Tradeoffs

- **A bill is not a purchase**, and the product will now make claims about due dates that no order
  API provides. Every such figure must come from published terms or be "Not stated"; the invoice path
  is where that discipline gets tested for the first time.
- **Three surfaces are three ways to break.** The invoice flow is new code on the critical path of a
  build that currently passes 104 tests.
- **The word "everyone" still is not demonstrated.** Three surfaces prove *where* the check applies,
  not *who* benefits. That distinction has to stay visible in the video and the copy.
- **A bill adds a fourth quantity** — when it is due, and what happens if it is late. The current
  rendering has no place for it, and adding one changes what the comparison document must report.

## Notes

- Option 3 is not rejected forever. It is the right answer for a version that can afford quote
  attribution, and the honest way to say that now is "the check needs two things: the amount and the
  terms. Here are three places that supply them."
- What would change this decision: if the PayPal invoice sandbox cannot produce a payable link within
  a day, Option 3's payment-after-the-fact shape becomes the fallback, and the claim narrows to
  "any commitment you can pay with PayPal".
- Not decided here: whether the invoice surface gets its own entry point in the store, or the store
  becomes one of three tabs. That is a navigation question, and it belongs to the surface decision.
