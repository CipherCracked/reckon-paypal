# IPD 35 — A Card Describes the Thing

**Status:** Decided (2026-11-12)
**Date:** 2026-11-12
**Answers:** Problem tree Q3 of `../intro.md` — *what does a listing say about itself before the commitment screen?*
**Serves:** IPD 33 and 34 (a shelf and a grid of these cards); IPD 29 (one quiet line — this is the same rule applied to the shop).

---

## Problem to solve

The shop's card says four things and two of them are about us. It says the brand, the title, *From $24.99 at bark.co*, and *2 retailers in these results, $8.00 apart* — the last being a fact about the catalogue's answer set rather than about the product, phrased in the vocabulary of a data vendor. Above the list, a line explains that the catalogue *matches on more than spelling*. Under it, a note says prices, images and retailer links *come from Channel3* and change without notice, that nothing here is an offer to sell, and that nothing ships. On the product page the same anxiety appears three more times: the rating is *the catalogue's figure, not this page's*, the description is labelled *the manufacturer's description, in their words*, and the foot says *This demo does not sell or ship this product*.

A shopper reading this learns how the shop is built. What they do not learn is what the thing is. The card shows a 96px thumbnail in a single column inside a reading measure, so the shop — a page whose entire job is comparison — cannot be scanned.

The three commitment figures are deliberately absent from the card today, and that absence is correct: a card is where a person recognises a product, not where they evaluate one. But the page never says so, and the order of the shop's screens — recognise, then evaluate — is nowhere visible.

## Options

### Option 1 — **Four facts and a picture, at a size that can be scanned**

The card becomes a vertical tile in a grid: the product's image (the catalogue's cleaned cut-out when it has one), the brand, the title, and one price line — *From $24.99 at bark.co* — with *3 retailers* beneath it when there is more than one. The whole tile is the link. No description, no rating, no figures, no prose about where the facts came from.

The card grid sits at the frame's full width, two tiles across on a phone and as many as fit at 1440.

The shop keeps two sentences and loses three. A search that returns no exact match says *Nothing here uses “coffee machine”. These are the closest listings the catalogue has.* — a finding about this answer, not an explanation of the catalogue's engine. The foot of the shop and every product page carries one line: *Prices, photos and retailer links are the retailers' own, read live when this page opened.* The three per-screen apologies are deleted, and the fact one of them carried — nothing ships — moves into the frame's existing quiet line.

*How it feels:* the page is a wall of things, each with a picture, a name and a price, the way a shop has looked for a century. Nothing above the first card explains the machinery. The thing a person needs to know about the data — that it is real and live — is one line at the foot, where the same line already sits on every other page.

### Option 2 — Put the three figures on the card

A compact *Across the term · Cost to leave · Charged today* on each tile, so the shop sells the product's actual value.

*How it feels:* thirty tiles times three amounts is ninety numbers in one screenful, for an audience the product exists to spare exactly that. It also puts the commitment before the product: a person who does not yet know what the thing is is asked what it costs them forever. The figures belong where the money is agreed, and a card is not that place.

### Option 3 — Add the description to the card

A line or two of the seller's copy, so the tile explains itself.

*How it feels:* the catalogue's descriptions are the hardest text on the site — 400-character retailer prose written to be found by search engines. Cutting them to a line produces a different claim than the seller made, and printing them whole makes the grid a wall of prose with products between it.

### Option 4 — Keep the wide row card and give the shop more width

Same card, more columns of it.

*How it feels:* still a list, now with wider empty space in each row. The shape is the problem, not the width: a horizontal row is a search result, and the shop is trying to stop being one.

## Reasoning

The deciding factor is **what a card is for**. A person scanning a grid is answering *is this the thing?* — a question answered by a picture and a name. Price is the second question, and it is the only number that belongs beside a product the shopper has not chosen yet. Every other fact either answers a question nobody has asked yet (the term, the exit) or answers it about our plumbing (where the data came from, how many retailers the search returned).

The second factor is **the same rule the rest of the product already runs on** (IPD 29): a standing fact about the store goes in the frame once; a finding about this answer stays on the screen. *Prices are the retailers' and they are live* is a standing fact, and it becomes one line. *Nothing here uses your words* is a finding, and it stays. *This demo does not sell or ship* is a standing fact that had been written on a product page — it moves three words into the frame's line rather than disappearing.

Option 2 is rejected because it front-loads the product's hardest output onto its least-selected screen; Option 3 because the seller's copy is evidence, not a summary, and the grid is not where it is read; Option 4 because a wider list is still a list.

## Tradeoffs

- The card now shows less about any one product, and a shopper must open a product to see the retailer count, the spread, or the rating. That is the intended trade — recognition is cheap, evaluation is a deliberate step — but it is a real reduction in what the grid can answer.
- The price line says *From*, which is the cheapest in-stock offer and may be at a retailer the shopper has never heard of. The product page carries the whole table; the card cannot.
- Removing the per-page sourcing sentences makes the shop look less careful to a reader who was reassured by them, and more like a shop that assumes its data is real. The foot line is the whole of the reassurance now.
- The `nothing ships` fact now lives in the frame line on every page, including pages about a document that was never going to ship anything.

## Notes

- `/read`'s example buttons and the shop's cards are now the two places the product says *start here*; they should not share a visual language, because one starts a reading and the other opens a product.
- The result line still counts how many results actually use the shopper's words (`matchingCount`). That function is not plumbing: it is the difference between an answer and a near miss, and the sentence it produces is about the results, not about the catalogue.
