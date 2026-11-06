# IPD 12 — The Front Door

**Status:** Proposed
**Date:** 2026-11-07
**Answers:** Problem tree Q3 of `../intro.md` — *where does it meet people, if not in our store?*
**Builds on:** IPD 11 (the unit is any commitment PayPal presents), IPD 6 (hosting).

---

## Problem to solve

The product now answers four kinds of arrival — a purchase, a subscription, a bill, and a document
the shopper brings — but it still has one door, and that door is a shop selling three invented
products. Someone opening the app sees a storefront. Nothing tells them the check exists, what it is
for, or that it applies to anything beyond the three things on the shelf.

This matters beyond navigation. The first screen is the first fifteen seconds of the video, and the
first sentence a judge reads. A storefront says "this is a demo shop with a clever consent screen". A
different first screen could say "this is what happens when money is asked of you" — which is the
actual product, and the thing that makes the accessibility claim legible to someone who is not
dyscalculic themselves.

The question: **what does a person see before they are asked to pay anything?**

---

## Options

### Option 1 — Keep the store as the front door

The catalogue stays the home page. Bills and documents are reached from a quiet link in the header.

*How it feels:* familiar; you shop, and the check appears when you are about to pay. Nothing suggests
the product is wider than the shop unless you go looking.

### Option 2 — **The question first: what are you being asked to pay?**

The home page states the promise in one sentence, then presents the four arrivals as four real
commitments — one to buy, one to renew, one to settle by a date, one you were sent — each labelled
in plain words: *a purchase*, *a subscription*, *a bill*, *a document you were sent*. Choosing one
takes you to that commitment's screen.

*How it feels:* the product introduces itself by the problem it solves, and the shop becomes one of
four examples rather than the whole thing.

### Option 3 — One box

A single input: paste a document, or a link, and the product works out what it is holding.

*How it feels:* a utility — direct, and entirely dependent on the reading path being excellent.

### Option 4 — No front door

The product is embedded wherever a payment happens; there is no home page at all, only screens that
appear inside a checkout, an invoice, a receipt.

*How it feels:* invisible infrastructure. Correct at scale, and unshowable in a three-minute video
without a partner.

---

## Reasoning

**Option 4 is the honest end state and cannot be demonstrated by one person in five days.** Every
argument that the check belongs beside the payment is already recorded in IPD 6; without a merchant,
a platform, or a partner, an embedded product has nothing to be embedded in.

**Option 3 makes the product depend on its weakest part.** The reading path is the stage that is
gated, the one that degrades to candidates, and the one where a misread document is the worst failure
available. Opening with it tells the viewer that this is a document tool that also does payments,
which is the inverse of what is true and what the hackathon requires.

**Option 1 is what exists, and it understates the work.** It is not wrong — a shopper does arrive at
a store, and the check appearing at the moment of payment is the core claim. But as a *first screen*
it answers "what is this?" with "a shop", and the four-way breadth the last decision bought becomes
invisible.

**Option 2 is the only front door that shows the claim instead of asserting it.** Four commitments on
one screen is the product's thesis in its own layout: the same three figures, in the same order, for
things that arrive in four different shapes. It also makes the accessibility argument visible to
someone who does not share the difficulty — a reader can see that a bill, a subscription and a
purchase are being answered identically, which is precisely what "works for everyone" means here.

**The cost is honest and specific.** A menu of four is a menu, and a demo that opens with a menu
looks like a demo. The mitigation is that the four are real commitments with real terms, not four
buttons to four toys — and that each is described by what it costs, in the same words the product
will use inside.

## Decision

**Option 2**, with three constraints:

1. **The sentence comes first.** One plain statement of what the product does, before any choice —
   in the same voice as the consent screen, no marketing adjectives.
2. **The four are commitments, not categories.** Each shows a real name, a real amount and its shape
   (*paid once*, *every month for 12 months*, *due 21 November*, *you were sent this*). The labels
   name what the shopper is being asked, not what the system calls it.
3. **The document door is quieter than the other three.** It is the experiment, not the product; it
   sits below them, is described as what it is (*a bill or letter you were sent*), and says it reads
   text, not files.

The store does not disappear: it becomes the place a purchase is chosen and paid, reached from the
first door like any other.

## Tradeoffs

- **A four-way home is the easiest screen in the product to over-design**, and the one a judge sees
  first. Everything on it must be a figure or a plain sentence; no illustration competes with the
  numbers.
- **The bill and document doors will sometimes lead to a dead end** — a missing payment link, an
  unreadable document — on the first thing a viewer clicks. The degraded states therefore have to be
  written to be shown, not hidden (ITD 12).
- **It frames the product as a tool the shopper opens**, when the recorded position (IPD 6) is that
  it belongs at the payment step. The home page is a demonstration affordance, and the README must
  keep saying so — otherwise the demo argues against the analysis.
- **Four doors imply four complete experiences.** The invoice path in particular is only complete if
  it can be paid, not merely read.

## Notes

- This does not change any screen behind the doors; it changes what a stranger meets first.
- If the invoice path fails the 9 November gate, the first door list loses its bill entry rather than
  showing a bill that cannot be paid.
- Whether the document door ships at all is decided by the same gate; a three-door home that is
  entirely real beats a four-door home with one door that apologises.
