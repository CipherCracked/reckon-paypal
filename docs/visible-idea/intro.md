# Visible Idea — Problem Decomposition

**Status:** Decisions written and adversarially reviewed (2026-11-10). **All seven are built** — IPD
21–24 and ITD 19–21. IPD 21–22 and ITD 19–20 are verified live end to end; IPD 23 + ITD 21 are
live-checked on the error path only (the cancel success path needs an approved subscription);
IPD 24 is verified in the served markup and stylesheet, and wants one screenshot at the largest
text size. The open questions below are still open; Q2 and Q3 were decided with the reasoning
recorded in the documents, not closed. See the Revision section at the end for what the pre-build
review changed.
**Date:** 2026-11-10
**Builds on:** `../demo-feel/intro.md` (2026-11-07), whose shell and return-path decisions are now partly built; and the 13 IPDs / 12 ITDs behind `../universal-commitment-companion/`.
**Question this document exists to answer:** *A stranger can use this product and still not see what it is for. What has to change for the idea itself to be visible, in ten seconds, to someone who will never read the code?*
**Context:** PayPal AI Hackathon 2026 · solo · submissions close **2026-11-12, 5:00 PM EST** (2 days)

---

## Why a fourth tree

The first two trees decided *what the product computes and refuses to compute*. The third
(`demo-feel`) asked why a working build reads as a demonstration and produced eight decisions about
frame, entry, endings and return paths. Several of those were built; the shell, the back links and
the disclosure line exist in the code today.

Then two reviewers were shown the build cold, with no access to these documents, the pitch, or the
git history — one reading it as a person who had just arrived, one as a judge holding a scorecard.

Their verdicts agree, and neither is about the shell.

> The code is a rigorous, honest "commitment translator" with real PayPal plumbing and an unusually
> careful AI design — but as a product it has no face.
> — the product reading

> This is an unusually well-built submission with a real idea in it, and it is currently packaged as
> if the idea were an implementation detail.
> — the judge reading

The problem this tree takes up is narrower than *demo-feel* and more consequential. The shell now
works. What does not is that **the one idea worth remembering is invisible on every screen that
matters.**

---

## Problem Statement

The product has an idea no other entrant is likely to have:

> PayPal knows what you will be charged today. No payment platform tells you what it costs to leave.
> This reads that figure out of the seller's own sentence, with a model that is not allowed to write
> a number — it may only copy a span, and the server refuses anything it cannot find verbatim.

That sentence is true of the build. It is also, in the product as it stands, nowhere to be seen.

- The first screen opens with "Every payment asks you to work something out" — a complaint, not a
  promise, and a sentence about the reader's difficulty rather than the product's job.
- The seller's words and the three figures never appear together. The transformation — prose in,
  figures out — is the product, and it is not on any screen as a transformation.
- The AI demo is an empty textarea behind the third of several doors. It costs the visitor typing and
  a model round-trip measured at roughly 47 seconds on the current endpoint.
- The figure the product exists to state has no verb attached to it. The receipt tells a person what
  leaving costs and then sends them to PayPal's website to do something about it.

The result is that a viewer can complete every flow and still be unable to say what this is for, or
why it is different from a careful checkout.

---

## Background and Context

### What the two blind readings found

Both reviewers were given only the code — not these documents, not the README, not the pitch — and
told to judge it as it is.

| Finding | Product reading | Judge reading |
|---|---|---|
| Nothing on the first screen says who this is for | Yes — "the code never says"; only audience signal is a hackathon footer line | Yes — axis A scored 7.0 for this reason |
| The transformation is never shown | Yes — "nowhere is there a two-column 'what they wrote / what we worked out'" | Yes — same observation, independently |
| The AI demonstration is the best asset and the hardest to reach | Yes — empty textarea, 45 s cold path | Yes — "the part of the submission that deserves to be the headline" |
| The exit figure is the memorable idea | Implied by what it recommends featuring | Yes — "the one idea a judge will repeat" |
| The exit figure has no action attached | Not raised | Yes — "the most interesting number in the product has no verb attached to it" |
| The featured example demonstrates nothing | Yes — coffee subscription's exit cost is $0.00 | Yes — same |

The judge scored the submission **7.45/10** weighted, with submission craft (video, Devpost page,
public URL) at **5.0** and engineering rigor at **9.0**. Its summary: *the code is stronger than the
pitch.*

### What is already decided and must not be reopened here

The money model, the figure order, the guard, the span verification, the refusal rules, and the
"PayPal first, file second" resolution are settled and built. This tree is about **what a stranger
sees and can do**, not about what the product computes.

`demo-feel`'s eight adopted decisions (entry and identity, frame without modes, journey and endings,
app shell, entry rendering, return paths, visual language) remain the frame this tree works inside.
Where they say "not yet built" and the build disagrees, the document is stale, not the build.

### What the evidence outside this repo says

Already reviewed and recorded in `../demo-feel/intro.md`, and not re-researched here: credibility is
judged from design quality within ~50 ms; W3C COGA asks for consistent, familiar patterns and for
feedback that says where the person is; the judging rubric scores Design as *"a complete, coherent
product experience"* and judges may never run the project.

One new fact belongs to this tree: **the rubric weights Technological Implementation and Design
equally, and Innovation separately.** An idea that is only in the code cannot score on Innovation,
however well it is built.

---

## Goals

1. Establish what a person must be able to say about this product after ten seconds, and on what
   evidence — screen, sentence, figure — that belief would rest.
2. Establish how the product's central transformation (a seller's sentence becoming three figures)
   can be *shown* rather than described, without turning the screen into an explainer.
3. Establish what the AI must demonstrate, and under what time and honesty constraints, for a viewer
   to believe it is doing work no script could do.
4. Establish what "cost to leave" should let a person *do*, and where PayPal's own interfaces end and
   this product's responsibility begins.
5. Name what must survive this work — the honesty rules, the accessibility commitments, the
   three-figure model, and the requirement that both PayPal and AI stay central.

## Non-Goals

- Not a redesign of the money model, the figure set, or the refusal rules.
- Not a new catalogue of products to sell.
- Not a general marketing site, brand identity, or illustration exercise.
- Not user research. No participants are available; the evidence is the two blind readings, the
  existing research, and the build.
- Not a rewrite of the PayPal integration beyond what goal 4 requires.
- Not a promise that every screen is redesigned. The tree is bounded by two days.

## Constraints

- **Two days** (2026-11-10 → 2026-11-12, 5:00 PM EST), solo.
- **Judges may not run the project.** Whatever is decided must survive being watched in a video and
  read on a Devpost page.
- **The model is slow and remote.** ~47 s per reading on the current endpoint; the page already
  bounds it at 3 s and reads ahead at start-up. Any demonstration that assumes a fast model is a
  demonstration that will fail on a cold deploy.
- **The honesty rules are load-bearing.** A figure is shown only if it was derived from PayPal's
  amount or from a verified span of someone's text. Nothing in this tree may introduce a number that
  fails that test — including placeholder numbers in demo content.
- **Accessibility is a claim with a standard behind it.** Controls that exist on one screen and not
  another are a contradiction, not an unfinished feature.
- **Both PayPal and AI stay central.** A restructure that turns the product into a brochure fails
  the hackathon's first gate.

## Assumptions (challengeable)

- The first screen is the highest-leverage surface in the product, because it is the one every judge
  and every visitor meets.
- "The idea is invisible" is closer to *absence of evidence* than to insufficient copy; a better
  headline alone would not fix it.
- A one-click sample is a fair demonstration of a reader, provided the screen says the sample is a
  sample.
- Acting on the exit figure is within the product's remit — the product already tells a person what
  leaving costs.
- Two days is enough for the first screen, the sample path, and one platform action; not enough for
  all three plus a redesign.

---

## Problem Tree

```text
├── Q1. What must a stranger know after ten seconds — and what evidence on the
│        screen would make them believe it?
│   ├── What is the minimum: what this is, who it is for, what it does to a bill?
│   ├── Which of those three can the screen show rather than say?
│   ├── What does the current first screen actually communicate, read cold?
│   └── What does a judge see before scrolling, and does it survive being paused in a video?
│
├── Q2. How is the transformation shown — a seller's sentence becoming three figures —
│        without the screen turning into an explainer?
│   ├── What exactly is placed side by side: the sentence, the arithmetic, the source line?
│   ├── How is the reading of a written sentence distinguished from arithmetic over numbers?
│   ├── Which example carries the idea best, and why is the current one the worst possible?
│   └── What happens on the screen when the seller said nothing — is absence shown as vividly
│       as presence?
│
├── Q3. What must the AI demonstrate, in one click, for a viewer to believe it does work
│        a script could not?
│   ├── What does the visitor supply, and what must be supplied for them?
│   ├── How is "the model copied a span and the server checked it" made visible?
│   ├── What happens when the model is wrong — is the rejection shown, or hidden?
│   └── What is the acceptable wait, given a ~47 s model, and what is shown during it?
│
├── Q4. What should "cost to leave" let a person do?
│   ├── Is the figure a disclosure, a decision, or an action — and which does the product claim?
│   ├── What does PayPal make possible at the moment of leaving, and what does it not?
│   ├── What does the product owe a person after an action it initiated, if it keeps no state?
│   └── Where does the product stop being a guide and become a party to the contract?
│
└── Q5. What must survive all of this?
    ├── Which honesty rules constrain what can be shown and how (verified spans, PayPal amounts)?
    ├── Which accessibility commitments forbid new patterns, modes, or personalisation?
    ├── What must remain true of every screen: three figures, the same order, a stated source?
    ├── What happens to the generated comparison document if the screen changes?
    └── What gets cut if a day is lost?
```

---

## Open Questions

1. **Is the judge and the shopper the same reader?** If the first screen is written for a stranger in
   ten seconds, does it still serve a person who arrived with a specific bill? The two audiences may
   want different front doors.
2. **How much of the problem is the invented catalogue?** The product goldfish called the coffee
   subscription the worst possible featured example; a judge may discount the whole thing the moment
   a product name is clearly made up. That puts demo content back in play, which the tree has
   otherwise excluded.
3. **Does acting on the exit figure change what the product is?** A button that cancels a
   subscription at PayPal makes the product a party to the contract, not only a reader of it. That
   is a product decision with consequences beyond the feature.
4. **What does the product say when it cannot demonstrate?** On a cold deploy with a slow model, the
   flagship figure may be absent. Is a snapshot of a previous reading honest, and if so, how is it
   labelled?
5. **What is the cost of stale decision records?** Eight `demo-feel` decisions say "not yet built"
   while the build contains their outcomes. Correcting them is work; shipping them stale is a
   coherence risk in the submission itself.

---

## Revision — 2026-11-10 (adversarial review, before any build)

The seven decision documents were reviewed cold — by a reviewer given none of them, only the code
they describe — before any of them was implemented. The review's own summary:

> Fix that first — budget the entry with `withBudget(..., MODEL_READ_DEADLINE_MS, ...)`, and either
> read the description from a source that exists (the catalogue file's copy, or write it onto the
> PayPal product) or drop the "quoted from the seller" claim on the entry — and the rest of this
> tree is worth arguing about.

Every finding was checked against the code before being accepted. Eight were true and are now
recorded as revisions in their own documents rather than quietly corrected:

| Where | What the review found | Document |
|---|---|---|
| The entry | The AI path yields an empty description and `unknown` exit once the product resolves from PayPal, and the entry awaits it with **no time budget** — the one screen that must load in ten seconds can wait indefinitely | IPD 21 |
| The entry | The featured example's exit is a hardcoded `$0.00` and is being changed to `unknown`; `lib/comparison.ts` and its test are built from the file terms and break when the example's terms change | IPD 21 |
| The reader | `verifyQuotations` returns a **count** of rejected spans, not the spans; the refusal example cannot be produced by making the model fail | IPD 22 |
| The receipt | A cancelled subscription is reported as *"nothing has been taken"*, because `isSettled` accepts only `COMPLETED` and `ACTIVE` | IPD 23, ITD 21 |
| The receipt | The cancel's "already cancelled" branch is unreachable while the unsettled early return stands | IPD 23 |
| The controls | The text-scale control does not work on either screen it appears on: its rule targets `.consent` while sizes are in `rem`, and `/read` puts the attribute on a `div` no selector matches | IPD 24 |
| The controls | `DisplayControls` ships two controls; the second is a prop of the figure view and would do nothing in the shell. `ReadAloud` returns `null` where speech is unavailable — a silent opt-out | IPD 24 |
| The cache | The example warm-up needs two lifetimes, not one, and failure must not be cached; no route declares `maxDuration` on a host whose default may be shorter than one model call | ITD 20, ITD 21 |

Two structural consequences follow, and both are conditions of building rather than follow-ups:

- **`CANCELLED` must become a settled receipt state before the cancel action ships.** Without it the
  product reports a completed payment as nothing taken — and the new action is what produces that
  state.
- **The deploy target must be named before the reader or the cancel is demonstrated on it.** A
  47-second model call and a second PayPal call both need a host that allows them.

Nothing in the tree was overturned. The problem statement, the five questions and the decisions
stand; what the review corrected is the distance between what the documents claimed about the code
and what the code does.

