# IPD 31 — Say What Is Not There

**Status:** Built (2026-11-12), verified at 1440 and 390 in both themes
**Date:** 2026-11-12
**Answers:** Problem tree Q1 and Q3 of `../intro.md` — *which of the model's work can be shown truthfully, and how may it be shown without putting its vocabulary on the default screen?*
**Serves:** IPD 29 (one quiet line), IPD 30 (the figure leads), ITD 18 (the seller's published text). Constrained by the audience rule: no scanning, no new vocabulary.

---

## Problem to solve

The product has three different absences and treats all three as one kind of nothing.

When the seller's words state a figure, the screen quotes the sentence under it and the trace is visible. When the seller's words say nothing about a figure — the BARK listing says nothing about leaving — the figure reads **Not stated** and a grey sentence below it explains, in slightly different words on each of four screens, which kind of nothing this is. When the reader's document could not be read at all, another sentence appears.

So the product knows the difference between *the seller wrote nothing*, *we could not read it*, and *there is nothing to cancel* — `lib/commitment/published-exit.ts` exists to keep those apart, and its own header says why — and every screen renders that knowledge as a paragraph of grey prose a person has to read, on a page whose whole promise is that they do not have to read prose to understand a figure.

The cost is not only for the reader. The most product-defining answer this build produces — **the seller said nothing about leaving** — is the one a visitor is least likely to notice, because it is set as a footnote under a heading that says *Cost to leave*.

## Options

### Option 1 — **One named state per figure, in the figure, in the words a reader already has**

Every figure carries a state, and the state is one of three sentences with no jargon in them:

- **Stated** — the sentence is quoted under it (already true).
- **The seller's words don't say.** — silence. Not an error, not a zero, not a failure.
- **We couldn't read the seller's words.** — a reading that did not happen. Never the same sentence as silence.

The state replaces the per-screen notes rather than joining them: `.commitment-hint`, `relationshipSentence`, `EXIT_UNREADABLE_NOTE` and the four paraphrases collapse into one line with three possible contents, rendered by `FigureGrid` so all four screens say it the same way. The amount line is unchanged — *Not stated* still holds the figure's own place at the size of an amount — and the state is one short line beneath it, in the position where the arithmetic sits for a figure that has one.

*How it feels:* a person reaches *Cost to leave*, sees **Not stated**, and one line under it: *The seller's words don't say.* Two sentences instead of a paragraph, and the same two sentences on every screen they meet. They have learned the shape after one screen and can read the rest of the product at speed.

### Option 2 — Keep the per-screen prose, and make it the same on all four screens

Write the note once and reuse it verbatim.

*How it feels:* consistent and still a paragraph. The reader still has to read a sentence to learn which kind of nothing they are looking at, and the sentence sits where the arithmetic sits on other figures, so the two look alike from across the room. It fixes the drift without making the finding visible, and the finding is what this pass is for.

### Option 3 — A mark beside each figure: a tick, a question mark, a dash

One glyph per state, so the three absences are distinguishable at a glance.

*How it feels:* fast, and it turns a fact into a judgement. A cross beside *the seller's words don't say* tells a reader who cannot evaluate it that the seller did something wrong, which is advice delivered by a symbol rather than by a sentence. Greyscale, colour blindness and 125% text each break a different part of it, and the audience this product is for is exactly the audience for whom a glyph on a financial line is a prompt to guess.

### Option 4 — Collapse silence and unreadable into one *Unknown*

One state for every absence: we do not know what this costs.

*How it feels:* simpler on our side and a lie on the screen. A seller who published no exit terms and a reading that failed are different facts with different consequences — one means the agreement says nothing, the other means the product could not look. `published-exit.ts` was written to keep them apart; merging them on the way out would have been the reason not to bother in the first place.

## Reasoning

The deciding factor is **what an absence is allowed to look like**. An absence with a name is an answer; an absence with a shape is a gap. Every one of the three states is already known to the code, and the only reason a reader has to work to see which one they are looking at is that we chose to write it as a paragraph rather than to name it. Naming it costs one short line and no new words — the same words, in the same place, every time.

The second factor is **what a reader can learn once and reuse**. Four screens that each explain the same absence in their own sentence make the reader read the same paragraph four times; three fixed sentences make one thing worth learning. That is also the only version of this that survives the volume rule in IPD 29: the named state *replaces* prose, so the pass removes lines and adds none.

Option 3 is rejected because a mark is a verdict when the fact is neutral, and because the reader this product serves is the least served by a symbol they must interpret. Option 4 is rejected because the difference between *said nothing* and *couldn't read* is the product's reason for existing on the screens that report a failure.

## Tradeoffs

- **The seller is named in a sentence that is not about them.** *The seller's words don't say* is accurate and, on the wrong day, sounds like an accusation. The alternative — passive phrasing — hides the one thing the reader needs to know, which is *who* is silent.
- **Silence and failure now look almost identical.** Both put a short line under *Not stated*, and the only difference is which of two sentences it is. That is deliberate, and it means a reader who catches only the word *nothing* will not be misled about which one it was; a reader who reads the line will.
- **One state is invisible.** *Stated* is not written anywhere — it is the quoted sentence under the figure. Four figures, three states, two of them written out. The alternative was a third line saying *Stated* on every figure that already carries a quotation, which is a line telling the reader what the quotation is already showing.
- **`figureNotes` stays, narrowing.** The hook that lets a caller say what this particular absence is survives for figures whose absence is neither of the two named kinds, which today is the market listing's *paid once, so there is nothing to cancel*.
- **This pass does not add a figure to the front door.** It changes what is written under one that is already there, which is why it is affordable in the hours that remain.

## Built (2026-11-12)

- `lib/commitment/absence.ts` — the two sentences, once.
- `lib/commitment/published-exit.ts` — `EXIT_SILENT_NOTE` / `EXIT_UNREADABLE_NOTE` re-export them, so the four screens had nothing to change: they already passed `exitOutcome.note` through, and the wording underneath them is now shared.
- `components/FigureGrid.tsx` — the absent figure's state renders as `.commitment-state` instead of `.commitment-hint`.
- `app/page.tsx` — `relationshipSentence` and its paragraph deleted; the front door passes `figureNotes` for the exit figure and nothing else.
- `app/globals.css` — `.commitment-state` added (body size, ink, left-aligned); `.entry-relationship` removed. `.commitment-hint` stays for the one note it still dresses: the cancelled agreement's *what it was for, not what it will cost*, which sits under a figure that has an amount and is not a state.

Two things the build changed about the decision. **The state is in ink, not in the arithmetic's muted grey** — the position made them look like the same kind of line, and only the colour and the size separate *the working* from *the finding*; without that difference the change would have moved a footnote, not promoted it. **It is left-aligned while the amount and the arithmetic are right-aligned**, because a sentence set flush right gives the reader a ragged left edge and asks them to find the start of every line — which is the work this audience is already doing. Verified on `/` (the live BARK listing is silent on leaving) and on `/product/ch3-YyLUjLT` at 1440 and 390, light and dark: no horizontal overflow, no console errors.
