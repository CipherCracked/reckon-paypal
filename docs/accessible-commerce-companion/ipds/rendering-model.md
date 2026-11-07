# IPD 7 — Rendering Model

**Status:** Adopted (2026-11-07) — implemented in `lib/commitment/present.ts` (`FIGURE_ORDER`)
**Date:** 2026-11-07
**Answers:** Problem tree Q1 (rev. 3) — *Is "translate it into three dollar figures" the right intervention at all?*
**Supersedes in part:** IPD 3 (Assistance Model), revision of 2026-11-07, which demoted the
three-figure rendering to a hypothesis and left the unit and the order open.

---

## Problem to solve

The companion's whole claim is that a commitment, restated well, can be judged by someone who cannot
do the arithmetic. The arithmetic is settled — code computes it, integers, tested. What is not
settled is the *presentation*: which figures appear, in what unit, and in what order.

That is not a cosmetic question. The evidence says presentation changes comprehension and, in some
directions, changes it for the worse:

- **Reducing and ordering information improves comprehension**, most of all for readers low in
  numeracy (Hibbard et al.). Completeness is not the goal; selection is.
- **Low-numeracy readers are more attracted by percentage formats** than by absolute amounts
  (Graffeo & Bonini, 2018) — the format that *feels* easier can bias the judgement.
- **Natural frequencies beat percentages** ("12 payments of $12", not "about 40% more") in medical
  and payday-loan settings alike (UK BEIS review).
- **Per-period framing flatters large commitments.** "$2.70 a day" for a $999 annual sum normalises
  comparison but makes the total feel smaller — useful for comparing, dangerous for consenting.
- **Plain-language summaries routinely exceed the reading level they aim for**; medium reading level
  and following a guideline both help (systematic review of plain-language summaries).

Our current screen shows three figures in chronological order — today, across the term, cost to
leave — beneath a model-written summary. Nothing about that order or that unit was ever chosen
against evidence.

## Options

### **Option 1 — Three dollar figures, ordered by decision weight, with the arithmetic shown**

Across the term first, cost to leave second, charged today third. Every figure in dollars, each with
the equation that produced it ("12 × $12.00"), and no derived unit that the merchant did not state.

### Option 2 — Keep the current order (today, term, exit)

Unchanged from the build. Chronological: what leaves your account now, then what the whole thing
costs, then what it costs to leave.

### Option 3 — Multi-unit presentation

Show each figure in two units at once — total and per-period, per-period and per-day — so the shopper
can see the commitment at more than one scale.

### Option 4 — One figure, chosen for the shopper

Reduce to the single figure the companion judges most consequential, with the rest one disclosure
away.

### Option 5 — Model-generated phrasing of computed figures

The model writes each line as a sentence, given the numbers, rather than the page templating them.

---

## Reasoning

**Order is the decision, because order is the only lever the evidence points at directly.** Reduction
and ordering are what improve comprehension; adding more remains the one thing known to hurt. Option
2 is chronological, which is the merchant's framing — today's charge first is exactly what the page
being explained already emphasises. Restating the number the shopper just saw adds nothing, and
buries the two they cannot compute: the term total and the exit.

**Dollars, with the arithmetic.** Option 3's per-period and per-day framings are rejected for this
task. They normalise comparison, which is a different job, and they make a large commitment feel
small — the precise bias the product exists to remove. Frequencies are kept in the honest form the
evidence supports: the count and the amount shown as a multiplication, not as a percentage.

**Option 4 goes too far.** Choosing one figure for the shopper is the companion making the judgement
it promised not to make (IPD 4, no verdict). It also assumes we know which figure changes this
shopper's decision, which we do not.

**Option 5 changes no number and adds risk.** Templated phrasing keeps the model out of the
presentation entirely, and the model's schema has no monetary field for good reason (ITD 2). The
model's proper work is language the catalog cannot anticipate — merchant jargon and fine print — not
rewording figures we computed ourselves.

## Decision

**Option 1.** The screen presents, in this order:

1. **Across the term** — the total the commitment costs if it runs its course, with its arithmetic.
2. **Cost to leave** — with "Not stated" where the seller has published nothing, never $0.00.
3. **Charged today** — last, because the merchant has already made it unmissable.

Every figure stays in dollars. No percentages, no per-day or per-month framings, no derived unit the
merchant did not state. The itemised breakdown remains beneath, with its source line.

## Tradeoffs

- **The most familiar figure moves to the bottom.** A shopper who came to check "what am I paying
  now" has to look past two larger numbers. Accepted: the product is for the shopper who cannot see
  the larger ones.
- **Reordering contradicts a merchant's emphasis**, which is a small editorial act with consequences
  (IPD 4 now says so explicitly). The page must therefore say what it did, not merely do it.
- **The evidence is indirect.** No study tests this order on this population; the decision is
  inference from adjacent findings, and should be revisited the moment the recognition check gives
  us a signal.
- **Unchanged risk.** A commitment whose exit cost the seller never published still has a gap in the
  most decision-changing position on the screen.

## Notes

- The order lives in one place in the code and is expressed as data, so a comparison between variants
  is possible without touching the money computation.
- The recognition check stays where it is: after the figures, optional, never a gate.
- What this IPD does *not* decide: where the merchant's own words should appear, if anywhere. A
  shopper may want the seller's framing available for comparison, and that is a question for the
  next revision, not an omission to be filled by guesswork.

---

**Implemented — 2026-11-07.** The screen now reads Across the term, Cost to leave, Charged today,
each with its arithmetic in a quieter line beneath (`12 × $12.00`, `$47.99 + $6.95 + $4.01`,
`1 of 12 payments`). Eight new tests cover the order, the three shapes, the shipping-charged-once
case, and the rule that no arithmetic line may contain a percentage or a per-day rate. Suite 80/80.
