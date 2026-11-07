# IPD 9 — Outcome and Evidence

**Status:** Adopted (2026-11-07) — implemented: `comparison.md` is generated, and a drift test fails when it diverges
**Date:** 2026-11-07
**Answers:** Problem tree Q4 (rev. 3) — *What outcome is this product accountable for, and what can it show rather than assert?*

---

## Problem to solve

Ask what this product is for and there are four plausible answers, and they point in different
directions:

- **Comprehension.** The shopper understood the commitment. Testable in principle, hard to test
  without people.
- **A better decision.** The shopper bought or didn't, for a reason that would survive scrutiny.
  Unmeasurable without knowing what they would otherwise have done.
- **Less later regret.** The shopper is not surprised in month four. The real outcome — and
  unobservable to a product that keeps nothing about anyone.
- **Fewer forgotten renewals.** The harm the research actually quantifies — and, per IPD 8, outside
  what we can measure.

A product that will not say which of these it is accountable for can be praised for any of them and
held to none. That is a design failure before it is a measurement failure, and it is the question
most likely to be asked by anyone who takes the idea seriously.

There is a second half. No users will be recruited before submission. Anything offered as evidence
therefore has to be produced by a method that does not need participants — or be honestly labelled
as untested.

## Options

### Option 1 — Accountable for comprehension, evidenced by the recognition check

Treat the check's result as the product's outcome measure and report it.

### Option 2 — Accountable for decision quality, evidenced by abandonment

Compare how many shoppers complete payment with and without the screen.

### Option 3 — Accountable for legibility, evidenced by a side-by-side comparison

Publish, for every product the app handles, **what the merchant says** against **what the shopper
reads here** — and let a reader judge whether the second is clear where the first is not.

### Option 4 — Accountable for nothing until users have been tested

Build, state the hypothesis plainly, and claim no outcome.

---

## Reasoning

**Option 1 overclaims a weak instrument.** The recognition check asks the shopper to confirm one
amount against the page. That is a minimal comprehension check — enough to catch "I misread it", not
enough to establish understanding. Reporting a pass rate from it would turn a courtesy into a
statistic, and a self-selected one: the people who skip it vanish from the denominator.

**Option 2 is the trap.** Abandonment is the easiest thing to move and the worst thing to optimise.
A screen rewarded for stopping sales will grow louder until it stops them all — and the product's
stated position is that it offers no verdict (IPD 4). Measuring this would create an incentive
directly opposed to the promise.

**Option 4 is defensible and insufficient.** Refusing to claim anything is honest, but it leaves the
strongest asset unbuilt: we can *show* the difference between the two texts for the same purchase,
without a single participant, because we have both texts. The merchant's copy is in the catalogue;
our rendering is computed from it. Putting them side by side is not proof that someone understood
better — it is proof of what changed, which is the part that can be checked and argued with.

**Option 3 is the one that can be done today and survives scrutiny.** It is also the only option that
produces something a reviewer, a judge or a future collaborator can inspect rather than trust.

## Decision

**Option 3, with the limits of Option 4 stated on it.**

The product is accountable for **legibility**: that the commitment is stated in a form a reader who
cannot do the arithmetic can act on. Its evidence is a **documented comparison** for every product
the app handles — the merchant's own words, the companion's rendering, and a plain statement of what
each figure rests on. That comparison is a public artefact of the project, not a marketing claim.

Correspondingly, the product is **not** accountable for conversion, does not measure abandonment, and
claims no reduction in regret or forgotten renewals. The recognition check stays as a service to the
shopper — an optional self-check that takes them to the breakdown if the figure surprises them — and
its results are **not collected, aggregated or reported**.

**What would count as this product failing its own user**, stated so it can be recognised:

- A shopper reaches the payment button without the exit cost having been on screen.
- A figure appears that the shopper cannot trace to the merchant's terms.
- A caveat the seller buried is repeated in our summary as though it were settled.
- The screen is mistaken for advice, and a shopper defers to it instead of deciding.

## Tradeoffs

- **No impact number.** Presentation is a scored criterion and judges reward measurable outcomes;
  this decision gives up the easiest such number deliberately.
- **The comparison is a document, not an experiment**, and must be labelled as such wherever the
  product claims anything.
- **The recognition check loses its only measurable output**, which makes it harder to justify to
  anyone who asks what it is for. Its justification is the shopper's use of it, not our statistics.

## Notes

- The comparison belongs beside the product, not buried in the repo — it is the clearest single
  statement of what the app does.
- Any future claim of an outcome needs a method that does not depend on the people least likely to
  be reached by a product that asks for nothing.
- This IPD answers what the product is accountable for. It does not claim the product will achieve
  it — that remains the hypothesis IPD 3 records.

---

**Implemented — 2026-11-07.** The comparison exists as `comparison.md`, generated by
`npm run comparison` from the catalogue, `computeCommitment` and `presentFigures` — the same
functions the consent screen runs — so it cannot be edited to look better without the test
`tests/comparison.test.ts` failing. For each of the three products it quotes the seller's words,
lists the figures the shopper actually reads with their arithmetic, and reports what the copy does
and does not state: word count, money amounts written out, how many times the total across the term
appears (zero, in every product), and a reading level that the document itself flags as unstable
and non-probative. The recognition check is now tested to make no network call whichever answer it
is given, so the accountability this IPD claims and the instrument it refuses are both enforced by
the suite rather than asserted in prose.
