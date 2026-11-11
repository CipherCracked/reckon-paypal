# IPD 30 — The Front Door Gets a Composition

**Status:** Decided (2026-11-12), implemented
**Date:** 2026-11-12
**Answers:** Problem tree Q1–Q4 of `../intro.md` — *what does a stranger meet in the first screenful; what can a landing page add; how does it look designed with no illustrations; what must the change not cost?*
**Serves:** ITD 26 (the figure leads), IPD 28 (one home in two states), IPD 29 (one quiet line), IPD 21 (the entry shows the work). Supersedes the figure-grid half of ITD 27 (the card no longer answers to a container query; the figures are one ledger at every width) and the two-up arrangement ITD 26 assumed for `Full`.

---

## Problem to solve

`/` was a correct page laid out as a document. The headline, the promise, the audience, the seller's paragraph and the three figures all sat in the same 46rem column at nearly one size; the seller's panel was a filled box of the same weight as the figure card; the page's left edge stopped 200px inside the header's. Nothing was in charge, so a visitor's first three seconds went on working out where to look — on the one screen whose whole argument is *the number is the point*.

The page had two surfaces of equal weight, which is a page of two boxes with no answer to which one matters. It had a figure at body size and a headline at headline size, which makes the sentence about the product louder than the product. And it had no shared edge with its own frame, which is what makes a page read as a sheet pinned to a wall rather than as the store's front.

None of this was a missing section. A landing page conventionally answers *why should I care* with a slogan, two buttons and three icon cards; this front door answers it with a live commitment read at request time, and every conventional section that could be added — logos, testimonials, plans, an illustration — would either be untrue of a one-day solo build or would put a figure on the page that no code derived this load.

## Options

### Option 1 — **One composition: the card is the object, everything else is paper**

`/` takes the header's 64rem edge. The headline steps up one type size and is held to 20 characters a line, so it reads as a headline and still loses to the figure: 44px against 56px at 1440, 32px against 40.5px at 390. The promise and the audience become two ranks — a sentence at body size, then one line at `--text-sm` naming dyscalculia, ADHD and dyslexia. The seller's words lose their fill, their border and their padding and sit directly on the paper, in the column a document is read in.

The figure card stays the only raised surface, and gains a 2px ink rule along its top like the total line of a receipt. Inside it the three figures become one ledger: a hairline between them, each label on the left, each amount on the right edge in mono at display size, the first one larger than the rest, and the arithmetic and the quoted sentence under the amount they belong to. `Not stated` is set at the size and weight of an amount, in ink — the absence is an answer, and the answer is the one the page is proudest of.

The trace that the other screens draw — an accent rule from a sentence to the figure it produced — was impossible on `/` because the worked listing says nothing about leaving. It is not impossible for the term: *6 month BarkBox plan* is a verbatim span of the seller's paragraph, and the term figure exists only because that sentence exists. So the span is now marked where the seller wrote it, and the same wash sits under the figure it produced, with the sentence quoted in the mark and attributed: *"6 month BarkBox plan" — the term the listing states.* One mark in the paragraph, one under the figure, both the same colour: the correspondence is seen rather than explained, and not a word was added to the page to say it.

*How it feels:* a stranger lands on a page with one edge, one headline, one promise, one object. The object is a number with a receipt's spine; beside it the shop's own paragraph, with a highlighted phrase. Following the highlight down the card finds the same phrase under the largest figure. Six seconds in, they know what the product does, who it is for, and how it knows.

### Option 2 — A conventional landing page above the proof

A hero with the slogan, a subhead, two buttons, then three icon cards, then the working proof below the fold.

*How it feels:* recognisable, and it puts the product underneath a page about the product. The visitor's first screen would be claims — a category this build cannot honestly fill (no customers, no logos, no plan tiers) — and the live commitment, which is the only thing here a judge cannot see elsewhere, would start below the fold at 1440 and two screens down at 390. It also inverts ITD 26 on day two of it: the largest mark on the page would be a sentence, not the total.

### Option 3 — Widen the page and stop

Take the 64rem edge and the new type scale, and leave the two panels, the two surfaces and the body-size figures exactly as they were.

*How it feels:* roomier and still undirected. The width change is the least of the three problems: the page still has two objects of equal weight, and a wider page with two equal boxes reads as a bigger page of two boxes. Two days of decisions about which figure leads and which sentence is the seller's would be spent for the width of a margin.

### Option 4 — Build the blind review's page

An agent that had seen no code, no docs and no screenshots was asked to design this front door from a description of the product, the audience and the situation, and returned a full treatment — including its own example: a coffee subscription, a stated closure fee, the seller's paragraph rewritten to carry both spans.

*How it feels:* coherent, and about a different listing. The owner has explicitly deferred changing the worked example, and the review's marks and its $42.50 existed only because it had invented a listing with a fee in it. Built literally, the page would have shown a figure the code did not derive, which is the one thing the product will not do.

## Reasoning

The deciding factor is **what the page is allowed to be loud about**. Three passes had already decided that the figure is the point, that every figure carries the sentence it came from, and that the store says its limits once at the foot. A composition that put a slogan on top, or gave the seller's panel the same fill as the card, would not be a different design — it would be an argument against those decisions made with layout rather than words. Once the page has to be loud about one object, most of its shape follows: the object gets a heavier rule and a raised surface, the text beside it becomes paper, the amounts align on one edge so three figures read as three sizes of the same thing, and the headline is sized to lose.

The second deciding factor is **what the review could see that the CSS could not**. Working blind, it argued for paper rather than glass, no italics anywhere, no all-caps labels, one surface instead of two panels, amounts aligned on a decimal edge, absence set as an answer rather than as a dash — and the largest single point, that the front door should *show* the trace instead of describing it. None of those needed the code to find, and all of them were cheap. Its example listing, its $42.50 and its rewritten seller paragraph were the one thing that could not survive: they would have required inventing content the listing does not contain. Option 4 is rejected for that reason alone, and the rule that came out of the rejection is that the *treatment* may come from outside and the *content* may not.

That is also why the mark is set on the listing's own words rather than on a demonstration sentence. The blind review's best idea — a visible link between a sentence and the number it produced — turned out to be buildable from data the front door already had. The term total was never a computation over the whole listing; it is the price multiplied by a count, and the count is a span of the seller's sentence. Carrying that span as `termQuote` through `resolveProduct` gives the page one quotable thing without changing the example, and the mark then does the job the review wanted done with an invented fee.

Option 2 is rejected because a landing page is a page of claims and this build's claims are all observations; Option 3 because it treats the symptom — the edge — as the problem.

## What the review changed, and what it did not

| The review's point | Outcome |
|---|---|
| Show the trace on the page, not describe it | **Adopted**, on the listing's own term span: mark in the paragraph, same wash under the figure |
| Paper, not glass — one surface, no translucency | **Adopted**: the seller's panel loses its fill; the card is the only raised surface |
| Amounts right-aligned on one decimal edge | **Adopted**: one ledger, three amounts on one edge, tabular figures |
| Absence set as an answer, never a dash or a zero | **Adopted**: `Not stated` at the size and weight of an amount |
| No italics in a quotation | **Adopted** as a standing rule: the accent rule and the wash carry *someone else's sentence* |
| No all-caps labels | **Adopted**: labels stay sentence case; the audience list rejected capitals for the same reason as italics — they slow the readers this is for |
| A worked example with a stated exit fee | **Not adopted**: the example is the owner's to change, and a fee would have had to be invented |
| A hero section, illustration and social proof | **Not adopted**: untrue of a one-day solo build, and a hero inverts ITD 26 |
| A distinct landing route for signed-in people | **Not adopted**: IPD 28 stands; the signed-in home is untouched |

## Tradeoffs

- **The seller's column is a third of the card's height and ends in empty paper.** Six sentences and three figures against one paragraph leaves roughly 600px of nothing beside the card at 1440. The obvious tidying — stretch the column and put the action at its foot — was built and looked at, and was worse: it carried *Check this commitment* a page away from the reading it follows from and left a button alone in the middle of space. A short column beside a long one, both starting on the same line, is the cheaper defect, and the action stays under the sentence it belongs to. Pinning the column instead is not available: `body` sets `overflow-x: hidden` to keep the page from scrolling sideways, which makes the body a scroll container and disables `position: sticky` inside it.
- **The promise is on the front door about being a landing page, and this page still has no section below the proof but the two ways in.** Anyone who wanted a conventional funnel will read the page as one screen and a footer. That is the shape of the product, and the alternative was sections that could only be filled with claims.
- **One new type step (`--text-hero`) and one new colour (`--mark`).** Both are tokens in the existing system rather than literals, and `--mark` is defined for both themes; the mark is the only colour on the page that is not the accent, the ink or the paper, and it appears twice, on purpose.
- **The doors row was three columns wide with two doors.** `auto-fit` fitted three tracks at the front door's new 1024px, and because the section's own label spans every track none of them was empty, so the pair stopped two thirds of the way across the page. Fixed in the same pass: two named columns above 44rem, one below. Visible only because the page finally has an edge to miss.
- **The figure card is now taller than it was.** The first amount is display size at every width and each figure keeps its arithmetic and its sentence, so on a phone the worked example runs past two screens before the seller's words. The order was already decided (IPD 29: the answer first, the evidence after), and the alternative — a smaller first figure — is the decision this document exists to keep.
- **A mark is not decoration and can disappear.** `QuotedText` marks a span only where it is found character for character, so a re-wrapped quote or a listing edited upstream silently loses its mark rather than moving onto the wrong words. `tests/quoted-text.test.tsx` pins the behaviour in both directions: the text is never altered, and nothing is marked when the span cannot be found.
