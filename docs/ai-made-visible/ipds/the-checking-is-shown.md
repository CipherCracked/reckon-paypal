# IPD 32 — The Checking Is Shown

**Status:** Built (2026-11-12), verified at 1440 and 390 in both themes
**Date:** 2026-11-12
**Answers:** Problem tree Q1, Q2 and Q3 of `../intro.md` — *what must a judge see to believe the AI is load-bearing, and where may that live without costing the reader a step?*
**Serves:** ITD 18 (verified spans), ITD 19 (the figure carries its sentence), ITD 20 (a reading may be remembered). Requires ITD 29 (a refused span is still the model's).

---

## Problem to solve

On `/read` the product does the most substantial thing it does — a model that may only point, a server that checks every pointer against the text, arithmetic that is not the model's — and it reports the whole mechanism in one sentence at the top of the result: *"Took 2 quotations from your document, each checked word for word. Every figure was worked out here, not by the model."* When a span fails the check, the same sentence adds a clause with a number in it: *"1 sentence the model offered could not be found in your text and was discarded."*

The count of discards is the single most convincing fact in the build — it is the product catching its own model — and it is presented as an arithmetic problem for the reader to work out, on the one screen whose purpose is to spare them arithmetic. Nothing on any screen shows *which* sentence was refused, so the claim that anything is checked has to be believed rather than seen.

The second half of the problem is where this could live. The screen a judge meets first is `/`; the screen where the AI is load-bearing is `/read`; and a demonstration that requires a paste is a demonstration a judge may never reach.

## Options

### Option 1 — **One quiet line under the figures that opens into what was checked**

The result keeps its three figures exactly as they are. Under them, where the provenance line already is, one closed line:

> *Read 2 sentences from your document. Checked against it word for word.*

Opening it lists what was taken — the spans, each with the figure it produced — and, only when there was one, the span the model offered that was **not** in the text, set apart and labelled in plain words: *the model suggested this; it is not in your document, so nothing was read from it.* Nothing on the line is a number the reader has to interpret, and nothing on the closed line changes shape depending on whether a sentence was refused.

*How it feels:* the reader gets their three figures with one quiet line under them, which is one more line than today and one fewer sentence. A sceptic — a judge, a friend, the person who does not believe software — opens the line and finds the mechanism, including the moment the model was wrong. Neither costs the other anything.

### Option 2 — Put the refused sentence on the result itself, unopened

When the model offered a span that failed the check, say so in a line under the figures with the text of the span in it.

*How it feels:* honest and badly placed. The landing state of a result would then flicker between two shapes depending on how the model did that minute, and the reader's first impression of the product would sometimes be an account of a mistake. It also puts the word *discarded* — a pipeline word — in front of a reader whose difficulty is with exactly this kind of vocabulary.

### Option 3 — Say nothing at all beyond the existing sentence

Keep the mechanism in the documentation and in the demo's narration.

*How it feels:* today, and the reason this document exists. A claim of checking with no evidence is discounted by anyone who has built one, and the four sentences of prose that describe the mechanism are the lowest-value sentences on the page — they are the product talking about itself in the place where it should be showing the numbers.

### Option 4 — A separate "how this was read" page

A route that explains the reader, the guard, the verification and the three states, linked from the result.

*How it feels:* a technical appendix. It is a second route for the proof, it competes with the three figures for the reader's attention, and it is the one thing a judge with three minutes will not click. It also invites the documentation to grow on a screen where documentation has already cost this product two passes.

## Reasoning

The deciding factor is **who the evidence is for**. The reader came for three figures and wants the sentence that produced them; the sceptic wants to know that the machine was checked. Those are not the same reader and they do not want the same screen depth — but they want the *same place*. A closed line is the only shape that serves both: it is one line of ordinary words for the person who will never open it, and it is the whole mechanism for the person who will.

The second factor is **what "shown" has to mean to survive inspection**. Showing the count tells a reader that something was thrown away and asks them to take our word that it was the model's mistake and not a sentence we did not want. Showing the sentence, marked as the model's and never as the document's, moves the fact from our claim to their eyes. That is the difference between a product that says it verifies and one where verification is visible happening.

Option 2 is rejected because it makes the mistake the default view rather than the discoverable one, and because it puts the vocabulary on the landing state — which is the same defect, in words, that the audience rule forbids in layout. Option 4 is rejected because a proof that lives on its own page is a proof nobody reads; the mechanism belongs under the figures it produced.

## Tradeoffs

- **One more element under the figures.** The result screen is the densest in the product, and this adds a disclosure to it. It is closed by default, it sits where the provenance line already sits, and it replaces a sentence with a shorter one — but it is a control, and the count of controls on that screen goes from three to four.
- **A refused span has to be retained.** Today only the count survives verification. Carrying the span means carrying model output that is deliberately **not** in the document, which is a different kind of thing to render than anything else on the screen — see ITD 29 for what may be shown and what may never be done with it.
- **The line is quiet, and quiet is a risk.** This pass exists because the AI is invisible; a disclosure that nobody opens leaves the product exactly as invisible as it is now, with more code. The video has to open it, and the front door has to keep pointing at `/read` — which is the sequencing decision in `../intro.md` Q2, not a software one.
- **It does not move the worked listing.** The verifiable mechanism lives on `/read`; the front door's figures are deterministic and stay so. Anyone who judges the AI by the first screen alone will still see a product that does arithmetic — which is true, and is why the first screen is not where the demonstration can be.
- **Two sentences, one of which is a count.** *Read 2 sentences* is still a number on a screen for people who find numbers hard. It is small, it is not money, and it is the only count on the page that is not a figure — but it is a compromise, and the alternative (*"everything below came from your document"*, with no count) loses the one detail that makes the check feel real.

## Built (2026-11-12)

- `lib/document/refused.ts` — `refusedSpans(offered, accepted)`, capped at three spans of three hundred characters, partitioned by identity so one of two identical offered spans can be the refused one. Clipping ends in an ellipsis: the text is never evidence, but a cut still has to look like one.
- `lib/document/answer.ts` — the reading carries `refused?: RefusedSpan[]` beside the count. `verifyQuotations` is untouched: it is shared with the seller's published text, where a reader has nothing to show and a count is the whole answer.
- `components/ReadingCheck.tsx` — the **only** component that renders a refused span, as plain text with no `<q>`, no `<mark>` and no arithmetic parsed out of it.
- `app/read/page.tsx` — the counts paragraph is gone; the panel sits under the card, where the provenance line already was, so the figures start where the answer starts.
- `tests/document-refused.test.ts` (6), two new tests in `tests/read-page.test.tsx`, and the two that pinned the old paragraph now pin the disclosure.

Three things the build decided that the document had not.

**The body is not built until the line is opened.** A `<details>` whose children are merely hidden still puts every quotation on the page twice — in the DOM, for the tests, and in a screen reader's browse order. Closed is the state almost every reader sees, and it has to be one line, not a panel with the brakes on.

**The taken list is headed *The sentence behind each figure*, not by the count.** The line above says five sentences were checked and the list shows three, because a sentence can produce two figures and terms that produce no figure still pass the check. A list headed by the same number would promise five and show three.

**A live refusal could not be produced on demand.** Six documents were posted to `/api/read`, including one with two misspellings and one with typographic apostrophes, and the model copied every span verbatim — `rejected: 0` each time. The panel's most convincing state therefore cannot currently be demonstrated without a document the model actually misreads. The renderer is covered by tests; the video's demonstration of it is not yet possible, and that is a gap rather than a risk to the claim.
