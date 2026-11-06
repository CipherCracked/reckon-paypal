# Universal Commitment Companion — Problem Decomposition

**Status:** Draft
**Date:** 2026-11-07
**Builds on:** `../app-completeness/intro.md` (rev. 3) and the ten decision records it produced.
**Question this document exists to answer:** *What is this product, if it is not a demo checkout?*
**Context:** PayPal AI Hackathon 2026 · solo · submissions close **2026-11-12, 5:00 PM EST** (5 days)

---

## Why a second tree

Rev. 3 asked one large question — is the three-figure rendering the right intervention, and who would
show it — and answered it. The build that came out of it is a demo store with a consent screen, a
receipt, three reader controls, and a generated comparison document. All of that is coherent, and all
of it is bounded by a decision made on day one for expedience rather than principle: **the product is
a page inside our own store.**

That boundary was defensible when the question was "which rendering". It is not defensible when the
question is "does this help anyone in their actual life". The demo store sells three made-up products
to a shopper who arrived because we asked them to. Nobody's real commitment looks like that.

The user's framing, which this tree takes as its starting point: **it should work for everyone, and
be specialised for the people it was built for** — dyscalculia first, with ADHD, dyslexia and other
cognitive differences served by the same thing. Rev. 3's Q5 asked how to reach people who never
declare a need. This tree asks a larger version: *reach them where they already are, about decisions
they actually make.*

This is a decomposition, not a plan. It does not choose a scope, a surface, or a technology.

---

## Problem Statement

A person with a cognitive disability meets the same shape of difficulty far more often than they meet
a checkout: a bill with a total and a due date, a benefits letter with a change in payment, an
insurance plan with a deductible and an out-of-pocket maximum, an invoice, a subscription that
renewed, a contract with a term and an exit fee. In each case the numbers that decide the question are
*derived* — a sum, a rate, a difference from last month — and the document states the inputs, not the
answer.

The current product answers that shape exactly once, for a store we invented, for a purchase the
shopper has to be talked into visiting.

So the problem is two-sided:

1. **Breadth.** The mechanism (state the derived figure, in dollars, with its arithmetic, in decision
   order) is not specific to checkout. It applies to almost any money document. The product's current
   shape hides that.
2. **Specificity.** Broadening risks the opposite failure — becoming a generic "simplify this text"
   tool that is good for no one in particular. The specialised thing the current product does (name
   the three figures that decide a commitment, in the order that decides it) is what makes it useful.
   Whatever widens must keep that spine.

---

## Background and Context

### What the evidence says the target group actually struggles with

| Finding | Source | Confidence |
|---|---|---|
| Dyscalculia in adults shows up less in formal arithmetic than in everyday tasks: working out change, judging a discount, time, measurement, splitting a bill, estimating a shopping total | Vigna et al. (2022) via NeuroMoney; Learning Disabilities Association of America | Medium |
| Adults with ADHD are ~4× as likely to impulse-spend often (48% vs 12%) | The Guardian, 2022 (survey) | Medium |
| Adults with ADHD are ~3× as likely to miss bill payments (49% vs 18%), and impulsive spending plus late fees/overdrafts/forgotten subscriptions is estimated at £1,500–1,700/year | Monzo research via Augmentive (secondary) | Low–Medium |
| ADHD is associated with measurable difficulty in financial decision-making versus controls | Bangma et al. (2019), via PMC review | Medium |
| Low numeracy impairs comprehension of risk and benefit, affecting insurance and medical decisions — not just shopping | PMC2844786 (numeracy and risk comprehension) | High |
| Health-insurance documents demand numeracy skills beyond what many adults hold; low-wage earners are a documented gap | ProLiteracy research journal | Medium |
| Over half of people who did not contest a medical bill were unsure whether they had the right to | AJMC survey summary | Low–Medium |
| Automated accessibility scanners catch DOM defects, not whether a page is understandable; overlays are sold for compliance | TestMu AI, W3C WAI tools list, vendor critiques | Medium |

**What this changes.** The checkout was the sharpest *demonstrable* moment. It is not the most
frequent, not the most consequential, and not the one the research describes most often. Bills,
insurance and benefits are where low numeracy is documented to cost people money — and where the
"derived figure the document doesn't state" pattern repeats monthly.

### What already exists, and where the gap is

- **Merchant-side overlays** (accessiBe, AudioEye, Recite Me) are compliance products sold to sites.
  They do not translate a commitment, and they cannot know what a purchase costs across its term.
- **Post-purchase monitors** (Rocket Money, ~5M users) work from bank feeds after the fact. They find
  the charge; they do not help decide it.
- **Cognitive-support tools** (Goblin Tools, Tiimo, Speechify) cover tasks, schedules and reading —
  not money.
- **Bank and platform accessibility features** are structural (screen readers, contrast, text size),
  not semantic.

Nothing found in research does the specific thing this product does — restate a commitment as the
figures that decide it — anywhere other than a checkout we control.

### What changed in the data landscape

Product and merchant data is no longer necessarily something a store has to hand over.
**Channel3** (YC S25) exposes a real-time, storefront-agnostic catalogue of products, variants,
attributes and merchant offers across the web. If real product terms can be obtained without a
merchant's cooperation, the "curated local catalogue" constraint that shaped the current build is a
choice rather than a limit. *(This is a statement about what exists, not a decision to use it.)*

### What the hackathon rewards

Verified from the rules page (`context.md`): five equally weighted criteria — technological
implementation, **design as a complete coherent product experience rather than a technical proof of
concept**, potential impact *based on what is demonstrated*, innovation, and presentation. Breadth
that is only described earns nothing; a demonstrated narrow thing beats a claimed wide one. That
tension is the fifth root question.

---

## Goals

1. Decide what the product *is* when it is not a store we built — in one sentence a judge could
   repeat.
2. Establish how one artefact can be universal in reach and specialised in what it does, without
   modes, profiling or declarations.
3. Name the surfaces on which it could meet real documents, and what each demands.
4. Identify where the product's inputs (terms, prices, cadences) would come from outside our
   catalogue, and what happens when they are missing.
5. Bound all of it by what can be demonstrated in five days.

## Non-Goals

- Not a rewrite. The money computation, the three figures, the guard, and the PayPal integration are
  not in question here; the scope around them is.
- Not a medical, benefits-advice or financial-advice product.
- Not a general document summariser, budgeting app, or bank-feed monitor.
- Not an attempt to support every document type, every language, or every disability.
- Not a decision about which sponsor tool to adopt.

## Constraints

- **Five days** (2026-11-07 → 2026-11-12, 5:00 PM EST), solo.
- Every claim in the submission must be demonstrable in a sub-3-minute video; judges may not run it.
- Must continue to use **both** PayPal APIs and AI meaningfully — broadening must not dilute either.
- Sandbox payments only; no real merchant relationships, no real user data, no storage about a person
  (IPD 4 still holds).
- No access to target users for testing.

## Assumptions (challengeable)

- A wider product that keeps the same *unit of translation* (a commitment, stated as figures) is more
  defensible than one that grows new features.
- The demo store can remain as the place where payment happens, even if it stops being the product.
- Real documents can be simulated credibly with published/public examples rather than invented ones.
- Keeping the existing build intact and adding a second entry point is cheaper than generalising the
  existing one.

---

## Problem Tree

```text
├── Q1. What is the unit, at its widest — and where does widening stop being the same problem?
│   ├── One purchase? One commitment (now, over time, financed)? All of someone's commitments
│   │   together? Any money document with a derived figure (bill, insurance, benefits, invoice)?
│   ├── Which of those keep the property that makes the current build work — a stated total that
│   │   differs from what the document shows, and terms a seller published?
│   ├── What must the product refuse to read, so it is not claiming to understand anything
│   │   with numbers in it?
│   └── Does the answer change if the same person has twelve commitments instead of one?
│
├── Q2. How is one thing both universal and specialised?
│   ├── What is "specialised" here, concretely — the figures chosen, their order, the arithmetic
│   │   shown, the vocabulary, the pacing, the medium — and which of those actually differ between
│   │   dyscalculia, ADHD, dyslexia and an ordinary distracted reader?
│   ├── Where do those differences conflict (fewer items vs. nothing hidden; text vs. audio;
│   │   speed vs. deliberation) and who wins?
│   ├── What does a reader with none of these conditions gain, and is that gain real or polite?
│   ├── Does "works for everyone" describe who may use it, or who it was designed against?
│   └── What would make a specialist say this is a toy version of their field?
│
├── Q3. Where does it meet people, if not in our store?
│   ├── A page we host (as now), a page a merchant embeds, something the shopper brings to any
│   │   page, a document they hand it, or a place their money already lives (payment platform,
│   │   bank, wallet)?
│   ├── What does each surface demand that the others do not — cooperation, permission, an install,
│   │   an account, a data source, a licence?
│   ├── Which surface reaches the people in the research (unpaid bills, benefits letters,
│   │   insurance) rather than the people who shop online?
│   ├── Who is accountable when it is wrong on someone else's page or document?
│   └── What can be shown working in a video without a partner's consent or a store's integration?
│
├── Q4. What must it know, and who supplies it when there is no seller to ask?
│   ├── Which inputs are indispensable (amount, cadence, term, exit) and which are nice to have?
│   ├── What are the credible sources for each — the seller's page, a payment API, a catalogue,
│   │   the document itself, the shopper?
│   ├── What does the product do when a source is silent, contradictory, or unverifiable — and how
│   │   is "not stated" distinguished from "could not read it"?
│   ├── Can a figure ever be assembled from more than one source without becoming a guess?
│   └── What does it owe the reader about where each number came from?
│
└── Q5. What must stay true at submission, given five days?
    ├── Which of the above can be built and demonstrated, and which can only be described?
    ├── Is a wider scope worth a shallower demo — and what does the judging rubric actually reward?
    ├── What is the smallest change that makes "this works for everyone" true rather than claimed?
    ├── What does the video show as the product's world: one product, three products, or three
    │   documents that are not products at all?
    └── What gets cut if a day is lost?
```

---

## Open Questions

1. **Is the commitment still the unit**, or does the product become "a reader for money documents"
   with commitments as one kind?
2. **Does broadening displace PayPal?** The hackathon requires PayPal to be central. A document lens
   with a payment step bolted on risks failing that test.
3. **What is demonstrated versus described** — can the wide version be shown in three minutes without
   becoming a slideshow?
4. **Who is the second reader** the universal design is tested against, now that "everyone" is the
   claim?
5. **Has the scope already outrun the evidence?** Every widening multiplies the claims the
   comparison document (IPD 9) would need to stand behind.

---

## What this tree puts back in play

These existing decisions were made under the "demo store" assumption and may be superseded by
whatever answers Q1–Q3:

| Decision | Assumption it rests on |
|---|---|
| [IPD 2 — intervention point](../accessible-commerce-companion/ipds/intervention-point.md) | the moment of consent is the unit |
| [IPD 6 — host and ownership](../accessible-commerce-companion/ipds/host-and-ownership.md) | the demo store is the vehicle; the platform placement is an observation |
| [ITD 4 — product data](../accessible-commerce-companion/itds/product-data.md) | a curated local catalogue is sufficient |
| [ITD 5 — delivery surface](../accessible-commerce-companion/itds/delivery-surface.md) | the product is a page we host |

Everything else — the money model, the three figures, the presentation projection, the guard, the
receipt, the reader controls, the comparison document — is independent of scope and survives it.

---

## Research Confidence

| Claim | Source | Confidence |
|---|---|---|
| Dyscalculia affects everyday money tasks, not only arithmetic | Vigna et al. 2022 (via secondary); LDA | Medium |
| ADHD: ~4× impulse spending; ~3× missed bills | Guardian 2022; Monzo via Augmentive | Medium / Low–Medium |
| Low numeracy impairs insurance and medical decision comprehension | PMC2844786 | High |
| Most uncontested medical bills reflect uncertainty about the right to contest | AJMC survey | Low–Medium |
| Accessibility scanners check compliance, not comprehension | W3C WAI; vendor comparisons | Medium |
| Channel3 offers a real-time, storefront-agnostic product catalogue | YC, press coverage | Medium |
| Judging is five equally weighted criteria; impact judged on what is demonstrated | Official rules page | High |
