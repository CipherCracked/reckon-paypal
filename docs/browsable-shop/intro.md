# Browsable Shop — Problem Decomposition

**Status:** Decided (2026-11-12) — four IPDs and three ITDs; not implemented
**Date:** 2026-11-12
**Raised by:** the product owner, after looking at the built product: *"Our shop looks amateur… I feel our channel3 integration is shoddy."* The request: R3 in `todo.md` §19 — *make the shop a shop*.

---

## Problem Statement

The shop is a search field with a list under it. It opens on an arbitrary query, returns at most twelve products in one column of 96px thumbnails inside the 46rem reading measure, offers no way to browse or narrow, and spends part of its copy explaining to the shopper how the catalogue matches words and where the data comes from. A person who arrives without a product name has nothing to do. A person who knows what they want gets the search's nearest results and a sentence explaining why they might not be what they asked for. The catalogue behind the page holds sixteen top-level categories, category trees, price and brand and retailer filters, paging, and a lookup for any product URL; the shop uses one endpoint of it.

The shop is also the only route by which a shopper reaches the product's actual subject. If the shop reads as a placeholder, the product is judged by its weakest screen — the one that answers *"nothing to cancel"* for most of its own stock.

## Background and context

**What the shop is for.** The product does not sell anything; it translates a commitment before someone agrees to it. The shop is how a person finds a commitment worth translating — including one they were sent a link to. It is not a revenue surface and it does not ship.

**What it is today** (`app/shop/page.tsx`):

- one GET form, a default query of `"headphones"` (`:17`), five hardcoded suggestions (`components/MarketSearch.tsx:3`)
- one search call, `limit: 12`, no second page, no filters, no categories (`lib/market/channel3.ts:314`)
- products with no in-stock USD offer are dropped before display (`:306`), so a shopper cannot tell "no results" from "twelve results and eight of them unpriced"
- a result line that explains the catalogue's matching to the shopper — *"It matches on more than spelling, so these are its nearest results"* (`app/shop/page.tsx:40`)
- a single-column list inside the 46rem measure (`app/shop/page.tsx:72`; `.page` `app/globals.css:363`, `.market-list` `:1442`)
- a scope note naming the vendor (`app/shop/page.tsx:103`), a rating caveat — *"the catalogue's figure, not this page's"* (`components/MarketProduct.tsx:60`), a description label — *"The manufacturer's description, in their words"* (`:84`), and *"This demo does not sell or ship this product"* (`:165`)

**What the catalogue can do** — verified against its published API reference and checked live on 2026-11-12 with the deployment's own key:

| Capability | Endpoint | What was observed |
|---|---|---|
| Root categories | `GET /v1/categories?roots_only=true` | 16 roots: `electronics`, `home-garden`, `apparel-accessories`, `health-beauty`, … ; up to 100 per page |
| Category tree | `GET /v1/categories/{slug}` | `electronics` has 18 children, a description and attribute vocabularies |
| Category search | `GET /v1/categories/search?query=` | keyword + semantic, up to 20 |
| Browse | `POST /v1/browse` | `home-garden` returned 30 products and a `next_page_token`; **requires** a category, brand or website scope; limit 30; capped at 5 pages (150 products), then `422` |
| Filters | `filters` on search and browse | price (inclusive min/max), availability, brand, website (domains accepted), category slugs, on-sale, colour, dimensions, attributes; a live price filter 20–60 returned only products inside it |
| Search paging | `POST /v1/search` `page_token` | limit 30, filters, `next_page_token` |
| URL lookup | `POST /v1/lookup` | `allbirds.com` product URL → product with id and offers; `404` when nothing is found; `422` when the URL is not a product page; `504` on timeout. Listings outside the catalogue resolve for display but are not available to every other endpoint |
| Not used, available | `/v1/similar`, variants, price tracking, collections, webhooks | out of scope here |

**Who this is for.** Adults with dyscalculia, ADHD and dyslexia. Every additional decision on a screen has a cost this audience pays more than most: filters, facets and paging are not neutral additions to a page whose whole promise is *fewer numbers, fewer decisions*. That tension is the substance of the problem, not an accessibility checklist applied afterwards.

## Goals

1. A person who arrives without a product name has something to do that is not typing.
2. A person who knows what they want can narrow the catalogue without reading a manual.
3. Every screen in the shop describes the product, not the data vendor.
4. A stranger looking at the shop recognises it as a shop.
5. The commitment screen stays one click from any listing, at the same price the shop showed.

## Non-goals

- **Not the term-reading engine** (R1). A listing still enters as a one-time purchase unless it is one of the curated ids. This pass may make the gap more visible; it does not close it.
- **Not checkout** (R4). The shop does not take money.
- **Not recommendations, personalisation, or an editorial shelf we write.** Every product shown is the catalogue's; no merchandising copy is invented.
- **Not image search, similar products or variants**, though the catalogue offers them.
- **Not a redesign of type, colour or shape.** The frame and ledger (ITD 24, IPD 29) are settled.

## Constraints

- **The catalogue dictates the shape of paging.** Browse cannot run unscoped; a browse is five pages deep at most; search and browse both cap at 30 per page. A shop that promises "everything in a category" cannot deliver more than 150 products for it.
- **Nothing is invented, and every absence is stated.** Categories, brands, prices and availability come from the catalogue or are not shown. A dropped product is not the same as a product that does not exist.
- **Prices are live.** The shop and the consent screen must agree about the amount, which constrains caching and pre-fetching.
- **The audience pays for decisions.** Any facet system has to justify each control it adds.
- **The suite is the contract.** 484 tests currently pin the product's honesty; a sentence removed is a test rewritten to the new behaviour.
- **One developer, and a deadline that has already arrived.** Scope must survive being cut in half.

## Assumptions

- A person comes to this shop with a worry — a purchase, a renewal, a link someone sent — not with an afternoon to browse.
- The catalogue's category tree is stable enough to use as navigation; its slugs are not shopper-facing words.
- 30 products is enough to feel like a shelf, and 150 is enough to feel like a catalogue.
- The person evaluating this product will reach the shop from the front door or the frame's own navigation, not from search engines.

## Problem Tree

```text
├── Q1. What is the shop for?
│   ├── Does a visitor arrive knowing the product, or knowing only a worry?
│   ├── Is the shop a place to find something to check, or to check what you already have?
│   └── What does the first screenful show when nobody has searched?
│
├── Q2. How does a person move through a catalogue this size?
│   ├── Search, categories, or both — and which one is the default?
│   ├── Which facets are worth asking a shopper to decide?
│   ├── How does a narrowing survive a reload, a back button and a shared link?
│   └── What does the shopper see at the end of the catalogue's paging window?
│
├── Q3. What does a listing say about itself before the commitment screen?
│   ├── What belongs on a card, and whose words are they?
│   ├── Which offer is "the price", and how is a range shown without arithmetic?
│   ├── Do the three figures appear in the shop at all?
│   └── What replaces the sentences that currently explain the vendor?
│
├── Q4. How does a product URL become a checkable commitment?
│   ├── Where does pasting a link belong — the shop, the reader, or the front door?
│   ├── What is said when the URL is not a product page, is not found, or times out?
│   └── Can a looked-up product be explained as fully as a catalogued one?
│
└── Q5. How does the shop behave when the catalogue is slow, empty or wrong?
    ├── What does failure look like on a shelf rather than a search result?
    ├── How fresh must a price be, and what does caching cost in honesty?
    ├── What does a filter combination with no results say?
    └── How much of the catalogue's quota may one visit spend?
```

## Decisions

| # | Question | Document |
|---|---|---|
| IPD 33 | Q1 — the shop opens on the catalogue's own category shelf, with the search as the shortcut beneath it | [`ipds/the-shop-opens-on-a-shelf.md`](ipds/the-shop-opens-on-a-shelf.md) |
| IPD 34 | Q2 — categories navigate, price is the only narrowing, paging ends at the catalogue's own limit and every choice is a URL | [`ipds/two-ways-through.md`](ipds/two-ways-through.md) |
| IPD 35 | Q3 — a card is a picture, a brand, a title and a price; the vendor explanations go, one sourcing line stays | [`ipds/a-card-describes-the-thing.md`](ipds/a-card-describes-the-thing.md) |
| IPD 36 | Q4 — a pasted product link is a second field on the shop, and it opens the product page | [`ipds/a-link-someone-sent.md`](ipds/a-link-someone-sent.md) |
| ITD 30 | Q2, Q5 — one module of browse, category and lookup calls with paging, caching and named failures | [`itds/reading-the-catalogue-for-a-shelf.md`](itds/reading-the-catalogue-for-a-shelf.md) |
| ITD 31 | Q3 — the shelf and the grid at the frame's full width, with the accessibility in the layout | [`itds/the-shelf-is-the-page.md`](itds/the-shelf-is-the-page.md) |
| ITD 32 | Q4 — a pasted link is looked up and read back before it is followed | [`itds/a-pasted-link-resolves-first.md`](itds/a-pasted-link-resolves-first.md) |

Q5 (how the shop behaves when the catalogue is slow, empty or wrong) is answered by ITD 30 and ITD 32 together: named failures, paging passed through opaque, caching keyed by the URL, and a timeout that renders a sentence rather than an error page.

## Open questions

- **The subscriptions shelf stays closed until R1.** IPD 33 declines it explicitly: the shop cannot tell a subscription from a one-time purchase without the curated map, and a shelf that guesses would be the invented merchandising every other decision here refuses. It is the first thing to revisit once a listing's term can be read from any listing.
- **The front door inherits the search change.** `MarketSearch` is shared with `/`, and IPD 33 removes the five hardcoded suggestion links it carries. The entry will lose them too; whether it needs a replacement is not decided here.
- **What is the real quota?** The catalogue publishes rate limits and bills by credits; the shop has never been exercised at browsing volumes. No measure of this exists in the repo, and the caching decisions in ITD 30 are reasoned rather than measured.
- **What does the shop say when the catalogue key is absent on a judge's machine?** Today the page explains the deployment to the shopper (`app/shop/page.tsx:68`). Whether that belongs on a shop screen or in the README is a product question this pass should settle when the failure states are written.
- **The price bands are a guess.** Three words — *Under $50*, *$50–$200*, *Over $200* — are the smallest set that covers cheap, ordinary and expensive. They are not measured against the catalogue's distribution, and the boundaries are the kind of number this product usually refuses to invent.
