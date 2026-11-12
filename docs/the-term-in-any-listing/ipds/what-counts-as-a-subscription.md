# IPD 37 — What Makes a Listing a Subscription

**Status:** Decided (2026-11-12)
**Date:** 2026-11-12
**Answers:** Problem tree Q1 of `../intro.md` — *what makes a listing a subscription at all?*
**Serves:** R1 in `todo.md` §19 (*read the term from any listing, not four ids*); IPD 33, which refused a subscriptions shelf for want of exactly this.

---

## Problem to solve

Every screen of this product names the thing in front of it: a worked BARK commitment, a bill, a receipt, a basket. For any listing that is not one of four curated ids, the name it gives is a lie it never checked. `curatedTerm(listed.id)` misses, `marketTerms(offer)` runs, the shape is `one_time`, and the third figure prints *"Paid once, so there is nothing to cancel"* (`lib/market/channel3.ts:123–124`) — a sentence about the purchase, decided by a lookup table, before anyone read the purchase.

The reader that could read it exists and is used for the opposite figure: the cost to leave is read out of the seller's own prose by a model that may only copy spans, checked literally by the server (`lib/commitment/published-exit.ts`). The term has never been read the same way, because the four ids were believed to be the listings that had one.

The catalogue will not answer the question for us. Verified live on 2026-11-12: a product carries no cadence, term, renewal or subscription field; there is no subscription category (the genuine boxes sit under *Dog Supplies*, *Personal Care Gift Sets & Kits* and *Planners*); there is no structured attribute for it; and a category search for *subscription* returns razor blades and satellite TV. The only place a term exists is the merchant's own words.

Those words are not reliably about billing. One search for *subscription* returned books about the subscription business, a *1-Year Warranty*, a *Sony Protect Plus 3 Year*, a *2027 Cat in a Box Monthly Wall Calendar*, and tax forms — every one of them containing a period or a cadence word, none of them a schedule of payments. Meanwhile genuine boxes state their term in shapes no fixed rule covers: *"billed and shipped on a quarterly basis"*, *"every 90 days"*, *"Six Month"* spelled out, *"Seasonal"* with no period at all. One listing titled *"Seasonal Subscription Box"* states no term anywhere in its text.

So the question is not *how do we detect a subscription*. It is **what evidence is allowed to decide that a listing asks for a schedule**, and what the product says when that evidence is absent.

## Options

### Option 1 — **The merchant's stated term decides; a listing with no such statement is not a schedule**

The reader is asked for one more fact than it is asked for today: the span in which the listing says how long the plan runs. The model copies it, the server checks it literally against the title and description, and a parser reads a count and a period out of the verified span. When a span passes, the listing is a commitment and the screen shows its figures with the merchant's words beside them. When no span is offered, or the offered spans do not occur in the text, the listing states a price and no term — and the page says that, in those words.

*How it feels:* a person opens a BarkBox listing nobody curated and reads *Across the term — $149.94 · 6 payments of $24.99*, with *"6-Month Subscription"* under the figure, underlined as a quotation. A person opens a wall calendar and reads the price, one payment, and *the listing states a price, not a term* — and can see that no sentence was quoted, because there was none to quote.

### Option 2 — The words decide: a listing whose text says *subscription*, *monthly*, *plan* is a subscription

A keyword test over title and description. No model, no cache, no wait.

*How it feels:* the wall calendar whose title says *Monthly*, the warranty that says *3 Year*, and the book about subscription businesses all open with a term schedule, a term total and a cancel button. It is instant and it is wrong in both directions: the cheapest to build, the easiest to disbelieve.

### Option 3 — Ask the model whether the listing is a subscription

One field, `isSubscription: true/false`, or a confidence score. The model reads the whole description and answers.

*How it feels:* the answer is plausible and cannot be inspected. A false positive looks exactly like a true one — no sentence to show, no arithmetic to check, no way for the shopper or a judge to see where the judgement came from. It is the one pattern every other part of this product refuses, and it would be the first thing a careful reader distrusted.

### Option 4 — Keep the map, and grow it

The search that found six live subscriptions found them in one call. Curate thirty ids, or a hundred, with a person reading each listing and recording its span.

*How it feels:* exact for every listing in it, and unchanged for the catalogue's other tens of millions. It is the same decision as today with a longer list — an editorial act dressed as coverage, and the ceiling the owner named.

## Reasoning

The deciding factor is **what can be checked**. This product's whole claim is that every figure on the screen traces to words someone published and the server verified. A shape is not a lesser fact than a figure: calling a listing one-time when it is not is the error that costs the most, because *"nothing to cancel"* is the sentence a shopper acts on. Only Option 1 produces a shape that arrives as a span — something the server can confirm exists and the screen can print under the figure. Options 2 and 3 produce shapes with nothing behind them, one by keyword and one by assertion.

The second factor is **which question has an answer the catalogue can support**. *Is this a subscription?* is a question about intent, and the catalogue carries no intent — it carries a title and a paragraph. *Does this listing state a term?* is a question about text, and the text is right there. Reframing it is not a compromise; it is the only version of the question with evidence available. It also makes "no" a first-class answer rather than a failure: a listing that states a price and no term is not unread, it is a one-time purchase.

Option 2 is refused because the word and the fact were measured apart. Thirty results for *subscription* were mostly not subscriptions, and the real boxes were filed under Dog Supplies with no subscription word in their category at all. A keyword test on that evidence answers the wrong question quickly. Option 3 is refused because the answer cannot be wrong in a way anyone can see. Option 4 is refused because it is the present design with more entries, and the present design is the thing being replaced.

One consequence is deliberately accepted: a genuine subscription that never states its term — the listing titled *"Seasonal Subscription Box"* whose copy says nothing about cadence — is read as a price. The product will be wrong about it, and it will be visibly wrong rather than quietly wrong: the page will print the listing's own text and say no term was stated. That is a smaller failure than every listing claiming to be one-time.

## Tradeoffs

- **False negatives are the residual failure mode, and they are quiet to the merchant and loud to the shopper.** A box that ships monthly but never says so opens as a one-time purchase. The screen states what it checked, so the error is inspectable, but nothing in the product prompts anyone to fix the listing.
- **The wait arrives on the common path.** A shape decided by reading costs a model call, and the model is slow. Every listing that is not warmed now needs a reading before it can be described — which is IPD 39's problem to solve, and it is a real cost carried by this decision.
- **A merchant can change a listing's shape with an edit**, because the shape is now the words. That is the honest behaviour and it is also a source of inconsistency: the same product family listed twice (`zHpJR9Q`, curated, and `zm8tw4C`, not) can read two ways if their copy differs.
- **The model sits in the resolution of every listing.** If it is unavailable, the product can say less about a catalogue listing than it can today — today it says something definite and unverified, which is worse in principle and better in a demo where the endpoint is slow.

## Notes

- **The four curated ids do not disappear.** They become the regression fixture: four known-good spans, checked live on 2026-11-12, and the tie-breaker for screens that must answer before any reading exists (ITD 34).
- **The catalogue already proves the map was a sample, not a rule.** `zm8tw4C` is *BARK 12 Month Subscription* — the same product family as the curated `zHpJR9Q` — and is read as a one-time purchase today.
- **What the product calls a "term" is the length of the agreement, not the cadence of the charge.** *"6-Month Subscription"* states six months; whether that is six monthly payments or one payment for six months is the next decision (IPD 38).
- **A cadence with no end is not the same as no cadence.** *"Billed monthly, cancel anytime"* states a schedule with no term. It is not a one-time purchase and it is not schedulable by this page — IPD 38 and IPD 40 give it its own sentence.
