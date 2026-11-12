# The Term in Any Listing — Problem Decomposition

**Status:** Decided (2026-11-12) — four IPDs and three ITDs; not implemented
**Date:** 2026-11-12
**Raised by:** the product owner, from `todo.md` §19: *"I feel our AI integration and channel3 integration is shoddy… Our shop looks amateur."* R1 is the first of the seven recommendations: *read the term from any listing, not four ids.*

---

## Problem Statement

The product's whole subject is the commitment a listing describes. Its central reading — how many payments, how often, over what term — is obtained today by looking a product id up in a hardcoded map of four catalogue entries (`lib/market/subscriptions.ts:27`). Every other listing in a catalogue of tens of millions is read as a one-time purchase, and the screen then states, as a fact about the purchase, *"Paid once, so there is nothing to cancel"* (`lib/market/channel3.ts:124`).

That sentence is true of the listing's shape only because the app decided the shape before reading anything. A twelve-month subscription box filed under *Animals & Pet Supplies > Pet Supplies > Dog Supplies* is not shaped like a one-time purchase; it is shaped like whatever the merchant's words say it is, and the app has not looked at the words.

The defect is not that the app is wrong about four listings. It is that the app's flagship question — *what does agreeing to this cost, and what does it cost to leave* — is answered by an allowlist, so the answer cannot get better as the catalogue gets richer, and the AI reads a sentence only to fill in the third figure on screens that were already known to be subscriptions.

## Background and context

**What decides the shape today.** `resolveProduct` and the product page both call `curatedTerm(listed.id)` (`lib/catalog/resolve.ts:111`, `app/product/[slug]/page.tsx:68`). A hit produces `subscriptionTerms(offer, term)`; a miss produces `marketTerms(offer)` (`lib/catalog/resolve.ts:134`), which is `shape: "one_time"` and `exit: { kind: "none" }` (`lib/market/channel3.ts:151–159`). The map's entries each carry a verbatim span of the listing, and `termIsStated` re-checks that span against the live record on every render (`lib/market/subscriptions.ts:51–56`), so a merchant who rewrites their copy stops being quoted rather than being quoted from last week.

**What the catalogue does not carry** — verified live on 2026-11-12 with the deployment's own key:

| Question | Answer |
|---|---|
| Is there a cadence, term-length, renewal or subscription-type field? | No. A product is `id, title, description, brands, images, category, gender, age, materials, key_features, colors, offers, variants, structured_attributes, ratings`. |
| Is there a subscription category? | No. `omHxx9v` (*The Detox Box 6-Month Subscription*) is filed under *Health & Beauty > Personal Care > Personal Care Gift Sets & Kits*; `zm8tw4C` (*BARK 12 Month Subscription*) under *Animals & Pet Supplies > Pet Supplies > Dog Supplies*; `y6KI0zs` (*The Quarterly Intention Box*) under *Office Supplies > … > Planners*. Searching categories for *subscription* returns *Razor Blades & Refills* and *Satellite TV Kits* — the taxonomy matches on meaning, not on words. |
| Is there a structured attribute for it? | No. `structured_attributes` on those listings carries `material`, `safety-certifications`, `package-type`. |
| So where is the term? | Only in `title` and `description` — the merchant's own prose. |

**What the term actually looks like in real listings.** One search for *"monthly subscription box"* (20 results) returned these shapes among others, all of them listings a shopper can reach today:

- count and period in the title — *"BARK 12 Month Subscription"*, *"Accessories Set + Gift Subscription - Six Month"*, *"The Detox Box 6-Month Subscription"*
- count in the description — *"This 9-month plan ensures a consistent supply…"*
- cadence only, with no end — *"a monthly subscription service"*, *"billed and shipped on a quarterly basis"*, *"delivering … every three [months]"*, *"every 90 [days]"*
- the word *Seasonal*, with no period attached at all
- **none** — a listing titled *"Seasonal Subscription Box"* whose copy never states a cadence
- and the same product twice, once in the map and once not: `zHpJR9Q` (*Bark Monthly Subscription*, 12-month quote in its description) is curated; `zm8tw4C` (*BARK 12 Month Subscription*) is a second listing of the same family and is read as a one-time purchase.

**And the words are not reliably about billing.** A search for *subscription* (30 results) was mostly not subscriptions: books about the subscription business, *"2027 Cat in a Box Monthly Wall Calendar"*, *"Total Care Program 1-Year Warranty"*, *"Sony Protect Plus … 3 Year"*, *"Weekly and Monthly Calendar Cards"*, tax forms. Each of those states a duration or a cadence word. None of them is a schedule of payments. The distinction the reader must make is between **a billing term** and **a coverage period, a product's contents, a title, or an article about the model**.

**What the reading machinery already is.** The document reader is the pattern this problem wants: the model's schema has *no numeric field at all* (`lib/ai/read-document.ts:12–47`); it may only copy spans, the server verifies each span literally against the text (`lib/document/verify.ts:13`), and a parser reads the value out of an accepted span (`lib/document/parse.ts:40`). `published-exit.ts` is this pipeline applied to one question — what leaving costs — with three outcomes, not two: *stated*, *silent*, *unreadable* (`lib/commitment/published-exit.ts:23–26`). Nothing in that pipeline is exit-specific except a filter on field names (`:29`).

**What it costs to ask.** The model is a free endpoint measured at roughly 40 seconds for one short description, and the app's whole latency design is built around that: `MODEL_READ_DEADLINE_MS` is 3 s for a render, `MODEL_ANSWER_DEADLINE_MS` is 60 s for a page whose purpose is the reading, readings are cached (`readPublishedExit`), and the start-up hook pre-reads the texts it can predict (`lib/commitment/warm.ts`), whose list of live listings comes from the same four-id map (`:23`).

**Who this is for.** Adults with dyscalculia, ADHD and dyslexia. The product's promise is that the commitment on the screen is the commitment in the listing, with the arithmetic done and the seller's words shown. A one-time purchase with no term is *not* a failure of that promise — inventing a term would be. The audience argument cuts both ways here, and that tension is the substance of the problem.

## Goals

1. A listing that states a term is read as a commitment, whatever its id, its retailer or its category.
2. A listing that states no term stays a one-time purchase and says so, without a sentence that claims more than was checked.
3. Every figure on the screen traces to a span of the merchant's own words that the server verified.
4. The four curated entries stop being the gate — they become a regression fixture and a tie-breaker.
5. A wrong reading is visible and correctable rather than plausible and silent.

## Non-goals

- **Not a subscription detection model.** Nothing is asked to classify listings; the question is only *where does this listing state its term*, with "nowhere" a first-class answer.
- **Not the subscriptions shelf.** R3 deferred it pending this work, but a shelf is a product decision about the shop, decided after this one.
- **Not billing changes.** PayPal plans, the consent route and the subscription API keep the shapes they have (IPD 2–4). This decides what may be *said* about a listing.
- **Not price history, similar products, variants or checkout** (R4, and the catalogue's other endpoints).
- **Not a model upgrade or a new provider.** R6 is separate; this must work on the endpoint the app has.

## Constraints

- **The catalogue has no cadence field, category or attribute.** Every term this product knows comes from prose, and prose that a retailer may change at any moment.
- **The model may copy, not compute.** Its schema is word-only by design; a term asserted by the model is a term invented by the model. Only a verified span may produce a figure.
- **A verified span is not a verified meaning.** The reader already has one scar from this: *"You are agreeing to 24 months of service"* was accepted as a cost-to-leave span because it was literally present (`context.md`, 2026-11-11). Term spans will have the same problem in a new place — *"1-year warranty"* is a period, not a schedule.
- **Latency is owned by a free endpoint.** 40 s cold, seconds warm, cached by text, warmed at start-up. A shop page shows 30 listings; a product page shows one.
- **Nothing is invented, and every absence is stated.** *Not stated* is an answer; a guessed cadence is not.
- **The suite is the contract.** 543 tests pin the current behaviour, including that uncurated listings are one-time purchases. Those tests are rewritten to the new behaviour, not deleted.
- **One developer, and a deadline that has passed.** Whatever is chosen must survive being cut in half.

## Assumptions

- A merchant who sells a recurring box states the cadence somewhere, because a shopper cannot buy it otherwise. The samples above support this for genuine subscription boxes and refute it for the word *subscription* in general.
- Most listings in the shop are genuinely one-time purchases, so the common case after this work is still *paid once* — the win is that the case is now checked rather than assumed.
- The catalogue's `description` is the merchant's own copy, not a catalogue-written summary. (Observed: descriptions read as retailer prose, and some third-party listings read as machine-written encyclopaedia entries.)

## Problem Tree

```text
├── Q1. What makes a listing a subscription?
│   ├── Is the test the merchant's words, the catalogue's data, or a schedule that can be built?
│   ├── How is a billing term told apart from a coverage period, a warranty, a product's contents or an article?
│   └── Is "subscription" even the right category — or is it "has a schedule with a term"?
│
├── Q2. What shapes can a stated term take, and which can this product honestly schedule?
│   ├── Count and period together ("12 Month", "9-month plan"), count only, period only ("billed quarterly"), or neither ("seasonal")?
│   ├── What does the product do with a cadence and no end — an ongoing subscription, refused, or a different shape entirely?
│   ├── Periods the app does not have: days, weeks, "every three months", "biweekly", "seasonal"
│   └── Words that look like a term and are not ("2027 … Monthly Wall Calendar", "1-Year Warranty")
│
├── Q3. How does a reading become a term without inventing one?
│   ├── What does the model get asked for — a span per fact, or one span that states both?
│   ├── What may a parser accept from a verified span, and what must it refuse?
│   ├── What happens when the span verifies but the meaning does not (a warranty year)?
│   └── How does the screen show what was read, so a wrong reading is visible?
│
├── Q4. When is a listing read, and what does the shopper wait for?
│   ├── At render, warmed ahead, or only when asked?
│   ├── What does a product page show while a 40-second reading is in flight?
│   ├── What does a shop page of 30 tiles know — and can it know anything at all?
│   └── What is remembered, for how long, and what does that cost in honesty when a merchant edits their copy?
│
└── Q5. What changes for a shopper once any listing might be a subscription?
    ├── Which sentence replaces "Paid once, so there is nothing to cancel", and who may write it?
    ├── Does the extra reading change the price the shop shows, the figures, or only the third one?
    ├── What does the product say about a listing it could not read — and is that different from one that states nothing?
    └── Is the deferred subscriptions shelf now buildable, and on what evidence?
```

## Decisions

| # | Question | Document |
|---|---|---|
| IPD 37 | Q1 — the merchant's stated term decides; a listing with no such statement is not a schedule | [`ipds/what-counts-as-a-subscription.md`](ipds/what-counts-as-a-subscription.md) |
| IPD 38 | Q2 — a term in whole months becomes monthly payments; a different cadence or no end is stated and not scheduled | [`ipds/which-terms-become-a-schedule.md`](ipds/which-terms-become-a-schedule.md) |
| IPD 39 | Q4 — the page opens with the catalogue's answer and fills the commitment in while the seller's words are read | [`ipds/what-the-shopper-waits-for.md`](ipds/what-the-shopper-waits-for.md) |
| IPD 40 | Q5 — one sentence per fact, and only the two known shapes can be agreed to; the shop's card and the shelf do not change | [`ipds/what-the-screen-says-now.md`](ipds/what-the-screen-says-now.md) |
| ITD 33 | Q3 — one reading per listing, a `termLength` span, and a term accepted only when the words say it is an agreement | [`itds/one-reading-one-span.md`](itds/one-reading-one-span.md) |
| ITD 34 | Q1, Q3 — resolution reads the listing, the curated map becomes a checked fixture, and the schedule is nullable with a named state | [`itds/the-map-becomes-a-fixture.md`](itds/the-map-becomes-a-fixture.md) |
| ITD 35 | Q4 — the reading is cached by text and the product page streams it in | [`itds/the-reading-is-kept.md`](itds/the-reading-is-kept.md) |

Q2's technical half is answered by ITD 33 (what may be parsed out of a span); Q4's product half by IPD 39 and its technical half by ITD 35.

## Open questions

- **How many listings in the catalogue state a term?** Unmeasured. One search for *"monthly subscription box"* found roughly half its results stating something; one search for *"subscription"* found one in thirty. Neither sample is the catalogue, and the shop browses categories, not queries. IPD 38's measured count — one listing in thirty stating both a count and a cadence — is the only number the decisions rest on.
- **Does the catalogue ever return a machine-written description instead of the merchant's?** Some descriptions in the samples read like encyclopaedia entries rather than retailer copy. A term read out of such a description may be a summary of a term rather than the term, which the verification chain cannot detect.
- **Is the four-id map still correct?** Verified live on 2026-11-12: all four ids answer `200` and all four still contain the span in the map. But `zm8tw4C` shows the same product family listed outside the map, so coverage is not a matter of the map going stale — it was never the shape the catalogue has.
- **What is the cost per visit?** Each cold product page is one model call against a free quota; the shop's thirty tiles are none, because no card is read. The arithmetic holds only while the reading stays on the product page (IPD 40, ITD 35).
- **Can a term stated in years ever be scheduled?** IPD 38 refuses it: *"1-year plan"* could be twelve monthly charges or one annual one. If a later decision gives the money path `interval_count`, this and the quarterly case both reopen.
- **What replaces a total when a subscription has no end?** IPD 38 and IPD 40 give the ongoing case a sentence instead of a figure. Whether *across the term* should become a different figure altogether — *per month, for as long as you keep it* — is a change to IPD 19's three figures, not to this problem.
