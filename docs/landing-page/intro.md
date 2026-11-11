# The Front Door as a Landing Page — Problem Decomposition

**Status:** In progress (2026-11-12)
**Date:** 2026-11-12
**Raised by:** the product owner, yesterday's copy and figure pass shipped — *"I think we should have a proper and visually attractive landing page, our home page does not feel like a proper landing page?"*

---

## Problem Statement

`/` is the product's whole argument on one screen, and it is laid out like a document. The headline, the promise, the audience, the seller's paragraph and the three figures all sit in one 46rem column at nearly one scale; the seller's panel is the heavier surface; the page's edges do not line up with the bar above it. Nothing on the screen is in charge, so a visitor's first three seconds are spent working out where to look.

The owner's phrase — *"does not feel like a proper landing page"* — is accurate about the symptom and, read literally, points at the wrong cure. A landing page is conventionally a page of claims with an illustration: a slogan, two buttons, three icon cards. This product's front door is the opposite of that, on purpose: it is a live commitment read at request time, with the seller's own words beside the figures they produced. The thing that looks unfinished is not the absence of marketing sections. It is that the page has no **composition** — no largest mark, no surface hierarchy, no shared edge with its own frame.

## Background and context

Three passes in two days have been about volume. IPD 29 cut nineteen qualification sentences to one line at the foot of every page; ITD 26 made the term total the largest mark on any commitment card and tied the quoted figure to its quote with one accent rule; ITD 27 made the card's layout answer to its own width. None of them touched the page's **composition**: the width of `/`, the type of the headline against the type of the figure, or what the left-hand panel is allowed to look like.

A blind review was commissioned before any of this was built — an agent given only a description of the product, the audience and the situation, with no access to the code, the docs or the running app — so that the treatment could be proposed from the product's subject rather than from its existing CSS. `docs/landing-page/ipds/the-front-door-gets-a-composition.md` records what survived from it and what did not.

**What constrains any answer here:**

- **`/` is two pages in one** (IPD 28). Signed out it is the proof; signed in it is the person's record. A landing treatment is the signed-out state or it is a decision to reverse IPD 28.
- **The figure leads** (ITD 26). The term total is larger than the `h1` by design. A conventional hero — biggest type is the slogan — inverts a two-day-old decision and re-buries the number.
- **The page is a reading column; the frame is wider.** `.page` is 46rem inside a 64rem shell, which is right for a receipt or a bill and wrong for a front door.
- **There is no product imagery and there cannot be.** `public/` is empty; a screenshot of the figure card would carry a figure the code did not derive this load and would drift from the live price.
- **The worked listing is silent on leaving** (`ch3-YyLUjLT`). No figure on `/` carries a closing-fee quote, so the product's signature visual — the accent rule from sentence to figure — would not appear on the home page at all. The owner has explicitly deferred changing the example listing. (The term total is a second case: it exists only because the listing states *6 month BarkBox plan*, so that span is available even though the exit is not — see IPD 30.)
- **One day, and the video is unrecorded.** Whatever is built has to be verified at 1440 and 390, in both themes, before the recording starts.

## Goals

1. A visitor's first three seconds produce one focal point: the figure the product computes.
2. The page shares its frame's edge and stops reading as a document with a bar on top.
3. The headline, the promise and the audience read as three ranks of information rather than one paragraph.
4. The proof stays above the fold at 1440 and at 390, and the primary action stays attached to the evidence it follows from.
5. Net new words on the page: zero or near it (IPD 29's rule survives the pass).

## Non-goals

- **Not a new example product.** `ch3-YyLUjLT` stays until the owner says otherwise; the missing quote on `/` is documented as a consequence, not fixed by invention.
- Not a second route (`/app`), a marketing page, or a wall. IPD 28 stands.
- Not a change to the type, colour or surface system (ITD 24) beyond one new type step and one greyscale rule.
- Not motion. The audience list makes non-essential animation a liability rather than a flourish.
- Not new capability: no new data, no new PayPal surface, no new model behaviour.

## Constraints

- **One solo developer, one day.** Verification at 1440, 700 and 390, light and dark, plus 125% text, is part of the cost and is not optional.
- **Invariants hold.** No figure the code did not derive; absence stated as absence; no advice or verdict; no vendor name in the AI configuration.
- **The suite is the contract** (ITD 28). The front-door tests pin the `h1`, the audience phrase, one primary action, one sign-in control, and the caveat appearing exactly once at the foot. A composition pass should not need to rewrite them.
- **Signed-in `/` does not change.** Not one pixel, not one line.

## Assumptions

- A judge spends ~30 seconds on this page inside a video and ~a minute clicking around afterwards.
- The product working live is a stronger first screen than any sentence a solo developer could write about it.
- A page that looks like a document is read as a document; a page with one large object is read as a product.

## Problem Tree

```text
├── Q1. What does a stranger meet in the first screenful, and what is the largest mark on it?
│   ├── Is the hero a sentence about the product, or the product working?
│   ├── Does the headline stay smaller than the figure it describes?
│   └── Is the one action visible before the scroll?
│
├── Q2. What can a landing page add that this page is actually missing?
│   ├── Which conventional sections would be untrue here (logos, testimonials, plans)?
│   ├── How many net new words may it gain after IPD 29?
│   └── What does it look like when the live listing cannot be read?
│
├── Q3. What happens to the signed-in home?
│   ├── Is the landing treatment the signed-out state, or a second route?
│   └── Does a returning person see one pixel of it?
│
├── Q4. How does it look designed inside a ledger system with no illustrations?
│   ├── Which scale, measure and surface changes are allowed by ITD 24?
│   ├── Does it hold at 1440, 390, at 125% text and in both themes?
│   └── Does anything move?
│
└── Q5. What must the change not cost?
    ├── Which sentences and controls do the front-door tests pin?
    ├── Does the phone still show the figures before the seller's words?
    └── Is the one qualification still said once, at the foot?
```

## Decisions

| # | Question | Document |
|---|---|---|
| IPD 30 | Q1–Q4 — the front door gets a composition | [`ipds/the-front-door-gets-a-composition.md`](ipds/the-front-door-gets-a-composition.md) |

## Open questions

- **The exit figure on `/` still has no sentence behind it.** IPD 30 found one quotable span — the listing's term — so the trace appears on the front door after all, marks and all; but the cost to leave is still *Not stated* with nothing to mark, because the seller wrote nothing about leaving. That silence is the product being right, and it is the one case the front door cannot demonstrate with a quotation. Changing the listing would fix it, and the owner has deferred that.
- **The header's wrap between 620px and 780px** (`todo.md` §1a) is untouched and may look worse once the page widens.
- **Whether the signed-in home deserves the same treatment.** It is deliberately out of scope; if the owner wants it, that re-opens IPD 28 rather than extending this decision.
