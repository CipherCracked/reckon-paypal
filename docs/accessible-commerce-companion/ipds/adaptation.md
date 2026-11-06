# IPD 10 — Adaptation

**Status:** Proposed
**Date:** 2026-11-07
**Answers:** Problem tree Q5 (rev. 3) — *How does it reach people who will never declare a need?*
**Builds on:** IPD 5 (Beneficiary Scope) — one universal rendering, no modes, no diagnosis.

---

## Problem to solve

The audience for this product will not raise its hand. Roughly a third of US adults read numbers at
the lowest measurable level; dyscalculia affects 3–7% of people and almost none of them have a label
for it. A screen that serves them only after they have identified themselves serves almost nobody.

IPD 5 settled the principle — design one rendering against the least numerate reader, no modes, no
declarations. It left a question open: a universal screen that is *good for everyone* is not
necessarily *best for anyone*. Two readers with the same difficulty can need different sizes, pacing
and media, and neither will say why.

What the evidence actually supports for this kind of content:

- **Large type, sans-serif, short lines, one idea at a time** is the consistent core of Easy Read
  guidance (16pt+, plain layout), and symbols can help comprehension for adults with learning
  disabilities (Jones et al., 2007).
- **But the effectiveness evidence is weaker than the guidance suggests.** Systematic reviews find
  limited proof that Easy Read improves comprehension (Sutherland & Isherwood, 2016), and Hurtado et
  al. (2013) ask directly whether it is easier to read. A product that ships an "accessible mode" and
  claims an effect is claiming something the literature does not give it.
- **Reader control is not the same as a mode.** Choosing a text size says nothing about a condition.

## Options

### Option 1 — One fixed rendering (as built)

The single layout, tuned to WCAG 2.2 AA. Every reader gets the same page.

### Option 2 — The default already accessible, plus three controls the reader owns

Larger base type, one idea per line, generous spacing **by default**; then, on request, text size,
a denser-or-sparser presentation ("show one figure at a time"), and read-aloud. Choices live in the
browser and never leave it.

### Option 3 — Named modes

"Standard" and "Easy Read" (or "Focus"), chosen at the door.

### Option 4 — Infer the reader's needs

Adjust the rendering from behaviour — hesitation, zooming, repeated reads, or a declared diagnosis —
without asking.

---

## Reasoning

**Option 3 is the thing IPD 5 refused, and it is also worse for the reader.** A mode asks a person to
categorise themselves before being served, and the people least likely to do so are exactly the ones
the product exists for. It also invites the claim that the accessible version is the specialised one,
which is the wrong framing: the main page should be the accessible one.

**Option 4 is a surveillance product wearing an accessibility badge.** Inferring a condition from
behaviour is unreliable, unconsented, and — the moment it is used to change what someone sees — a
decision about them made without them. It also requires exactly the retention IPD 4 forbids.

**Option 1 is respectable but leaves real needs unmet.** The evidence for Easy Read's *effect on
comprehension* is thin, but the evidence that people read large type more comfortably is not in
doubt, and someone who needs a bigger figure than we chose has no recourse at all in a fixed layout.

**Option 2 threads it**: default toward the least numerate reader — which is what IPD 5 promised —
and put the remaining variation in the reader's hands, where it carries no diagnosis and no claim
about effectiveness. Nothing about it requires the product to believe anything about the person.

**Read-aloud is included, with limits.** The page is already semantically structured, so screen
readers work; the browser's own speech synthesis extends that to readers who use neither a screen
reader nor a magnification setup. It uses no model, no key, no service. It is not a substitute for a
proper assistive technology, and the product should not present it as one.

## Decision

**Option 2.**

1. **The default is the accessible rendering**: larger base type, one idea per figure line, generous
   spacing, high contrast. No toggle needed to get it.
2. **Three reader-owned controls**: text size; presentation density (*one figure at a time* versus
   all three); and read-aloud.
3. **Nothing is asked, nothing is inferred, nothing leaves the device.** Preferences are remembered
   in the browser only, and the page works identically when they are unavailable.
4. **No mode, no diagnosis, no accessibility score shown to the reader.**

## Tradeoffs

- **Three controls are three more things to get right**, and a control nobody finds is decoration.
  They must be reachable by keyboard, announced, and not compete with the figures for attention.
- **"One figure at a time" changes reading order**, which affects how a screen reader traverses the
  list; the control must not fragment the semantic structure.
- **We cannot show that any of this improved an outcome**, by IPD 9's own standard. These are
  affordances, not evidence.
- **Read-aloud quality varies by browser voice** and will sound different for every reader. It also
  makes the page's tone depend on a synthesiser we do not control.

## Notes

- The controls are the only part of the product a reader configures, and configuring them must never
  be a precondition for a usable page.
- Symbol support (the Easy Read tradition's other half) is *not* adopted: the evidence is narrow, and
  a wrong symbol is worse than none for a figure whose meaning is precise.
- What this IPD does not decide: whether the product should ever speak the commitment unprompted
  (on the payment screen, for example). That is a timing question, not an adaptation one.
