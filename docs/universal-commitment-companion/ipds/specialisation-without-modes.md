# IPD 13 — Specialisation Without Modes

**Status:** Proposed
**Date:** 2026-11-07
**Answers:** Problem tree Q2 of `../intro.md` — *how is one thing both universal and specialised?*
**Amends:** IPD 5 (beneficiary scope) and IPD 10 (adaptation) for a product that now handles more than purchases.

---

## Problem to solve

The instruction this product was given is a tension: **work for everyone, and be specialised for the
people it was built for.** IPD 5 settled the first half — one rendering, no modes, no declarations —
by naming dyscalculia as the design target. IPD 10 settled the second half's mechanics — three
controls the reader owns. Neither answered the question the wider scope now forces:

**Do ADHD, dyslexia and dyscalculia actually need the same thing?**

The research says they do not fail the same way. Dyscalculia is a failure of number sense: the
quantity itself is not felt, so a stated total is not a number to the reader but a symbol. ADHD is a
failure of timing and inhibition: the amount is understood, and the payment is late, forgotten, or
made on impulse — the BNPL delinquency data (47% of users late in the past year) is a timing finding,
not an arithmetic one. Dyslexia is a failure of decoding: the figure is fine and the sentence around
it is expensive.

That is three different properties. The product has to serve all three, or "works for everyone" is a
slogan attached to a dyscalculia tool.

---

## Options

### Option 1 — Design against dyscalculia; let the others benefit by accident

Keep IPD 5 exactly as it is. One rendering, optimised for number sense, and if a reader with ADHD or
dyslexia finds it useful, that is a bonus rather than a promise.

*How it feels:* the same screen for everyone. The claim in the submission mentions three profiles; the
design mentions one.

### Option 2 — **One artefact, three properties: the figure, the schedule, the medium**

Every commitment already arrives as: a set of derived figures (what will this cost me), a schedule
(when, and what happens if I miss it), and text (which must be read or heard). The product makes all
three explicit on the same screen, for every shape — purchase, subscription and bill alike:

- **The figure** — dollars, with the arithmetic that produced it. The answer for a reader who cannot
  feel a quantity.
- **The schedule** — next charge or due date, the term's end, and what the product does *not* know
  about lateness. The answer for a reader whose failure is temporal.
- **The medium** — read-aloud, text size, one figure at a time. The answer for a reader for whom the
  text is the obstacle.

*How it feels:* one screen that answers three questions a different person would each ask first.

### Option 3 — Name the profiles and adapt to them

Ask, or infer, which profile applies, and change the rendering accordingly: "ADHD view", "dyslexia
friendly".

*How it feels:* personalised — once you have declared something about yourself.

### Option 4 — Three products

A numeracy companion, an attention companion, a reading companion, sharing a computation.

*How it feels:* three narrow tools, each plausible, none able to claim the crowd.

---

## Reasoning

**Option 3 is refused twice over and should stay refused.** It is what IPD 5 rejected (the people who
need it most will not select it), and at this scale it is worse than before: a profile-shaped product
classifies a person by diagnosis to choose their interface, and the classification leaks into every
screen after it. It also asks the reader to know and accept a label as the price of being served.

**Option 4 is a product portfolio, not a product**, and it would make "works for everyone" mean three
different things depending on which door you came through — the opposite of the claim.

**Option 1 is the current build, and it is not wrong so much as incomplete.** The figures are the
right answer for the reader IPD 1 named. But the wider scope brought bills and deadlines into the
product, and a bill's most consequential fact is *when* — which the current rendering has no place for
except as a receipt's calendar file. A reader with ADHD would find the current screen beautiful,
correct, and not about their problem.

**Option 2 is the same rendering, made to say everything it already knows.** It adds no mode, no
question, no stored preference — it adds the two properties that were implicit and are now visible on
every surface. The schedule is not a new feature: the subscription's next billing time, the invoice's
due date and the receipt's calendar entry already exist; they were simply not part of the screen that
claims to tell you what you are agreeing to.

**Where the properties conflict, the reader wins the conflict, not the design.** One-figure-at-a-time
pacing (IPD 10) hides the total from a reader whose difficulty is quantity; read-aloud is slower for a
reader who reads quickly; a schedule line adds a fourth thing to look at for a reader who wants three.
None of those are resolved by guessing a profile — they are resolved by the reader choosing, which is
exactly what the three controls already are. The default stays whole: all three figures, the schedule,
the text as written. Everything else is a request.

**What someone without any of these conditions gains** is the same thing everyone gains from a
well-drawn invoice: the total before the button, and the date it is due. That is not a consolation
prize; it is why "works for everyone" is a design claim rather than a charitable one.

## Decision

**Option 2.**

1. **Three properties, one screen.** Figures and schedule are always present; the medium is
   adjustable. No property is hidden behind a mode.
2. **The schedule is stated, or stated as unknown.** A due date, a next charge, a term end — or "the
   seller did not publish this". Never inferred.
3. **Lateness is named, not implied.** Where the product does not know what happens if a payment is
   missed, it says so on the screen, because the reader with ADHD is the one who will find out.
4. **No profile is named, asked for, or inferred** — IPD 5 stands unchanged, and IPD 10's controls
   remain the only personalisation.
5. **The copy never explains why the screen is shaped this way.** No "designed for neurodivergent
   shoppers" badge on the page: an artefact that announces its accommodation invites the reader to
   feel accommodated rather than served.

## Tradeoffs

- **A fourth element on the screen** (the schedule) against a design that ordered and limited what
  appears. It must read as a fact, not a fourth figure, and it must not push the figures below the
  fold on a phone.
- **Naming lateness honestly will sometimes make the product look harsher** than the seller's own
  copy, which is written to avoid it. That is the point, and it is a risk to the demo's tone.
- **Claims widen without evidence.** Serving three profiles is a broader claim than serving one, and
  IPD 9 forbids asserting outcomes. The submission must say the renderings are affordances, not
  measured effects.
- **"Everyone" is still not demonstrated.** Three properties are designed; three profiles are
  described. Anything stronger needs users we do not have.

## Notes

- This supersedes nothing. IPD 5's prohibition on modes and IPD 10's reader-owned controls are both
  load-bearing here; this IPD adds what the screen must *contain* now that a commitment can be a bill.
- The comparison document (IPD 9) must be regenerated to show the schedule line too, or the evidence
  will describe a screen the product no longer has.
- Open, and deliberately unresolved: whether the schedule line belongs above or below the figures. It
  is a reading-order question for the same test that ordered the figures.
