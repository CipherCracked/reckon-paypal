# Finished Feel — Problem Decomposition

**Status:** Decided (2026-11-11)
**Date:** 2026-11-11
**Raised by:** the product owner, after watching the build being demoed — *"I also feel we write too much. You are not actually logging into app, you are logging into PayPal… You are not spending real money instead this is sandbox… This is ruining the product from getting a finished feel. And this removes focus from our USP,"* and *"we should be more focused on visual appeal without creating user friction and also communicating our USP (with visual appeal)."*

---

## Problem Statement

The product is correct about everything and says so, repeatedly, in the place a person is looking at the product. A visitor opening the front door reads three figures and, beside them, four sentences explaining what the three figures are not: that this is a sandbox, that signing in happens on someone else's page, that nothing is stored, that no figure was invented. The same qualifications appear again — in the sign-in card, in the consent screen, in the bill, under the pay link — each in a different sentence, because each was written by the screen that needed it.

The effect is the opposite of the one intended. A caveat repeated on nine screens stops reading as care and starts reading as a disclaimer: the product's voice becomes *what we cannot do*. A person evaluating this in three minutes concludes the demo is unfinished rather than careful, and the thing the product actually does — three figures, each traceable to the seller's own sentence — is buried under an apology for it.

The owner's diagnosis is exact. The problem is not that the product says too little about its limits; it is that it spends the reader's attention on them at the moment it should be spending it on the argument.

## Background and context

The build is complete against 28 IPDs and 25 ITDs and has been verified live: a subscription approved and cancelled at PayPal, a document read by a model with every span checked, a live catalogue behind `/shop`. Every one of those decisions added a sentence to a screen to explain what it had just done. No decision ever removed one.

The audit before this one (`docs/joined-up-product/intro.md`) fixed the product's **structure** — one home, one figure set, navigation. It did not touch the **volume**: `Page.tsx` carried a frame, `Shell.tsx` carried a footer (*Built with PayPal for the 2026 AI Hackathon*), the bill carried two sandbox paragraphs, `/product` carried three copies of *Nothing is invented to fill the gap*, and the relationship between the two columns of the entry — the product's whole claim — was a paragraph on one screen and absent on the next.

The same pass showed the opposite failure in the figures. The three numbers rendered as three equal tiles in one grid at one size, with the seller's quoted sentence set in the same face and weight as the arithmetic under it. The product's central object looked like a table, and the trace — the sentence that produced a figure — looked like annotation.

## Goals

1. A person arriving anywhere reads the product's argument in the first screenful, not a statement of its limits.
2. The qualification a sandbox and a stateless store genuinely owe a visitor is stated once, in one place, in one sentence.
3. The figure that decides is visibly the one that decides, without a caption saying so.
4. The trace from a figure to the seller's sentence is visible at a glance, not explained in prose.
5. Nothing that is *information* — an absence, a source, a failure — is removed in the name of polish.

## Non-goals

- Not new capability. No new route, no new PayPal surface, no new model behaviour.
- Not a redesign of the type, colour or shape system (ITD 24 decided it, and it is sound).
- Not a revision of IPD 21's argument that the entry shows the work. That decision is the product; this one stops it being *explained* twice.
- Not a claim that the sandbox is invisible. A person paying with a sandbox account still has to be told it is one — once.

## Constraints

- **One solo developer, the day before the deadline.** The three-minute video is unrecorded; this pass must fit in a morning.
- **Every invariant holds.** No figure the code did not derive; absence stated as absence; no advice or verdict; no vendor name in the AI configuration.
- **The suite is the contract.** 450 tests currently pin the product's honesty. A sentence removed is a test that has to be rewritten to the new behaviour rather than deleted.
- **Nothing gained in polish may cost a screen reader a fact.** Reordering for a phone is a visual order change and cannot drop content.

## Assumptions

- The auditor of this product is a person, in a video, on a phone or a laptop, with three minutes.
- A visitor who has never met the product cannot distinguish "careful" from "unfinished" in the first screenful; they read the volume, not the reasoning.
- The three figures remain the product's strongest asset and the fastest way to explain it.

## Problem Tree

```text
├── Q1. How much of a screen may be spent saying what the product is not?
│   ├── Where does the sandbox and no-storage caveat live — once, or per screen?
│   ├── Which sentences are standing qualifications, and which are findings?
│   └── What is left of the frame once its furniture is gone?
│
├── Q2. What does a person see first on a screen about a commitment?
│   ├── Which of the three figures leads, and at what size?
│   ├── How does a figure show where it came from without a paragraph beside it?
│   └── What arrives first on a phone — the figures or the seller's words?
│
├── Q3. How does the space the cut frees up get spent?
│   ├── Does every figure get a box, or does the card hold them?
│   └── How are the notes under a figure sized when the note is a quotation?
│
└── Q4. How does the product stay honest while looking finished?
    ├── What stops a future cut from quietly deleting an absence?
    ├── What does the suite assert about the qualification now?
    └── How does a figure that carries a sentence announce itself to CSS?
```

## Decisions

| # | Question | Document |
|---|---|---|
| IPD 29 | Q1 — one quiet line instead of nine apologies | [`ipds/one-quiet-line.md`](ipds/one-quiet-line.md) |
| ITD 26 | Q2 — the figure that decides leads, and wears its sentence | [`itds/one-figure-leads.md`](itds/one-figure-leads.md) |
| ITD 27 | Q3 — the card decides its own layout, not the viewport | [`itds/layout-belongs-to-the-card.md`](itds/layout-belongs-to-the-card.md) |
| ITD 28 | Q4 — what the suite now guards | [`itds/what-the-cut-must-not-take.md`](itds/what-the-cut-must-not-take.md) |

## Open questions

- **The footnote is on every page, including the receipt a person keeps.** It is one line at the foot; whether a printed record should carry it was decided as yes (nothing about the artifact is untrue when it is filed away) and can be revisited if the receipt gets a print path.
- **The breadcrumb of provenance on `/read` is long.** *Took N quotations from your document. Every figure was worked out here, not by the model* is two facts a judge needs and one a shopper does not. It is kept as one line and not split; if `/read` becomes a primary surface rather than a demonstration, it earns its own decision.
- **Nothing here decides the video.** The volume cut helps a person watching, but the script still has to be written and recorded.
