# IPD 36 — A Link Someone Sent You

**Status:** Decided (2026-11-12)
**Date:** 2026-11-12
**Answers:** Problem tree Q4 of `../intro.md` — *how does a product URL become a checkable commitment, and where does pasting one belong?*
**Serves:** IPD 33 (the shop is the finding surface); the product's existing claim that a person can be sent something and understand it before agreeing.

---

## Problem to solve

The product's founding situation is a person holding something someone else wrote: a bill, a contract, a payment plan. All three arrive by paste into `/read`, where a model reads text. A **link** arrives the same way and has no door at all. A shopper who is sent a product URL — the most common shape of *here, buy this* — can only retype the product's name into a search field and hope the catalogue answers with the same listing.

The catalogue can resolve any product URL directly. Nothing in the product uses that, so the one moment where the catalogue is most useful — a link a person already has — is the moment the product has nothing to offer.

## Options

### Option 1 — **A second field on the shop, under the search: "Sent a link? Paste the product page's address."**

Submitting resolves the link and opens that product's page — the same page the grid opens, with its offers, its price and the three figures. When the link cannot be resolved, the shop says which kind of failure it was, in one sentence, and keeps the field filled so it can be corrected.

It is not the page's main action: a small secondary form under the search, with a sentence that says what it is for, in the place a person who has a link looks.

*How it feels:* a person holding a link from a friend pastes it into the shop and lands on the product, with the commitment worked out. They never learn that two different catalogue endpoints were involved, which is the correct amount for them to learn.

### Option 2 — A third door on the front door

*Check a commitment · Read a document · Open a link.*

*How it feels:* the entry already offers two doors and was deliberately reduced to two after three identical tiles behaved three different ways (IPD 28). A third door for a URL is a third thing to choose before seeing anything.

### Option 3 — Paste the link into `/read`

The box accepts a URL instead of text.

*How it feels:* the reader's promise is *a model may only copy sentences from this text*. A URL is not text with sentences in it, and every sentence on that page — the hint about what is sent to the model, the ten-minute cache, the checked quotations — would become false for one kind of input. It also puts the slower, model-backed path in front of a fast catalogue lookup.

### Option 4 — A dedicated `/open` page behind a link

*How it feels:* a page for one field. A person has to find it before they can use it, and its empty state has to explain what it is — the shop already has the context and the shelf above it.

## Reasoning

The deciding factor is **where a person is standing when they have a link**. They are choosing something to look at — which is the shop's job — and they hold the address already. Putting the field in the shop means the link and the search are the same act with two inputs, and the result of both is the same product page. Option 2 splits *I have a link* and *I have a name* across two doors; Option 4 makes the person find a room before they can knock.

The second factor is **what the reader promises**. `/read` is the product's one screen where a model touches the visitor's own words, and its sentences are precise about that: sent once, copied not composed, kept ten minutes. A URL is not a document, and folding it in would either weaken those sentences or need a second set of them on the same page. The shop's sentence is simpler because it has less to promise.

Option 3 is rejected on those grounds and Option 2 on the entry's own history.

## Tradeoffs

- The shop now has two inputs. They are visually unequal — the search field is the page's main control and the link field is a sentence with a small field under it — but a person who does not need the link field still sees it.
- The lookup is slower than a search: resolving a URL the catalogue has not cached means fetching the retailer's page. A person may wait seconds for a link the catalogue has never met, and the page must say it is working rather than look broken.
- Not every product URL is a product page. Category pages, home pages, search results and dead links all arrive as failures, so the failure sentences are part of the surface and have to be written as carefully as the success.
- A looked-up product may sit outside the catalogue's own records, which limits what the rest of the product can do with it later. The page says what it can, and this pass does not promise more.

## Notes

- The three failures are distinct sentences because they ask different things of the person: *that address is not a product page* (try the product's own page), *this link does not name a product the catalogue can find* (the listing may be gone), *the link did not answer in time* (try again).
- An address that is not `https`, or that points back at this product, is refused before any call; the field is not a general-purpose fetcher.
