# Demo Feel — Problem Decomposition

**Status:** Draft
**Date:** 2026-11-07
**Question this document exists to answer:** *Why does a working product read as a demonstration, and what would make it read as a product?*
**Context:** PayPal AI Hackathon 2026 · solo · submissions close **2026-11-12, 5:00 PM EST** (5 days)
**Builds on:** `../universal-commitment-companion/intro.md` and the 13 IPDs / 12 ITDs behind it. This tree does not revisit the money model, the figures, or the PayPal integration.

---

## Why a third tree

The first tree asked *which rendering*. The second asked *what the product is when it is not our store*. Both were answered, and the build that came out of them computes correctly, refuses dishonestly-derived figures, and speaks to three PayPal primitives.

None of that is the complaint.

The complaint is that **using it does not feel like using a product.** A visitor meets a column of text with four cards, no way back, no way out, and a page that calls itself "a demo store". Every screen works in isolation and the whole does not cohere. That is a different problem from anything the first two trees asked, and it is the one the judging rubric names directly: *"a complete, coherent product experience — not just a technical proof of concept."*

This tree is about **the experience a stranger meets**, not the mechanism underneath it.

---

## Problem Statement

The app is correct and unfinished at the same time.

- It computes three figures honestly, shows its arithmetic, refuses to invent what a seller never published, and moves real money through three PayPal APIs.
- And a person landing on it for the first time has no idea where they are, what the app is, or where any action leads — because there is no shell, no navigation, no ending, and the copy keeps telling them it is a demonstration.

The gap is not "polish". It is that the product has **screens** and no **place**. A product is somewhere you can be; a demo is a sequence you are walked through.

The four symptoms named when this tree was opened are not independent:

| Symptom | What it points at |
|---|---|
| The first screen doesn't look like a product | Nothing establishes what this is before asking for a choice |
| Getting around is impossible | No shared frame; every page is a dead end |
| The content feels invented | Three made-up products, and copy that admits it |
| Moment to moment is stitched together | No sense of position, progress, or what happens next |

---

## Background and Context

### What a visitor meets today (as-built, 2026-11-07)

| Area | State |
|---|---|
| App shell | **None.** `app/layout.tsx` renders `<body>{children}</body>` — no header, no nav, no footer, no skip link, no service identity |
| Navigation | Forward links only. `/product`, `/consent`, `/bill` and `/receipt` have **no link back** to the home page or anywhere else; `/read` is the only screen with a "start again" |
| Home | A sentence, then four visually identical cards (purchase / subscription / bill / document), then one quiet line to the shop |
| Identity | Page title "Accessible Commerce Companion"; metadata description begins *"A demo store that…"* (`app/layout.tsx:7`) |
| Content | Three invented products and two invented bills; the consent screen closes with *"This is a demonstration store"* |
| Orientation | An eyebrow label and an `<h1>` per page. Nothing says where this page sits in a journey, or that a journey exists |
| Visual system | One 436-line stylesheet, a neutral palette, no icons, no illustrations, no product imagery, no dark mode |

*This is the evidence the tree is built on, not a verdict on it.*

### What the judging rubric rewards

Verified from the rules page (`context.md`): five **equally weighted** criteria — Technological Implementation, **Design**, Potential Impact, Innovation, Presentation — and Design is defined as *"a complete, coherent product experience — not just a technical proof of concept."* Judges **are not required to run the project** and may judge solely on text, images and video.

The consequence that matters here: for this audience, **the product is what the video and screenshots show**, and the thing being scored is coherence, not capability. A working screen a judge never sees is worth nothing; a coherent journey they can follow in three minutes is worth everything.

### What the research says

**Credibility is judged from design quality, early, and mostly without deliberation.**
Nielsen's four trust factors — design quality, up-front disclosure, comprehensive and current content, connection to the rest of the web — were re-confirmed in later study rather than replaced. The same body of work notes that *"isolated sites feel like they have something to hide."* Separate NN/g research on first impressions puts the aesthetic judgement at roughly **50 ms** into a visit, with a halo effect: a site judged beautiful is later remembered as more usable than it was.

This app is an isolated site in the literal sense: no sibling pages in a frame, no outbound links, no about, no footer, nothing that says a company or a service stands behind it.

**Cognitive accessibility guidance asks for exactly the things that are missing.**
W3C's COGA work ("Making Content Usable for People with Cognitive and Learning Disabilities") states that people with cognitive and learning disabilities *"struggle or be unable to learn new design patterns"* and that controls should be *"familiar and consistent across the site."* Its worked example is a shopper who cannot find where to pay and concludes **the site does not allow shopping at all**. It also asks for user-action feedback that *"helps them avoid leaving a task by reminding them that they are in a process, and where in the process they currently are"*, and has a dedicated pattern for supported wayfinding.

The audience the product claims — dyscalculia first, ADHD and dyslexia served — is the audience for whom an unfamiliar, unanchored interface is most costly.

**Mature public services solve this with a frame, not decoration.**
GOV.UK's design system requires a Back link on question pages, says not to use breadcrumbs for a linear transaction, and introduced Service navigation specifically so users understand *"that they're in the right place to use your service."* Its page template places a skip link before all navigation. Baymard's checkout research frames the same goal as **reducing perceived effort**: the flow should feel *"manageable, linear, and transparent"*, with a progress indicator that reflects the flow and a back step that does not lose what was entered.

None of this prescribes a layout. It does establish that *place, position and a way back* are functional requirements for this audience, not ornament.

---

## Goals

1. Explain, in a form that survives challenge, **which signals make this read as a demonstration** — and which of them are structural rather than cosmetic.
2. Establish what a first screen owes someone who has never seen the product and will not run it.
3. Establish what navigation means for an app whose job is a single decision made once, in four different ways.
4. Decide what a "finished" journey looks like for a judge who watches three minutes and never clicks.
5. Name where "looks like a product" collides with the accessibility and honesty commitments already made, so the collision is chosen rather than discovered.

## Non-Goals

- Not a redesign of the money model, the figure order, the guard, or the PayPal integration.
- Not new capability. Nothing here adds a feature; it decides how what exists is met.
- Not a general design-system or component-library exercise.
- Not a marketing site, a brand identity, or an illustration commission.
- Not research with users. No participants are available; the evidence is the literature and the build.
- Not a promise of visual perfection in five days. The tree is bounded by Q5.

## Constraints

- **Five days** (2026-11-07 → 2026-11-12, 5:00 PM EST), solo, no designer, no reviewer.
- **Judges may not run it.** Whatever is decided must be legible in a video, a screenshot, and a paragraph.
- **Both PayPal and AI stay central.** A restructure that turns the app into a static brochure fails Stage 1.
- **Existing accessibility decisions bind:** one rendering, no modes, nothing asked about the person (IPD 5, IPD 10), nothing stored (IPD 4).
- **The comparison document is generated from the same functions as the screen** (IPD 9). Any change to what the screen contains must keep that document truthful or regenerate it.
- **Docs are part of the implementation.** Where a decision record no longer describes the build, it is amended with a dated revision — not quietly contradicted. (Several already disagree with the build; see *What this tree puts back in play*.)

## Assumptions (challengeable)

- A judge's impression is formed mostly from the video, the first screenshot, and the README — in that order.
- "Feels like a demo" is closer to **absence of structure** than to insufficient visual flourish.
- A shared frame and a legible journey can be added without breaking "fewer items", "no modes", or "collect nothing" — but this is an assumption, not a finding, and Q5 tests it.
- The invented catalogue is not itself disqualifying if the app is honest about what it is and shows a real mechanism; the *self-description as a demo* is the part that costs.
- Five days is enough to restructure the frame and journey, not enough to redesign every screen.

---

## Problem Tree

```text
├── Q1. What is a judge actually judging in three minutes — and what does
│        "complete, coherent product experience" mean when they may never run it?
│   ├── Which artefacts carry the impression: video, first screenshot, README, live click-through?
│   ├── What does "complete" require — every path shown, or one path shown wholly?
│   ├── What counts as coherence: one visual language, one journey, or both?
│   └── Where does optimising for the video diverge from optimising for the shopper, and who wins?
│
├── Q2. Why does it read as a demonstration — and which signals dominate?
│   ├── Is the impression carried by absence (no shell, no place, no ending) or by content
│   │   (invented products, self-describing copy)?
│   ├── Which signals are structural and which are cosmetic — and does fixing the cosmetic ones
│   │   change the verdict at all?
│   ├── What does the app say about itself, on screen and in metadata, and who is it telling?
│   └── What would a stranger say this app is, after ten seconds? After one minute?
│
├── Q3. What must the first screen establish before anyone clicks?
│   ├── What is the minimum a visitor must know: what this is, who it is for, what it does to a bill?
│   ├── Should the entry be a choice, a demonstration, or a statement — and can one screen be all three?
│   ├── Four doors or one door: does breadth read as a product or as a menu of prototypes?
│   └── What does a stranger do first, and is that action obviously available?
│
├── Q4. How does a person move through it — and where does the journey end?
│   ├── What is navigation for a single decision made once? Where is "back", and back to what?
│   ├── What does the visitor know at each step: where they are, how far they have come, what happens next?
│   ├── What does each action return — feedback, position, an exit — and what happens after payment?
│   ├── Which paths must exist for the product to feel finished: browse, compare, abandon, return?
│   └── What ends a visit, and does the app ever say "you are done"?
│
└── Q5. What must survive the restructure, and where does "looking finished" conflict with
         decisions already made?
    ├── Which earlier decisions constrain the frame: no modes, no profiling, no storage, figure order,
    │   schedule line, generated comparison document?
    ├── Where does adding structure fight "fewer items" or "one rendering for everyone"?
    ├── What is honest to present as a product when the payments are sandbox and the products invented?
    ├── Which existing documents no longer describe the build, and must be amended rather than obeyed?
    └── What gets cut if a day is lost?
```

---

## Open Questions

1. **Is the judge and the shopper the same reader?** The tree is scoped to judges in three minutes. If the answer to Q1 is "no", a change that only helps the video may widen the gap between the claim and the product.
2. **How much of "feels like a demo" is the invented catalogue?** If a judge discounts the product the moment they read a made-up product name, no amount of shell fixes it — and that would put real content back in play, which this tree currently excludes.
3. **Can a frame be added without becoming the "accessibility mode" IPD 5 refused?** Navigation is structure, not personalisation — but the boundary needs stating, not assuming.
4. **Does the journey have an ending?** Every path currently stops. Whether "done" is a receipt, a return to the start, or nothing at all is unanswered.
5. **What is the cost of correcting the docs mid-week?** Several decision records describe a build that no longer exists. Amending them is work; leaving them is a coherence risk in the submission itself.

---

## What this tree puts back in play

These decisions were made about *what the product does*, and none of them anticipated *what it feels like to use*. They are not wrong; they are incomplete at this altitude.

| Decision | Assumption it rests on |
|---|---|
| [IPD 12 — front door](../universal-commitment-companion/ipds/front-door.md) | a four-door home is legible as a product; the document door is deliberately quieter |
| [IPD 10 / ITD 9 — adaptation](../accessible-commerce-companion/ipds/adaptation.md) | reader-owned controls are the only personalisation, and the default is whole |
| [IPD 7 — rendering model](../accessible-commerce-companion/ipds/rendering-model.md) | ordering and arithmetic are the whole of the reading experience |
| [IPD 4 — trust and agency](../accessible-commerce-companion/ipds/trust-and-agency.md) | attribution and refusal carry credibility on their own |
| [IPD 6 — host and ownership](../accessible-commerce-companion/ipds/host-and-ownership.md) | the store is the vehicle and says so |

Everything else survives untouched: the money model, the figures, the guard, the receipt's refusal rules, the span verification.

---

## Research Confidence

| Claim | Source | Confidence |
|---|---|---|
| Credibility rests on design quality, disclosure, currency of content, and connection to the wider web; isolated sites read as evasive | NN/g, *Trust or Bust* / *Trustworthiness in Web Design* | High — replicated over 16 years |
| Aesthetic judgement forms in ~50 ms and biases later usability recall | NN/g, *First Impressions Matter* (citing Lindgaard et al.) | High |
| People with cognitive disabilities struggle to learn new design patterns; consistency and familiarity are required, and confusion reads as "this site does not work" | W3C COGA, *Making Content Usable* | High — standards-body guidance |
| Progress and position feedback help users stay oriented inside a multi-step task | W3C COGA, *Making Content Usable* §4.5 | High |
| Public services treat a back link and service identity as requirements, not extras | GOV.UK Design System, *Back link*, *Service navigation*, *Navigate a service* | High |
| Perceived effort, linearity and transparency matter more than step count | Baymard, *Checkout UX* / *UX audit checklist* | Medium–High |
| Design is scored as "a complete, coherent product experience"; judges may not run the project | Official Devpost rules (via `context.md`) | High |
| The specifics of which signal dominates *this* app | Not researched — no users available | **Low** — this is what Q2 exists to answer |

---

## Decision records

| Tree question | IPD | ITD |
|---|---|---|
| Q1 — what is a judge judging in three minutes | [`ipds/judge-brief.md`](ipds/judge-brief.md) — a standalone one-page brief outside the app: method, limits and what is not real | — |
| Q2 — which signals make it a demo; Q3 — what the first screen must establish | [`ipds/entry-and-identity.md`](ipds/entry-and-identity.md) — statement, one commitment worked in full, the rest in a second rank | [`itds/entry-rendering.md`](itds/entry-rendering.md) — server-computed entry, no key, no PayPal call, no side effects |
| Q4 — movement and endings | [`ipds/journey-and-endings.md`](ipds/journey-and-endings.md) — persistent frame, named back targets, one spine, the record as the end | [`itds/app-shell.md`](itds/app-shell.md) — shared layout, landmarks, skip link, declared back target<br>[`itds/return-paths.md`](itds/return-paths.md) — URL as the only state across the PayPal redirect |
| Q5 — what survives the restructure | [`ipds/frame-without-modes.md`](ipds/frame-without-modes.md) — universal structure, reader-owned adaptation, nothing in between | [`itds/visual-language.md`](itds/visual-language.md) — tokens, modular scale, two themes, no imagery in the decision area |

**Status:** all eight are *Adopted* (2026-11-07). None is implemented; the build has not changed since this tree was opened. One revision on the day of adoption: the Q1 artefact moved out of the app into a standalone brief, because judges may never run the product (IPD 16).
