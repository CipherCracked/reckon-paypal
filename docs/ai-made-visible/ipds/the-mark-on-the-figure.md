# IPD 43 — The Mark on the Figure

**Status:** Built (2026-11-12), verified at 1440 and 390 in both themes
**Date:** 2026-11-12
**Answers:** Problem tree Q1 and Q3 of `../intro.md` — *which of the model's work can be shown truthfully, and how may it be shown without putting the mechanism's vocabulary on the screen?*
**Serves:** IPD 32 (the checking is shown), ITD 19 (the figure carries its sentence). Requires ITD 37 (the mark is the screen's claim).

---

## Problem to solve

The reader page already carries the model's trace: a figure, the arithmetic that produced it, and the sentence the figure came from, quoted and attributed. What that trace does not say is that **a model did any of it**. A quotation under a figure looks the same whether a model pointed at it in a document somebody pasted a second ago, or a person transcribed it into a catalogue by hand.

That is the deletion test in one line. A judge who imagines removing the AI from `/read` sees three figures with sentences beside them and has no way to tell that the sentences were found by a model rather than by a regular expression, a lookup table, or an intern. The product's strongest claim — *a model read your document and every word of it was checked against your text* — is currently made in a document, in the video's narration, and nowhere a visitor can point at.

The screen also has to avoid the opposite failure. The commitment screens render quotations out of `LISTED_TERMS`, curated text that no model touched, in exactly the same shape. A mark that appears wherever there is a quotation would therefore be false on half the product — a claim about provenance on the one screen whose whole purpose is provenance.

## Options

### Option 1 — **One line inside the quotation's own block, on every figure the reading produced**

Under the attribution *— Seller's description* and inside the same block as the sentence, one line in ordinary words:

> Read by the model, checked against your text.

It appears once per figure that carries a sentence, in the same words every time, and only on a screen that says its sentences came from a model.

*How it feels:* the reader who only wants the arithmetic reads one more quiet line and moves on. The reader who came to see the AI working can point at the exact sentence it read and at the sentence that says a check happened, without opening anything and without learning a single new word.

### Option 2 — One sentence at the top of the result, covering the whole page

Under the heading: *"A model read this document. Every sentence below was found in your text and checked word for word."*

*How it feels:* tidier, and weaker. It is a claim about the page rather than about the thing on the page, so it asks for trust in exactly the place where the product has proof. It also cannot say anything about a *particular* figure, and the figures are what the reader is looking at.

### Option 3 — A small badge or icon beside each figure

A pill, a tick, a dot of colour next to each amount, with the meaning explained elsewhere.

*How it feels:* the vocabulary problem moved into a symbol. Nothing on the badge says what it means unless the reader already knows, and colour is the one channel this audience can least afford to be asked to decode — worse, a badge beside an amount is read as a judgement about the amount.

### Option 4 — Say nothing; let the disclosure carry it

IPD 32's disclosure already says *Read 3 sentences from your document. Checked against it word for word.* Leave the model's involvement at that depth.

*How it feels:* the closed line is exactly where a judge will not look. The product spends its most convincing sentence on the state almost nobody opens, and the figures — the thing on the screen — continue to look machine-independent.

## Reasoning

The deciding factor is **where the claim can be checked**. A statement about the page is a statement the reader has to accept; a statement attached to one quotation is a statement they can verify by looking at the quotation. Putting the mark inside the block it describes — not beside the figure, not above the figures — means the sentence and the claim about it are read together, and a reader who doubts one can examine the other without leaving the line.

The second factor is **repetition as familiarity**. Three identical lines are, on the page, three near-restatements of one fact. They are also how a reader learns a mark once and never has to interpret it again: the same words, the same place, on every figure. Option 2's single sentence is less repetitive and less learnable, because there is no shape to recognise — only prose to reread.

Option 3 is rejected because it hands the meaning to a symbol and a colour, which is the same defect as putting pipeline vocabulary on the screen, with less to read and more to guess. Option 4 is rejected because it is today's state, and today's state is the reason this document exists.

The mark is deliberately **not** an inference. It is passed by the screen (ITD 37), because the commitment screens' curated quotations are indistinguishable from read ones, and a mark that appeared beside them would be a false claim about the product's own history.

## Tradeoffs

- **Three more lines on the densest screen in the product.** They are small, muted, and set at the quotation's own size rather than below it, because a provenance line the reader must strain for is a provenance line only for people who do not need it — but the result screen does get longer, and the figures no longer sit alone.
- **It is muted, and muted is a risk.** This pass exists because the AI is invisible. A line in `--ink-muted` is one the eye may skip, and a judge watching a video may not read it. The mitigation is the video, not the styling: the recording has to land on it.
- **It cannot appear on the front door.** The worked listing's figures are deterministic and its one quotation is curated, so the screen a judge meets first gains nothing from this. The visibility of the AI remains a property of `/read`, which is the sequencing argument in `../intro.md` Q2 rather than something this document can fix.
- **It repeats a claim about the check that the check also makes.** The disclosure counts the sentences and the mark says each was checked; a reader who opens the disclosure sees both. That is one redundancy on purpose — the closed state carries no count, so without the mark the disclosure is the only place the model is mentioned.
- **A screen can lie by passing the flag.** The wrong `modelRead` on a screen with curated quotations is a false statement about provenance that compiles cleanly. The test pins the honest case on `/read` and the silent case elsewhere; nothing in the type system prevents a future caller from getting it wrong.

## Built (2026-11-12)

- `lib/commitment/provenance.ts` — the sentence, in one place, with the rule that it is the screen's claim and never inferred.
- `components/FigureGrid.tsx` — a `modelRead` prop, off by default, rendering the line inside `.commitment-quote` after the attribution.
- `components/CommitmentView.tsx` — forwards the prop to the grid.
- `app/read/page.tsx` — the one screen that passes it, because every quotation on that answer was cut out of the pasted text by a model.
- `app/globals.css` — `.commitment-check`: block, muted, never italic, never smaller than the quotation.
- Two tests in `tests/read-page.test.tsx` (a mark on each sourced figure), and one in `tests/commitment-view.test.tsx` covering both halves — no mark without the prop, exactly one in the exact sentence with it.
