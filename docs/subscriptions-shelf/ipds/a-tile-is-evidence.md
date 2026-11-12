# IPD 41 — A Tile Is Evidence, Not a Verdict

**Status:** Decided (2026-11-12)
**Date:** 2026-11-12
**Answers:** Problem tree Q1 and Q2 of `../intro.md` — *on what evidence does a listing belong on a shelf of things that repeat, and what may its tile claim?*
**Serves:** the owner's queue item *the subscriptions shelf, deferred from R3*; IPD 33, which refused it until a listing's shape could be read; IPD 40, which kept the shop's cards and the shelf out of R1's change on purpose.

---

## Problem to solve

A shelf has to put a listing on it and say why. The product's one way of knowing what a listing is — the model reading its words — costs most of a minute per listing on the endpoint this demo runs on, measured. Thirty tiles read that way is half an hour. So either the shelf invents its membership (the four curated ids wearing a category's name, which IPD 33 refused), or it finds a claim it can make honestly without a reading.

The claim is available, but it is weaker than the one the product page makes, and the temptation is to print the strong one. A tile that says *6 monthly payments of $19.99* because the search matched the word *subscription* is the exact failure this product prevents — a total nobody read.

## Options

### Option 1 — **A listing is admitted because its own words say it repeats, and the tile quotes those words**

The shelf searches the catalogue for recurring-charge words. Each result's title and description are screened by the vocabulary the reader already uses, and a listing stays only when a phrase in its own copy states a length (*BARK 3 Month Subscription*) or a cadence (*billed and shipped on a quarterly basis*). That phrase is printed on the tile, in the merchant's words, as the whole of the tile's claim.

Nothing else appears. No term, no total, no "from $X a month". The tile says what made it a candidate and stops; opening it runs the reading, and the product page says what the term is, what it totals, and whether this product can schedule it at all.

*How it feels:* a person opens a shelf of twenty things that charge again, each captioned with the seller's own sentence — *the listing says "6-Month Subscription"* — and picks one because that sentence is the thing they wanted to know. On the next screen the same sentence is read properly, with the figures under it.

### Option 2 — Read every tile with the model, so the shelf shows only decided terms

Honest in the strongest sense: every tile would carry a term the model read and the server verified.

*How it feels:* the shelf is empty for thirty minutes, or it shows a spinner per tile and each one fills in at a different minute. Two people opening it at the same moment starve each other's quota. It is the right shelf for an endpoint that answers in a second.

### Option 3 — A shelf of the four curated subscriptions we already know

The listings whose terms are in `LISTED_TERMS`, which is also what the front door's worked example uses.

*How it feels:* four products, all beauty boxes and dog toys, presented as what the catalogue has. It is a shelf with our editorial hand on it, and IPD 33 refused it by name — the four ids *wearing a category's name*.

### Option 4 — A shelf of readings already in the cache

Whatever R1's warm-up has read since the process started: the curated listings, plus anything a recent visitor opened.

*How it feels:* the shelf's contents depend on which tiles happened to be warmed, so it is different for every visitor and changes during a demo. A shelf whose membership is an accident of process lifetime is not a shelf.

## Reasoning

The deciding factor is **which claims survive the fact that nobody has read the listing**. Option 2's claim is the strongest and the shelf cannot afford it. Option 3's claim is strong but its membership is ours, and a shelf of four is a shelf-shaped lie about a catalogue of millions. Option 4's claim is strong and its membership is arbitrary. Option 1 is the only one whose membership comes from the catalogue and whose claim comes from the listing: *these words say it repeats*, printed beside the words.

The second factor is **the vocabulary is already written, and already refuses the wrong things**. The reader's meaning checks exist because a warranty and a magazine use the same words for a period as a subscription does; a search for *monthly subscription box* returned three wall calendars and two extended service plans. A shelf that screens with the reader's own checks inherits those refusals, and a shelf with its own keyword list would grow a second, weaker opinion about what counts. The shelf and the product page can then make the same promise in different tenses: *the words say it repeats* now, *this is the term those words state* after the read.

The third factor is **what a person needs before deciding to open something**. They do not need the total on the shelf — they need to know whether this listing is the kind of thing they have. One quoted phrase answers that. Everything after it is what the product page is for, and IPD 40 already decided the page never shows a figure it did not read.

Option 2 is rejected on cost measured, Option 3 on the reason IPD 33 recorded, Option 4 on the fact that a shelf must be the same shelf for two people in the same minute.

## Tradeoffs

- **Coverage is the query words' and the vocabulary's.** A listing that renews each spring, or ships every 90 days, may be invisible; so may one whose copy never uses a word the vocabulary knows. The shelf is a sample of the catalogue, not a census, and the screen must not imply otherwise.
- **The quote is a clause, not a reading.** A merchant who writes *12 bottles* where the shelf's screen sees a length gets a tile that says something true and less useful than the page will.
- **A tile can lead to a page that disagrees with it.** The screen admits *billed quarterly*, the page reads it and says this product cannot total quarterly charges. That is the designed outcome — the shelf claims what the words say, not what the schedule is — but a shopper who expected a total meets a sentence instead.
- **Nothing on the shelf is warmed.** A tile's page still pays the full read; the shelf does not shorten the wait it leads to.

## Notes

- The tile prints the merchant's phrase and nothing else. The *no total* sentences (IPD 40) stay on the product page, because the shelf has not read enough to say them.
- The four curated listings are not treated specially. They appear if their words earn them a place, like any other listing — the shelf does not know the fixture exists.
- A listing whose sentence is rewritten tomorrow leaves the shelf tomorrow, with no stored membership to go stale. That is the same rule IPD 33 set for a curated quote.
