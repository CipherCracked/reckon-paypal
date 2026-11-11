# Joined-Up Product — Problem Decomposition

**Status:** Decided (2026-11-11)
**Date:** 2026-11-11
**Raised by:** the product owner, after using the live build — *"I feel the current design is disjoint and things don't connect well together"*, and *"the common pattern is usually you login before seeing the main page"*.

---

## Problem Statement

Every screen in this product does its own job well, and the product as a whole does not read as one thing. A person arrives at a page that proves the product on a real commitment, then meets a tour of *other kinds of commitment*, then three doors that look identical and behave differently, and no way to reach any of it except a link in the body of that page. The way into their own record is in the header; the record they might have is only reachable from a page they have to already be on.

The owner's diagnosis — *"disjoint"* — is correct, and so is their instinct that a sign-in belongs at the front. What the audit (2026-11-11, every route read) showed is that the front door is not so much missing a lock as missing a **spine**: eight top-level routes, no navigation in the frame, the same three figures rendered three different ways, and a receipt that is a dead end.

## Background and context

The build is complete against its own decisions (14 IPDs, 25 ITDs) and has been live-verified: a subscription approved and cancelled at PayPal, a document read by a model with every span checked, a live catalogue behind `/shop`. Each screen was decided on its own, which is how the pieces came to disagree with each other.

The audit found thirteen structural seams; the ones that decide this problem are:

- **The entry is a stage, not a front door.** Its second half is a taxonomy of commitment shapes (`app/page.tsx`), which is a feature list where a task should be.
- **There is no navigation.** `/shop` and `/read` are reachable only by a body link on `/`. The frame carries a service name, a text-size fieldset and an account control — settings, not navigation.
- **The same three figures have three renderers** (`CommitmentView`, `CommitmentRecord`, `account/page.tsx`), in three visual languages, and the receipt's first tile is not one of the three.
- **The record list cannot open the record.** No row on `/account` links to `/receipt/{id}`.
- **The receipt is an island.** It refuses to render without `?slug=`, and its only exits are `/read` and `/shop`.
- **Page furniture is copy-pasted**, which is why back links say "Back to the ways in" on four screens, "Back to the search" on five, and "Back to this product" on one.
- **One header control can be a no-op:** on `/account` the header's *Sign in* links to `/account`.

## Goals

1. A person can see where they are, what else there is, and how to get back — from every screen.
2. A person who has agreed to something before lands on it, not on an explanation of what agreeing means.
3. A newcomer still sees the product work before being asked for anything.
4. The same three figures are one artifact, rendered at one size, on every screen that shows them.
5. The frame stops being the largest thing on a phone.

## Non-goals

- Not a redesign of the type, colour or shape system: ITD 24 decided that, and it is not what is wrong.
- Not new product capability. No new PayPal surface, no new model behaviour, no new data.
- Not a general component library. Primitives only where the same thing is currently built more than once.
- Not a claim that the product now has an account. It still does not (IPD 25, ITD 22).

## Constraints

- **One solo developer, one day.** The hackathon closes 2026-11-12 17:00 EST and the three-minute video is still unrecorded, so this must not consume the time the video needs.
- **A visitor with no credentials must see the product work.** `SESSION_SECRET` and *Log in with PayPal* are configuration; the frame cannot depend on them.
- **No figure may be derived twice.** A primitive that renders figures takes them already computed.
- **The sandbox currently holds two subscriptions, both cancelled.** A signed-in home opens on two cancelled rows unless it points back at the proof.

## Assumptions

- A person who returns to a shop expects to land on *their* page and to reach the shop from it.
- The proof on the entry is the product's strongest asset for a stranger, and the weakest thing to put behind a gate.
- The audit's read of the routes is accurate; every seam it names was checked against the file it names.

## Problem Tree

```text
├── Q1. Where does a person's own record live, and what does the front door ask for?
│   ├── Is the entry the explanation, the record, or both in two states?
│   ├── Does the front door ask for identity before it explains anything?
│   └── What does a signed-in person land on when they have two cancelled rows and nothing else?
│
├── Q2. How does a person move between the parts of the product?
│   ├── What is in the frame on every screen — navigation, settings, or both?
│   ├── Where does a back link point, and what is it called?
│   └── How does the receipt lead somewhere instead of ending?
│
├── Q3. How is the same figure set shown the same way in three places?
│   ├── Is there one page shell, or one copy of it per route?
│   ├── Which figures belong in a row, and which in a record?
│   └── What stops them drifting again?
│
└── Q4. What does the product stop doing?
    ├── Is the taxonomy of commitment shapes the front door's job?
    ├── Does the entry need an invented product to demonstrate a one-time purchase?
    └── Which of the four doors survive as doors?
```

## Decisions

| # | Question | Document |
|---|---|---|
| IPD 28 | Q1, Q2, Q4 — where the record lives, what the front door asks, and where the sign-in control points | [`ipds/where-the-record-lives.md`](ipds/where-the-record-lives.md) |
| ITD 25 | Q3 — one page, one figure set, one row | [`itds/one-page-one-set-of-figures.md`](itds/one-page-one-set-of-figures.md) |

## Open questions

- **Does a signed-in home need the proof on it?** Two cancelled rows are an honest but poor opening. The solution below keeps one line back to the worked example; whether that is enough is a judgement no data answers before the video.
- **What happens to the bill door?** It is the only Invoicing surface, so it stays in the product — but it is a POST dressed as a link, and it has no place on a page that is otherwise a shop. It is demoted to a line under the document reader; whether it deserves a door of its own is left to usage.
- **The header wrap between 620px and 780px** (`todo.md` §1a) is untouched by this decision. Navigation makes the header taller; it does not make it shorter.
