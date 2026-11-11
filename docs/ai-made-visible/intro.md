# Made Visible — Problem Decomposition

**Status:** In progress (2026-11-12)
**Date:** 2026-11-12
**Raised by:** the product owner — *"so ai coverage is pretty weak here? I think the task was basically integrate ai with paypal?"* — and a blind review commissioned to answer it.

---

## Problem Statement

The AI in this product does real work and leaves almost no trace a stranger can see. On the worked listing at `/` every figure is deterministic: read the price, read the term, multiply. The model is in the path, reads the seller's published description, and its most visible answer on that screen is **Cost to leave: Not stated** — an absence. The screen where the model's work *is* the product — the document door at `/read` — requires a paste, sits behind a second link, and reports what it did in one sentence under the figures.

So the product fails a test a judge can apply in one question: *if I deleted the AI, would this still work?* On the path the video would open on, the honest answer is yes. The verification discipline — a schema with no numeric field, a guard that rejects money in prose, a server that discards any span not found character-for-character in the source, three distinct absence states — is the most substantial engineering in the build, and it is described in a document and demonstrated nowhere.

The problem is not that the AI does too little. It is that **nothing on a screen shows the AI being wrong, being corrected, or being absent**, and those are the three moments that make the role legible.

## Background and context

**What exists today, as fact rather than intention:**

- Two AI paths share one reader. `/read` (a pasted bill, contract or renewal notice) and the cost-to-leave reading on every commitment screen both go through `lib/ai/read-document.ts` → `lib/document/verify.ts` → ordinary code.
- The model's tool schema has no numeric field. It returns spans and a prose summary; `lib/ai/guard.ts` throws out any summary containing a money-like string.
- The reader already counts what happened: `quotationCount` and `rejected` are computed and carried on the reading. `/read` prints them as one sentence — *"Took N quotations from your text… M sentences the model offered could not be found… and were discarded."*
- The exit reading already returns three outcomes — `stated`, `silent`, `unreadable` — and every commitment screen renders a different sentence for each. Two of the three are interesting and only one of them is currently named as a finding.
- `lib/catalog/examples.ts` already holds example documents, including one written to be **refused** — an input the current reader declines rather than guesses on.
- The verification is literal: a span that is not a substring of the source is discarded, and the count of discards is reported.

**What a judge can currently see:** a page of three figures with the seller's words beside it; a highlight on a phrase; a working PayPal approve-land-receipt-cancel loop; an invoice. Nothing on any screen shows the model proposing something and the server rejecting it.

**What constrains any answer here:**

- **The audience.** Dyscalculia, ADHD, dyslexia. A screen that requires scanning, memory, or a new vocabulary has already failed before it is impressive. The word *span* is not a word to put on a default screen.
- **The invariants.** No figure the code did not derive; absence stated as absence; no advice, verdict or score; stateless; no vendor name in the AI configuration.
- **Honesty about what is a demonstration.** A document written to trap the model is not a customer document, and a toggle that switches off a capability the production path does not have would be a prop. Both can be shown only if they are what they claim to be.
- **The clock.** Hours, not days. The three-minute video is unrecorded and is the largest single unfilled scoring item. Whatever is built has to be filmed, not merely shipped.
- **The rules.** Stage 1 is pass/fail on "PayPal + AI" and is already met. The five scored criteria are equal, and one $5k honorable mention is *Best Use of PayPal + AI*.

## Goals

1. A judge who deletes the AI in their head and re-runs the product finds a screen that stops working — and that screen is inside the first minute of the video.
2. The model being wrong, and the server catching it, is something a visitor can see rather than read about.
3. The three absence states are named on screen as findings, not rendered as three differently-shaped blanks.
4. The default screen gains no vocabulary, no numbers it cannot derive, and no new interaction cost for the reader this product exists for.
5. Net new words on the front door: zero.

## Non-goals

- Not new AI capability. The review's finding is that the role is right and the visibility is missing; a new model task is a different project and a worse use of the remaining hours.
- Not a chat interface, not a copilot, not a narration written by the model.
- Not a change to how figures are computed, verified or stored.
- Not a new route, unless a question below shows the existing ones cannot carry the demonstration.
- Not new PayPal surface.

## Constraints

- **Invariants hold, especially these:** the model never states a number; nothing is shown as a charge that the code did not compute from a verified span; an absence is never a zero.
- **No advice in layout.** A heading, an ordering, or a colour can deliver a verdict without a sentence. Telling a reader who cannot evaluate it that something looks hidden is the same failure as saying it.
- **No pipeline vocabulary on the default screen.** Verification detail lives where a reader goes, not where they land.
- **Verification is by eye and by test** (ITD 28's rule): whatever is built has to be checked at 1440 and 390, in both themes, before the recording starts.
- **The example corpus is the owner's.** The worked listing does not change.

## Assumptions

- A judge watching a three-minute video applies the deletion test implicitly, without naming it.
- Seeing a system catch its own error is more convincing than any sentence claiming it verifies things.
- A reader with dyscalculia is helped, not harmed, by being told *the seller wrote nothing about leaving* — the finding, not the mechanism.
- Anything that takes more than about two hours of build will not be filmed, and an unfilmed feature scores nothing.

## Problem Tree

```text
├── Q1. What part of the model's work already exists as data, and which of it can be shown truthfully?
│   ├── Which counts, outcomes and spans are already computed?
│   ├── What is visible today, and to whom?
│   └── What would have to be computed that is not?
│
├── Q2. What must a judge see, and in what order, to believe the AI is load-bearing?
│   ├── Which screen answers the deletion test on its own?
│   ├── Does the video's first minute open on that screen or on the proof?
│   └── What does each of the five criteria lose if it opens on the proof?
│
├── Q3. How may the mechanism be shown without putting its vocabulary on the default screen?
│   ├── What may the landing state say, in words a reader already has?
│   ├── Where does the detail live, and what opens it?
│   └── Does the demonstration cost the reader a step they would not otherwise take?
│
├── Q4. What must a trap document prove, and is a document we wrote an honest demonstration?
│   ├── Which failure modes are worth demonstrating — the loud wrong number, the silent term, the unreadable text?
│   ├── How is an authored example distinguished from a real customer document?
│   └── What does the product do when the model is absent or fails, and is that path real?
│
└── Q5. What must this pass not cost before the deadline?
    ├── Which invariants and tests already pin the behaviour this would sit on?
    ├── How many hours can be spent before the video stops being filmable?
    └── What already-correct state must not be flattened to make room for it?
```

## Decisions

**Scope chosen 2026-11-12:** the two changes that make the AI's work visible — naming the absence states, and showing what the reader checked — and nothing else. No new model capability, no new route, no new PayPal surface, and no trap corpus: `lib/catalog/examples.ts` already holds a document the reader refuses, so a second corpus would buy a demonstration the build already has. Q2 is answered by sequencing the video rather than by software, and Q5 is answered by the IPDs' tradeoffs.

| # | Question | Document |
|---|---|---|
| IPD 31 | Q1, Q3 — what an absence is allowed to look like on a screen | [`ipds/say-what-is-not-there.md`](ipds/say-what-is-not-there.md) |
| IPD 32 | Q1, Q2, Q3 — how much of the model's checking a reader sees, and where | [`ipds/the-checking-is-shown.md`](ipds/the-checking-is-shown.md) |
| ITD 29 | Q1 — what may be carried and shown of a span the server refused | [`itds/a-refused-span-is-still-the-models.md`](itds/a-refused-span-is-still-the-models.md) |

## Open questions

- **Where the visibility lives.** `/read` is the screen where the AI is the product; `/` is the screen a judge meets first. IPD 32 keeps the mechanism on `/read` and accepts that the first screen cannot demonstrate it — so the video's opening order carries the argument instead, and no software answers this question.
- **Whether an authored trap document is an honest demonstration.** Left open, and now out of scope: the existing example corpus already contains a document the reader refuses, and nothing in the product says which examples are authored. If the recording uses one, the narration has to.
- **What "checked 2 sentences" means to someone with dyscalculia.** IPD 32 keeps the count on the closed line and names it as a compromise; the alternative loses the detail that makes the check feel real. Revisit if the screen is ever tested with the audience it is for.
- **Repeated spans are verified, not located.** Verification is a literal substring check, so a span that occurs twice in a document can be marked at the first occurrence. ITD 29 records it as unaffordable this pass; it becomes a real question the first time a document with a repeated fee table is demonstrated.
