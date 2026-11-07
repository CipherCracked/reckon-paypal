# Figure Provenance — Problem Decomposition

**Status:** Decided (2026-11-08) — 3 IPDs and 2 ITDs written, none implemented
**Date:** 2026-11-07
**Revision:** 2 (2026-11-08 — decisions written; as-built table corrected against the code)
**Question this document exists to answer:** *Where should each figure on the screen come from, and what may the product say when a source is silent?*
**Context:** PayPal AI Hackathon 2026 · solo · submissions close **2026-11-12, 5:00 PM EST** (5 days)
**Scope note:** an earlier decomposition asked what the product should adapt to the person. It was set aside unanswered on 2026-11-07; this tree takes the narrower question that survived it.
**Builds on:** `../accessible-commerce-companion/`, `../universal-commitment-companion/`, `../demo-feel/`. The money model, the figure order, the guard, the span verification and the frame all survive unchanged.

---

## Why this tree

The product makes a claim stronger than its build supports. Every screen says the figures come from PayPal. Most of them are computed from a file:

- `lib/catalog/products.ts` and `lib/catalog/bills.ts` hold names, copy, prices, terms and due dates as literals.
- `app/api/commitment/[orderId]/route.ts` computes the figures from that file and never contacts PayPal. `orderId` is echoed, nothing else.
- `components/CommitmentView.tsx:31` defaults its source line to *"Figures calculated from the PayPal order for this purchase"*. The bill page passes no override, so it inherits that line.

A shopper who reads the line is being told something untrue about where the number came from. That is the defect, and it is the whole subject of this tree.

[Research](research.md) established the shape of the problem: **seven of the eight fields behind the figures have a real PayPal home, and the eighth — what it costs to leave — has none.** PayPal carries price, term, recurrence, setup fee, shipping, tax, biller and due date across Catalog Products, Subscriptions, Orders and Invoicing. No PayPal object anywhere expresses an early-termination charge; `payment_preferences` governs payment *failure*, not walking away.

So the question is not whether the catalogue can be real. It can, mostly. The question is what the product may **say** — per figure, per screen — once some numbers come from a PayPal object, one comes from the seller's prose, and one comes from nowhere at all.

---

## Problem Statement

The product's central promise is that a figure can be checked. Three figures, one order, and a guard that drops any number it cannot derive. That guard is real and tested. What is not real is the attribution around it: the figures are honest, and the sentence describing them is not.

Making the figures honest is partly a data change and partly a claim change, and the two do not move together.

- **The data change** is bounded. Seven fields can be read from PayPal. One cannot, permanently.
- **The claim change** is a design problem. A screen that shows three figures from three different sources — a plan, a quotation, an absence — needs to say so without turning into a footnote about itself.

The tension this tree exists to resolve:

| The product promises | Reality of the sources |
|---|---|
| Every figure is derived from PayPal's object | One of the eight fields has no PayPal home, and never will |
| One screen, one provenance, stated once | Acquired today is arithmetic over a plan; exit cost is a policy; an absence is a fact |
| The number can be checked by the person reading it | PayPal's objects are merchant-scoped — the shopper cannot look at the plan |

Neither column is a failure. They cannot both be true, and choosing what the screen says is the work.

---

## Background and Context

### What the build does today (as-built, 2026-11-08)

| Surface | Where its figures come from now | What it says |
|---|---|---|
| Entry (`/`) | `lib/catalog/products.ts`, via `presentFigures` | *"Computed from the terms shown here. Nothing has been charged…"* — true |
| Product (`/product/[slug]`) | no figures — the seller's copy only | nothing, so it claims nothing |
| Consent (`/consent/[orderId]`) | `POST /api/commitment/{orderId}` → the same file; the route never contacts PayPal | *"Figures calculated from the PayPal order for this purchase"* — **false** |
| Bill, PayPal reachable (`/bill/[invoiceId]`) | the same file, with `today` checked against the invoice's amount | inherits the same false line — **half false**: one figure is checked, two are not |
| Bill, PayPal unreachable | the same file, from the biller's published terms | the same false line, beneath a notice saying the figures were computed locally — **contradicted on the same screen** |
| Document (`/read`) | verified literal spans from the shopper's own text | *"Each figure is computed from the sentence beside it…"* — true |
| Receipt (`/receipt/[orderId]`) | rebuilt from PayPal on request, refuses unless settled | true |

The document door is the model the rest of the product should follow: it reads a source, proves the span exists, computes locally, and says which sentence each figure came from.

### What the rules reward

From the hackathon rules (via `context.md` and the onboarding skill):

- **Stage 1 is pass/fail on two things**: meaningful use of the PayPal developer platform, and meaningful use of AI. Both must be central, not decorative.
- **Stage 2** scores Technological Implementation, Design (*"a complete, coherent product experience"*), Potential Impact, Innovation and Presentation, equally.
- **Judges are not required to run the project.** They may judge on text, images and video alone.

The consequence is direct. Provenance is the one claim in this product that a judge can check from a screenshot — either the sentence matches the architecture or it does not. And moving the figures onto real PayPal objects is the clearest way to make PayPal structural rather than decorative, which is Stage 1's test.

### What earlier decisions already settled

| Decision | What it binds here |
|---|---|
| [IPD 7 — rendering model](../accessible-commerce-companion/ipds/rendering-model.md) | Three figures, in one order, each with its arithmetic. This tree changes where they come from, not how they are presented |
| [ITD 2 / ITD 10 — quote-grounded reading](../universal-commitment-companion/itds/quote-grounded-reading.md) | A model may copy spans; the server verifies each is literally present; no numeric field is trusted from the model |
| [IPD 8 / ITD 6 — commitment continuity](../accessible-commerce-companion/ipds/commitment-continuity.md) | The receipt is rebuilt from PayPal on request and stores nothing. It is already the only fully sourced screen |
| [IPD 9 — outcome and evidence](../accessible-commerce-companion/ipds/outcome-and-evidence.md) | What the product may claim is bounded by what it can evidence. This tree applies that rule to the product's own copy |
| [IPD 4, 5, 10 — trust, scope, adaptation](../accessible-commerce-companion/ipds/adaptation.md) | **Untouched.** The narrowed question removes adaptation from scope entirely, so nothing has to be revised |

### What the research found

From [research.md](research.md), verified against PayPal's own operation pages on 2026-11-07:

| Field | PayPal source | Verdict |
|---|---|---|
| Product name, copy, type, category, image | Catalog Products v1 — `GET /v1/catalogs/products/{id}` | available |
| Price | Plan `pricing_scheme.fixed_price`, or order `unit_amount` | available |
| Term and recurrence | Plan `billing_cycles[]` | available |
| Setup fee | Plan `payment_preferences.setup_fee` | available |
| Shipping, tax | Order `amount.breakdown` | available |
| Biller, due date | Invoice `detail.invoicer`, `detail.due_date` | available |
| **Exit cost** | — | **absent from every API** |

Two details that shape the options:

1. **A catalog product has no price field.** The list endpoint returns `id`, `name`, `description`, `create_time` only. Price lives on the billing plan, so a shop listing built from PayPal is names without numbers unless plans are fetched per product (`GET /v1/billing/plans?product_id=…`).
2. **Invoicing carries free text.** `detail.terms_and_conditions` and `detail.note` are merchant-controlled prose. That is where a seller's exit policy can actually be published — which means the exit figure has a source after all, just not a structured one.

Of the nine sponsors, one is relevant and only to the shop: **Channel3** supplies retail product data with prices, images and merchant offers, no terms, and introduces a second price authority from retailers this product does not sell for. The other eight supply no content. Recorded in [research.md](research.md) and not carried further here.

---

## Goals

1. **State, per figure, where it comes from** — and make the statement true. No screen may attribute a computed number to a source it did not use.
2. **Decide what each source may claim.** A figure derived from a PayPal plan, a figure read from a verified span, and a figure that is absent are three different claims and must not share a sentence.
3. **Give the exit figure a source**, given that PayPal has no field for it — or decide that its absence is the answer, stated as an absence.
4. **Decide how much of the build sources from PayPal**, weighing a real provenance chain against a sandbox that must exist before a judge opens the video.
5. **Keep every existing invariant intact.** Integer minor units, the figure order, the guard, span verification, no verdict, one rendering.

## Non-Goals

- Not personalisation. What the product may know about a person, and what it should adapt to them, is outside this tree.
- Not a redesign of the figures, their order, or their arithmetic.
- Not a new product surface. The eight routes stay.
- Not a catalogue of real goods. This is not a storefront and Channel3 is not adopted here.
- Not a review of the model layer, the transport, or the prompts.

## Constraints

- **Five days** (2026-11-07 → 2026-11-12, 5:00 PM EST), solo.
- **Judges may not run it.** A provenance chain that only exists at runtime is invisible; the statement has to be legible in a screenshot or on video.
- **The sandbox is currently unreachable.** `AUTHENTICATION_FAILURE` — invalid or missing credentials. Nothing in this tree can be verified against PayPal until that is fixed, so the mapping stays a reading of the published schema until a live call confirms it.
- **Both PayPal and AI stay central.** A change that removes a surface's dependence on PayPal weakens Stage 1 rather than strengthening it.
- **Money invariants bind:** integer minor units; **no number on screen that is not derived from PayPal's amount or a verified literal span**; an absence is stated as an absence.
- **Earlier decisions bind until amended in writing**, with a date and a reason.

## Assumptions (challengeable)

- A provenance line belongs to the figure or the screen, not repeated on every one of them.
- A shopper reads one sentence about sourcing and ignores a second; a judge reads both.
- PayPal's sandbox objects can be created once and survive to judging, and a reset is a recoverable failure rather than a fatal one.
- A verified span from the seller's own prose is a source of equal standing to a PayPal field, because both are the seller's statement.
- An absence stated as an absence is worth more than a number that had to be invented to fill it.

---

## Problem Tree

```text
├── Q1. Which figures must come from PayPal, and which may it never supply?
│   ├── Seven of eight fields have a PayPal home. Which object is authoritative
│   │   for the figure shown — the plan, the order, or the invoice?
│   ├── Must a figure exist as a PayPal object before it is displayed, or may it be
│   │   arithmetic over a plan that has been read?
│   ├── What happens on screen when the sandbox is empty, reset or unreachable?
│   └── Does a figure that is only arithmetic over a plan count as "from PayPal"?

├── Q2. What may the screen say about where a figure came from?
│   ├── Three honest states: derived from a PayPal object; read from a verified span;
│   │   not stated by anyone.
│   ├── The false line exists today. Which screens inherit it, and what replaces it?
│   ├── One provenance line per screen, per figure, or per commitment — and who is it for:
│   │   the shopper deciding, or the judge auditing?
│   └── Does stating the source beside the figure undermine the figure it describes?

├── Q3. Where does the exit figure come from, given PayPal has no field for it?
│   ├── Declared unknown, as the bill screen already does when a biller publishes nothing.
│   ├── Read from the seller's prose — invoicing offers `terms_and_conditions` and `note`,
│   │   and the document door already verifies spans before trusting them.
│   ├── Written by the operator and labelled as policy rather than as fact.
│   └── Is "the seller published nothing" a finding to report, or a gap to fill?

└── Q4. Is sourcing from PayPal worth the fragility it introduces?
    ├── The catalogue must exist at sandbox before judging, and judges will not run it.
    ├── A reset or an outage is a demo that fails in the video, not a screen that degrades.
    ├── Fewer real objects, or more example ones — which serves a three-minute watch?
    └── What must stay true for the claim to survive a screenshot with no network behind it?
```

---

## Decisions

| Root | Decision record | Answer | Status |
|---|---|---|---|
| Q1 — which figures must come from PayPal | [ITD 17 — figure sources](itds/figure-sources.md) | Each figure declares the object it was read from; where none exists, it declares the seller's published terms. A figure is *derived from PayPal* only when our arithmetic used numbers read from a named object in the same request | Proposed |
| Q2 — what the screen may say | [IPD 18 — the provenance line](ipds/provenance-disclosure.md) | One line beneath the figures, three parts, written by every screen; no default in the component | Proposed |
| Q3 — where the exit figure comes from | [IPD 19 — the exit figure](ipds/exit-figure.md) · [ITD 18 — reading a seller's published terms](itds/reading-published-terms.md) | The seller's words, quotation-verified; silence is reported as silence, never estimated and never omitted | Proposed |
| Q4 — whether to source from PayPal | [IPD 20 — how much sources from PayPal](ipds/sourcing-scope.md) | PayPal first, the seller's file second, and the screen says which — with a gate on the sandbox answering by 2026-11-09 | Proposed |

Two consequences worth stating plainly:

- **The false line is the only part of this that can be fixed without PayPal answering.** IPD 18 does not depend on credentials, a sandbox object, or a live call. It is a copy change and a required prop.
- **Nothing here is implemented.** The decision records are written; the build is unchanged, `sourceNote` still has its false default, and the consent and bill screens still claim the order.

---

## Open Questions

1. **Does the shop need to exist, or can it shrink to the one product the entry works?** A listing built from PayPal needs a plan fetched per product, and the shop is the weakest surface in the product. Dropping it removes the problem and removes a door.
2. **Does the financing shape have a PayPal home at all?** The mattress's origination fee is not a PayPal concept — a plan has `setup_fee`, which is close, but an instalment schedule with a fee may not map. If it does not, the third product either changes shape or stays an example.
3. **Should the exit figure be labelled as the operator's policy, or dropped when the seller is silent?** The bill already answers this one way (declared unknown). Whether a *product* may say the same is unsettled.
4. **Does the provenance line belong to the figure or to the screen?** Three figures from three sources may need three lines, which is the density the product exists to reduce.
5. **Can any of this be verified before the submission closes**, given the sandbox is currently refusing credentials?

---

## Research Confidence

| Claim | Source | Confidence |
|---|---|---|
| Catalog products carry name, description, type, category, image and home URL, and no price | PayPal Catalog Products v1 operation pages | **High** |
| Billing plans can be listed by `product_id` and carry cycles, term and a setup fee | PayPal Subscriptions v1, List plans | **High** |
| No PayPal API expresses an early-termination charge | Absence across Catalog, Plans, Orders and Invoicing | **High** — an absence, stated as one |
| Invoices carry biller, due date and merchant free-text terms | Invoicing v2 operation summary | **Medium** — field paths from the schema, not a live call |
| Seven of eight fields can be sourced without inventing an order | [research.md](research.md) mapping | **Medium–High** — schema-read, not exercised, because the sandbox refuses credentials |
| Sourcing from PayPal is worth the fragility | No test | **Low** — this is what Q4 exists to decide |
| One relevant sponsor, and only for the shop | Vendor documentation for all nine | **Medium** — [research.md](research.md) |
