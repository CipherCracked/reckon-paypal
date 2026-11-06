# Accessible Commerce Companion — ITDs

| ITD 8 — *"Generate the evidence from the same functions the app runs, as a committed document, and let the recognition check write nothing down."* |  |
| :---- | :---- |
| **THE PROBLEM** | IPD 9 makes the product accountable for legibility, evidenced by a published side-by-side of every product's merchant text against its rendering. That document must not be a hand-written brochure — it has to be produced by the same computation the shopper's screen uses, or it is fiction. Meanwhile the recognition check must stop short of becoming the measurement instrument IPD 9 refused. |
| **OPTIONS CONSIDERED (Decision in bold)** | 1. **A build-time script imports the catalogue and `computeCommitment`, writes `docs/accessible-commerce-companion/comparison.md`; a test asserts the file matches what the functions produce today. The recognition check sends nothing, and a test proves it.**<br>2. A live `/comparison` page rendered from the same functions and never saved.<br>3. A hand-written comparison kept in the docs.<br>4. An analytics event on the recognition check, aggregated anonymously. |
| **REASONING** | Option 1 keeps the evidence in review: a diff in the document is a diff in behaviour, and the test makes staleness a failing build rather than a stale claim. It also works for whoever reads the repo without running it. Option 2 hides the artefact behind a server the reader may not have and leaves no history; nothing in it can be quoted. Option 3 is the failure mode this decision exists to prevent — a document that drifts from the code and can be edited to look better. Option 4 is small, and it is the beginning of the thing IPD 4 rules out: the moment the check has a purpose for us, it has an incentive to be designed for us. |
| **TRADEOFFS** | The document must be regenerated whenever the catalogue or the computation changes, and the test will fail until it is — deliberate friction, but friction. Text-quality metrics on the merchant copy are indicative only (a reading-level formula counts syllables, not sense) and the document must say so rather than letting a number imply more than it is. Optionally: the check's local result is not even shown to the shopper as a score, only used to move focus. |
| **NOTES** | Figures in the document are formatted with the same `formatMoney` the screen uses. The document states the method and the literature it rests on (`../app-completeness/research.md`), so a reader can disagree with the premise rather than only with the output. |

---

**Revision — 2026-11-07: what exists, and what this changes.**

**As-built.** `RecognitionCheck` asks whether the amount matches, calls `onResult(matched)`, and
`ConsentScreen` uses the answer only to move focus to the breakdown. No request is made, no state is
kept beyond the component's own. That is already the right behaviour — it has simply never been
asserted, and a future edit could quietly add a `fetch` without anything failing.

**What this adds.** The generation script, the committed comparison document, and two tests: one that
the document is current, one that answering the check produces no network call. The second test is
the enforcement of IPD 9's promise in the only place promises are kept.

**What it deliberately does not add.** No page-view counting, no timings, no "did you understand?"
score, no cookies. The app's observability is the server's own logs of its API routes, which contain
a slug and an order id and nothing about a person.
