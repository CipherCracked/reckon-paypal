# IPD 34 — Two Ways Through, One Question at a Time

**Status:** Decided (2026-11-12)
**Date:** 2026-11-12
**Answers:** Problem tree Q2 of `../intro.md` — *how does a person move through a catalogue this size?*
**Serves:** IPD 33 (the shop opens on a shelf); the audience constraint in the decomposition — every added control is a decision the shopper pays for.

---

## Problem to solve

Once the shop has a shelf, the shopper has to be able to move through it. The catalogue offers an unusual amount of movement: sixteen root categories and their trees, a search that understands more than words, price and brand and retailer and sale and colour and dimension filters, and a paging window of five pages of thirty inside any browse.

Offering all of that is how a catalogue becomes a control panel. This product's audience is adults with dyscalculia, ADHD and dyslexia, and the single promise every screen makes is *fewer numbers, fewer decisions*. A filter bar with six facets is six decisions before the one the person came to make — *is this going to cost me more than I thought?* — and each facet is also a number to read, compare and hold in mind.

The opposite failure is just as real: categories alone would mean a person who wants anything under fifty dollars has to page through a hundred and fifty products to find it. Narrowing is not the enemy; unbounded narrowing is.

## Options

### Option 1 — **Categories are navigation, price is the one question, and paging says when it ends**

Choosing a category browses it. Searching runs the whole catalogue. On either, one row of words offers the only narrowing: **Any price · Under $50 · $50–$200 · Over $200** — three links, one click, no form and no arithmetic. Availability is not offered because the shop already shows only offers someone can buy. Everything else the catalogue can filter on is left unused.

The page shows thirty products and one link: **Show 30 more**, while the catalogue hands back a page. At the catalogue's fifth page the link becomes a sentence — *The catalogue shows at most 150 of these. Choose a narrower category, or search.* — and the shopper is pointed at the two things that actually narrow it.

Every choice lives in the URL — `?category=`, `?q=`, `?price=`, `?after=` — so the back button, a reload and a pasted link all behave.

*How it feels:* a person picks **Home & Garden**, sees thirty real products at real prices, decides that is too many, clicks **Under $50**, and gets a page of things they can afford. If that is empty, the page says so in one sentence and offers the way out. Nothing on the page requires reading a control twice.

### Option 2 — Full faceting, like a general retailer

A filter panel with brand, retailer, price range, on-sale, availability and category, multi-select, applied by a button.

*How it feels:* capable, and heavy. Brand lists run to thousands; multi-select is a mode of thinking this audience does not need for a three-minute visit; and the price range alone is two number fields, which is the exact object the product exists to spare people. It also invites the shopper to narrow by retailer — a distinction with no meaning in this product, which never sells anything and takes the cheapest offer regardless.

### Option 3 — No narrowing at all

Categories and search, thirty products, done.

*How it feels:* clean, and it strands the person whose real question is affordability. It also makes the shop less of a shop than the catalogue it sits on, for no gain: one row of words is not a control panel.

### Option 4 — Price as a form: minimum and maximum fields

Two number inputs and an apply button.

*How it feels:* precise, and it hands the shopper exactly the task the product promises to remove. A person with dyscalculia typing `50` and `200` into two boxes is doing arithmetic to avoid arithmetic.

## Reasoning

The deciding factor is **how many questions a control asks**. A category asks *where in a shop would this be?* — the same question a person answers without noticing in any shop. Price asks *what can I afford?* — the question underneath the product's whole purpose. Those two are the shop's questions. Brand, retailer, sale and colour ask questions that belong to someone deciding between variants of a thing they already chose, and this product has already decided to answer the third figure for them instead.

The second factor is **what a link can carry**. Three named price bands are URL-safe, printable, and readable in a sentence (`Under $50`), so the whole state of the shop is a link a person can keep or send. A multi-select filter is a form submission, a piece of client state, or a query string nobody can read. Option 1 keeps the shop a set of documents, which is what this product is.

Option 2 is rejected because its extra power is bought entirely with the audience's attention. Option 3 is rejected because it fails the one narrowing the product cares about. Option 4 is rejected because it is the same facet as Option 1 expressed as the thing the product exists to remove.

The paging decision follows from the same reasoning: a shopper should never be told *more results exist* without being told *how to make fewer exist*. At 150 the catalogue stops because the catalogue stops, and saying so — with the two ways to narrow — is the honest version of an ending.

## Tradeoffs

- Three price bands are coarse. A person looking for something between $80 and $120 gets $50–$200 and thirty results; there is no fourth click that makes it exact.
- Brand filtering is genuinely useful for someone who knows the brand and not the product. They can still type the brand into the search field, which is a sentence, not a facet.
- `Show 30 more` is a page reload, not an append. The list grows by showing the next page in place of the last, which loses scroll position — the price of keeping the shop server-rendered and link-shaped.
- Category and price can be combined, but a search cannot be scoped to a category. A person who wants "coffee maker" inside Home & Garden gets the whole catalogue's coffee makers. This is deliberate: two ways to narrow at once is the control panel arriving through the back door.

## Notes

- The price bands filter on the offer's own price in dollars, the unit the catalogue's filter takes; the boundary arithmetic happens once, at the boundary, and is never shown to the shopper.
- What the bands should be is a merchandising guess, and this product does not otherwise guess. They are the smallest set that covers *cheap, ordinary, expensive* without asking the shopper to think. They are stated as words on a row, not a range slider.
