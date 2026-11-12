# Subscriptions Shelf — Problem Decomposition

**Status:** Built (2026-11-12) — two IPDs and one ITD; live-verified, suite 595 → 614
**Date:** 2026-11-12
**Raised by:** R3's own deferral. `docs/browsable-shop/` refused a "Subscriptions" shelf because the shop could not tell a subscription from a one-time purchase, and recorded it as *the first thing to revisit* once R1 landed. R1 landed on 2026-11-12.

---

## Problem Statement

The product's subject is the commitment — the thing that charges again — and the shop has no screen for it. A person who arrives with the worry the front door names (*my subscription renews next month and I do not know what it will cost me*) can reach the catalogue two ways: sixteen departments, which sort stock by what it is rather than how it charges, or a search for words they may not know. Neither is a shelf of commitments. To find one they must open listings one at a time and hope.

The catalogue will not answer the question either. It has no field for a cadence, a term or a renewal; a listing's only statement of its own shape is the words the merchant wrote. R1 learned to read those words with a model, one listing at a time, at a measured cost of most of a minute per listing on the endpoint this demo runs on. A shelf of thirty tiles read that way is thirty minutes of a page nobody would wait for.

**The thing between those two facts is the problem:** the evidence that a listing repeats is already in its text, before any model reads it, and the catalogue's search will surface it if asked the right words.

### Measured, 2026-11-12, one page of `POST /v1/search` each

| Query | What came back |
|---|---|
| `monthly subscription box` | 30 listings, of which roughly twenty are products that charge again — BarkBox plans, the Detox Box, Dr. Squatch soap subscriptions, four beauty boxes — plus three wall calendars wearing the word *monthly* |
| `subscription` | 30 listings, of which most are books about subscriptions, extended warranties, tax forms and calendars; one is a subscription box |

So the search is a nearest-neighbour match, not a filter: it will hand back a book called *The Subscription Boom* beside a dog-toy box. A shelf built by printing its results would be the invented merchandising IPD 33 refused, in a different costume.

## Background and Context

**What exists now.** `/shop` opens on the catalogue's sixteen root categories (IPD 33), searches beneath them (IPD 34), shows a card per product (IPD 35) and accepts a pasted link (IPD 36). `/product/[slug]` streams the commitment panel and decides the listing's shape from its own words (R1, IPD 37–40). Nothing in the shop reads a term.

**What a reading costs.** One model call per listing; ~40 s measured on the free endpoint, which is why the product page streams it and why the shop's cards cost none. R1's warm-up reads a handful at start-up, in sequence, because a burst starves the quota.

**What the reader already knows.** `lib/commitment/published-term.ts` holds the vocabulary that decides whether a duration is an agreement: `AGREEMENT` (subscription, membership, billed, renews), `NOT_AN_AGREEMENT` (warranty, coverage, calendar, magazine) checked first, and `BILLING_OR_DELIVERY`. A listing whose title says *2-Year Extended Service Coverage* is refused there today. That refusal is the difference between a shelf and word-matching.

**Who this is for.** Adults with dyscalculia, ADHD and dyslexia — people for whom a renewal they did not understand is the exact failure this product exists to prevent. A shelf is a low-decision way to find one; a grid of filters would not be.

## Goals

1. A person can see what the catalogue holds that charges more than once, without opening a listing first.
2. Every tile states only what its listing's own words say, and quotes them.
3. The shelf spends no model time, and a visit costs a couple of catalogue calls — not thirty minutes.
4. A tile leads to the same product page as anywhere else, where the term is read and every figure produced.

## Non-Goals

- **Not a reading.** The shelf does not decide a term, a schedule or a total; it decides whether a listing's words say it repeats.
- **Not a ranking, a recommendation or a curated rail.** No "popular", no "trending", no hand-picked shelf.
- **Not a filter or facet panel.** IPD 34's rule — price is the only narrowing — is untouched.
- **Not a change to the product page, the card (IPD 35) or the store's departments.**
- **Not a new catalogue endpoint.** Two searches the shop already knows how to make.

## Constraints

- **The search is semantic, not literal.** Anything built on its results must screen them; the results are not the shelf.
- **A warranty must never become a subscription.** The vocabulary that refuses one is already written and must be the shelf's.
- **A tile cannot claim what nobody has checked.** No term, no total, no "6 payments of…" before the model has read the listing.
- **The audience pays for decisions.** The shelf is a grid and a link, not a control panel.
- **One developer, and the deadline is today.** Scope must survive being cut in half.

## Assumptions

- A person looking for something that repeats will scroll a grid of twenty rather than search for it.
- One or two query words find most of the catalogue's recurring stock; the shelf is a sample either way.
- Opening a tile is the moment the model reads, and a person who has just chosen a listing will wait longer than one who is only browsing.

## Problem Tree

```text
├── Q1. On what evidence does a listing belong on a shelf of things that repeat?
│   ├── Must every tile be read by the model first, or may its own words be enough?
│   ├── Which words count — the vocabulary the reader already uses, or one written for the shelf?
│   └── How are thirty nearest-neighbour results turned into a shelf rather than noise?
│
├── Q2. What does a tile on this shelf claim?
│   ├── Does a tile carry a term, a total, or only the phrase that put it there?
│   ├── Whose words appear on it, and how long may they be?
│   └── What does a tile promise about the page it opens?
│
├── Q3. Where does the shelf live?
│   ├── On the shop's opening screen, beneath the departments, or on a screen of its own?
│   ├── How does a person reach it from the front door and from the shop?
│   └── What does it do to IPD 33's decision that the shop opens on the catalogue's categories?
│
└── Q4. What does the shelf say when it is slow, empty or wrong?
    ├── What is shown when the catalogue cannot be reached?
    ├── What is said when the phrases that got a listing here are rewritten?
    └── How much catalogue quota may one visit spend, and how fresh may a tile be?
```

## Decisions

| # | Question | Document |
|---|---|---|
| IPD 41 | Q1, Q2 — a listing is on the shelf because its own words say it repeats, and the tile quotes those words; nothing stronger is claimed | [`ipds/a-tile-is-evidence.md`](ipds/a-tile-is-evidence.md) |
| IPD 42 | Q3 — a screen of its own at `/shop/subscriptions`, one link under the departments and one on the front door | [`ipds/a-shelf-of-its-own.md`](ipds/a-shelf-of-its-own.md) |
| ITD 36 | Q1, Q4 — the reader's own vocabulary applied to sentences of the listing's text, two catalogue searches, dedupe, cap, named failure | [`itds/screening-with-the-readers-words.md`](itds/screening-with-the-readers-words.md) |

Q4's product side — what the screen says when the catalogue cannot answer or nothing passes — is answered inside IPD 42 and ITD 36 rather than by a decision of its own: the shelf shows the shop's existing failure sentence, and an empty shelf says the catalogue answered and nothing in it names a repetition.

**Built 2026-11-12.** `repeatingWords` (in `lib/commitment/published-term.ts`), `SHELF_QUERIES` / `readRepeatingShelf` (`lib/market/repeating.ts`), `lib/market/shop-words.ts` (the shop's shared failure sentences), `app/shop/subscriptions/page.tsx`, and `MarketCard`'s `evidence` line. Live-verified through the dev server: 22 tiles, all products that charge again; wall calendars, protection plans, books and tax forms refused by the reader's own meaning checks. Suite 595 → **614**, `tsc` and `lint` clean.

## Open Questions

- **How many recurring listings does the catalogue hold?** Unknown. Two searches are a sample, and the shop's own browsing is by category, not by query — so no count exists for the whole catalogue.
- **What is said about coverage?** The shelf cannot promise it holds every recurring listing, and the query words are ours. The screen's lede says what a tile is and where its words come from; it does not yet say that the shelf is a sample. The catalogue's ranking is also not stable between two identical calls — measured, 22 tiles then 21 — so the honest next sentence is about coverage, not about freshness.
- **Does the front door need a link to it, and in what words?** Decided in IPD 42: one line beside the search, *Or browse what charges more than once*, which is the front door's own vocabulary rather than the shelf's heading.
- **Could a tile surface a reading the cache already holds?** Still open. `peekListing` would let a tile show *"6 payments of $58.95"* for a listing already read, which would make some tiles stronger than others on the same grid — a difference a shopper would read as a defect.
