# IPD 40 — What the Screen Says Now That Any Listing Might Be a Subscription

**Status:** Decided (2026-11-12)
**Date:** 2026-11-12
**Answers:** Problem tree Q5 of `../intro.md` — *what changes for a shopper once any listing might be a subscription?*
**Serves:** R1 in `todo.md` §19; IPD 37 (the merchant's term decides), IPD 38 (which terms become a schedule), IPD 39 (the wait); IPD 35 and IPD 36 (what the shop's card says).

---

## Problem to solve

The product currently has two things to say about a listing: a subscription's three figures, or one-time purchase with *"Paid once, so there is nothing to cancel"* (`lib/market/channel3.ts:123–124`). Both were written when the app knew a listing's shape before it opened the listing. Once the shape is read (IPD 37), that sentence is no longer always true — and worse, it is sometimes true for reasons nobody checked.

The reader can now establish five different things about a catalogue listing, and they are not interchangeable:

1. the listing states a term this page can schedule;
2. the listing states a term this page cannot schedule (quarterly, annually, in years);
3. the listing states a cadence and no end — *monthly, cancel anytime*;
4. the listing states a price and no term and no cadence;
5. the listing's words could not be read at all.

Today, four of those five print *"Paid once, so there is nothing to cancel"*. The sentence that matters most on the page is the one least tied to evidence. And the same question reaches the rest of the product: the consent route creates a plan from the terms it resolved, the receipt rebuilds figures, and the shop's card makes a claim with its price.

## Options

### Option 1 — **One sentence per fact, and only the two known shapes can be agreed to**

Each of the five findings gets its own words, in the place the three figures go:

- **Schedulable term** — the figures, the merchant's quoted sentence under the total, the button that starts agreeing. This is the treatment the four curated listings already get, applied to any listing that earns it.
- **Unschedulable term** — the merchant's sentence, the price charged today, and *this listing says it bills every three months; it does not say for how long, so there is no total here*. No term figure. No button.
- **Cadence, no end** — *this listing repeats every month for as long as you keep it. Nothing here says when it stops, so there is no total.* Charged today is the price. No button.
- **No term, no cadence** — a one-time purchase, with the figures and the existing sentence, now earned: the page's own reading found no term and no cadence, and the excerpt proves it by being empty.
- **Could not be read** — no statement about shape at all: *we could not read the seller's words just now, so this page cannot say what agreeing to it would cost*, a way to try again, and no button.

*How it feels:* every listing opens on a sentence that names what was found. Most catalogue listings are still one-time purchases, and the one-time sentence is now a finding rather than a default. A quarterly box tells the shopper what it is and declines to total it. A listing the model failed on says so and offers to try again rather than quietly selling as a single payment.

### Option 2 — Keep two states: one-time, or subscription

Leave the vocabulary as it is and let every not-schedulable finding fall through to *one-time purchase*. Less work, fewer sentences, and the product keeps a page that is always the same shape.

*How it feels:* a monthly subscription with no stated term opens as *"Paid once, so there is nothing to cancel"* — the exact sentence the owner called shoddy, now printed by a page that had just read the sentence contradicting it.

### Option 3 — Show one-time by default, and correct the page when the reading lands

Render the fast, wrong answer first; when the term arrives, swap the figures and the sentence.

*How it feels:* the page tells a shopper *nothing to cancel* and then changes its mind. For this audience that is the worst possible sequence, and a screenshot taken in between records the product lying.

### Option 4 — Mark the shape on every shop card too

A badge on each tile: *subscription*, *one-time*. The shopper would see the catalogue's shapes before opening anything.

*How it feels:* thirty tiles become thirty model calls and half an hour of waiting for a page that answers in a second today. It is the shelf in disguise, and it is refused for the same reason.

## Reasoning

The deciding factor is that **a sentence about the shape is a figure in words**, and this product's rule for figures is that each one carries its evidence or carries nothing. *"Paid once, so there is nothing to cancel"* is only true if someone looked: a listing that repeats monthly and says so is not paid once, and a listing whose words were never read is not a one-time purchase either. Option 1 is the only treatment where the sentence is a report of the reading, and where the reader can see the reading's result — the quotation sits under the total, and the one-time sentence appears with no quotation under it because there was no sentence to quote.

The second factor is **what a person can do next**. The button exists to begin agreeing, and agreeing means the figures become a PayPal plan. If the page cannot compute a total, the plan it would create is a plan the shopper was never shown — so Options 1's two refusals are not caution, they are the only version where the consent screen and the plan agree. Offering *continue* on an unread listing makes the product's figures optional, and a checkout whose figures are optional is a checkout with extra steps.

The third factor is the **shop's card**, which stays as IPD 35 left it: a picture, a brand, a title, a price. The card is read thirty times a page and the reading is the slowest thing in the app; a badge would either be a guess (Option 2's dishonesty, repeated per tile) or thirty model calls. The shop tells the truth about what it knows, which is what the catalogue states, and the product page tells the truth about what it read.

## Tradeoffs

- **Two of the five states are dead ends.** A quarterly box and a monthly-forever box cannot be agreed to here, and those are extremely common products. They will open, be described accurately, and offer the shopper nothing — which is a worse experience than a wrong total and a better one than an invented one.
- **The page grows a vocabulary of absences.** Four sentences where there were two, and the audience this product serves pays for every sentence it has to consider. They are kept apart because each one answers a different question a shopper asks — *is this a subscription?*, *how long?*, *what if I stop?* — and merging any two makes one of the answers false.
- **An unread listing is unsellable while the model is down.** The shop stays browsable; the commitment does not start. On a free endpoint that has already been measured flaky, that is a real risk to a live demo, and it is the price of not selling an unread listing.
- **The one-time sentence loses its aside.** *"A return is a different question, and this listing does not state its terms"* was carrying a fact the reading does not check. It moves out of the figure's note and into the page's standing line, or it goes.

## Notes

- **A record is not a re-reading.** The receipt rebuilds a subscription's schedule from the PayPal plan created at consent, not from the catalogue (`app/receipt/[orderId]/page.tsx:170`), so a cold cache cannot turn a record's schedule into an absence. What the receipt still reads is the cost to leave, and a listing the model cannot read leaves that figure *not stated* — the behaviour it already has (`:147`).
- **The consent route needs its own sentence** for a listing whose reading is not there yet: not a 500, not a one-time reading. It is the same class of failure as IPD 26's *could not look*.
- **The subscriptions shelf stays unbuilt, for a changed reason.** IPD 33 deferred it because the shop could not tell a subscription from a one-time purchase. It now could — at one model call per tile, which is half an hour for a page. A shelf built later has to be built on something other than reading every card, and that is its own decision.
- **The entry does not change.** It opens on a fixture listing whose reading is warmed at start (ITD 34), so the front door's shape is unchanged by this decision.
