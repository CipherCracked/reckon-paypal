# Accessible Commerce Companion — ITDs

| ITD 7 — *"Make the rendering order, unit and arithmetic data the screen reads, so a variant can be changed and compared without touching the money."* |  |
| :---- | :---- |
| **THE PROBLEM** | IPD 7 orders the screen by decision weight — term total, exit cost, then today's charge — and promises each figure shows its arithmetic. But the order is currently hard-coded in `CommitmentView`'s JSX, the arithmetic is nowhere, and there is no way to see what the other order would have produced. A hypothesis that cannot be varied and compared is not a hypothesis; it is a preference with a document attached. |
| **OPTIONS CONSIDERED (Decision in bold)** | 1. **The presentation is derived data: each figure carries an id, a label and an arithmetic string, and the view renders whatever list it is given, in the order it is given.**<br>2. Keep the order in the JSX and edit it in place.<br>3. A runtime experiment flag that flips the order for a percentage of visitors.<br>4. Let the model choose the order. |
| **REASONING** | Option 1 puts the one thing IPD 7 actually decided — sequence — in a single named constant, and makes the arithmetic a computed property beside the figure it explains rather than a sentence beside it. It also keeps the money untouched: the ordering function consumes a finished `CommitmentTranslation` and returns a presentation list, so no arithmetic changes and every existing test of the translation survives. Option 2 makes the decision invisible in review and impossible to compare. Option 3 needs visitor state we refuse to keep (ITD 6) and has too little traffic to say anything. Option 4 hands the most consequential editorial act to the component with no accountability and no test. |
| **TRADEOFFS** | One more module in `lib/commitment`, and the view becomes a little dumber. The arithmetic strings are derived from the same inputs the figures are, so a bug in the wording of "12 × $12.00" is a display bug, not a money bug — which is the right blast radius, but it does mean the strings need their own tests. |
| **NOTES** | Order is a `const` array of figure ids, not a boolean flag. Flipping it is a one-line change, which is what "vary and compare" needs. A printed comparison of the two orders against the three catalogue products is the artefact Q4 asks for, not a running experiment. |

---

**Revision — 2026-11-07: what exists, and what this changes.**

**As-built.** `CommitmentView` renders `translation.today`, then `translation.acrossTerm`, then
`translation.exit`, in that literal order, as three `<div>`s inside one `<dl>`. No arithmetic is
shown. The breakdown sits below with the seller's labels. This is Option 2, i.e. the thing this ITD
replaces.

**What changes and what does not.** `lib/commitment/*` — integer cents, the drift guard, the
degraded path, `exit: null` → "Not stated" — is untouched. The change is a projection from a
`CommitmentTranslation` to `RenderedFigure[]`, plus a `CommitmentView` that maps over it. The
`<dl>` semantics stay (a description list of term/description pairs), so the accessibility work in
IPD 5 is not reopened by this.

**What the arithmetic string must and must not do.** It may state the inputs the translation was
built from (`12 × $12.00`, `$10.00 + $1.00 + $1.00`). It may not compute anything new, introduce a
unit the merchant did not state, or express the commitment as a percentage. Where the inputs are
not enough to show the sum honestly — a financed commitment with an undisclosed interest rate — the
string says what is missing instead of inventing a figure.
