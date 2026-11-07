# App completeness — problem decomposition

**Status:** decomposition only. No solutions, no scope commitments.
**Date:** 2026-11-07 (rev. 3) · Evidence base: [`research.md`](./research.md)
**Scope of this tree:** the problem and the product. Submission packaging — repo, licence, README
credentials, video, Devpost copy — is tracked separately and is deliberately out of scope here.

---

## Problem statement

The app turns a commitment into three figures at the moment of consent, does it honestly, and backs
it with a real payment. Recent research into the problem undermines three parts of the premise:

1. **More figures is not obviously better.** Comprehension research favours *fewer, ordered* items,
   and shows that the *unit* of a figure (dollars, percentages, frequencies) can matter more than
   whether it was translated at all. Our three-figure rendering is a hypothesis, not a finding.
2. **The harm happens later than we intervene.** The measurable damage is not one misunderstood
   price; it is the subscription someone stopped thinking about — the average consumer juggles 12
   subscriptions, 42% have forgotten one, and ~$200/year leaks to "ghost" subscriptions. Every
   existing tool attacks that from the bank feed, after the fact.
3. **The audience will never declare itself.** ~34% of US adults have low numeracy, dyscalculia is
   hidden, and almost nobody self-identifies. A product that reaches people only when they ask for
   help reaches almost none of them — and nobody has yet been shown to be willing to *host* the
   screen we built.

So the question is not "what feature is missing". It is **whether the app is aimed at the right
moment, the right rendering, and the right owner — and what else it must do to be a complete
product rather than a well-built screen in the wrong place.**

## Background — what exists today (as-built, 2026-11-07)

| Area | State |
|---|---|
| Storefront | 3 hardcoded products; no search, categories, or external data |
| Commitment translation | Deterministic, integer cents, three figures + breakdown, well tested |
| Commitment shapes | One-time and recurring integrated; financed described but paid as a single order |
| AI involvement | Labels + plain-language summary; schema has no monetary field; guard rejects figures. Inactive without a key |
| PayPal | Orders v2 with payer approval + capture; Billing Plans + Subscriptions. Live-verified in sandbox |
| Persistence | None. Order id lives in the URL; nothing is stored, listed, or returned to |
| Shopper identity | None. No account, no history, no receipt |
| Adaptivity | One fixed rendering; no preferences, no alternate formats, no audio |
| Accessibility | WCAG 2.2 AA pass: semantic `<dl>`, 44px targets, focus management, unique names |
| Failure handling | Degraded screen, drift guard, cancel path, double-capture path |
| Evidence | None produced by the product itself; no tester has used it |

## Goals

1. Test our own premise against the evidence and decide whether the product's centre of gravity —
   the moment of consent, the three-figure rendering, the merchant-hosted storefront — is right.
2. Identify the extensions that would make the product **complete for a real audience**, not merely
   finished as a demo.
3. Keep the working path whole: the deterministic money and the PayPal integration are the asset.

## Non-goals

- Submission artefacts: licence, repo, video, Devpost copy, deployment.
- A general-purpose store: catalogue management, carts, inventory, fulfilment, shipping.
- Real financing contracts, credit assessment, or lending advice.
- Accounts with us, or collecting anything about a person's condition.
- Open banking integrations, bank-feed aggregation, or access to anyone's transaction history.

## Constraints

- Solo. No designer, no reviewer, no researcher.
- PayPal sandbox only: no live payments, no KYC, no production app review.
- No research participants available; evidence must come from methods that do not require
  recruiting, or from the literature.
- No availability guarantees on third-party data or model keys at the moment of judging.
- Existing architecture must survive: 68 tests and a verified sandbox path.

## Assumptions

- The three-figure translation remains worth defending until evidence says otherwise, and the tree
  includes the question of whether it is.
- Anything added should be explainable in one sentence a shopper would use.
- The user is a shopper, not a merchant; nothing here should turn the app into a merchant tool.

---

## Problem tree

```text
Is this aimed at the right moment, the right rendering, and the right owner?
│
├── Q1. Is "translate it into three dollar figures" the right intervention at all?
│   ├── Which rendering do the evidence and the target reader actually favour —
│   │   dollars, frequencies, per-use costs, fewer items, ordered items?
│   │   (Less-is-more; low-numeracy readers are drawn to percentage formats.)
│   ├── What does the shopper need beyond the figures to judge a commitment —
│   │   renewal date, how to leave, what happens if a payment fails?
│   └── Where does adding more stop helping and start crowding?
│
├── Q2. Whose tool is this, and who has a reason to show it?
│   ├── Why would a merchant display a screen that may talk a shopper out of the sale —
│   │   unless they are made to, or it earns them something?
│   ├── If not the merchant, then who is present at every checkout — the payment
│   │   platform, the browser, the payer's bank — and what changes if it is them?
│   └── What already exists (bank-feed monitors, cancellation services, unit-price law)
│   │   and what does this do that they cannot?
│
├── Q3. Is the moment of consent the right point of intervention?
│   ├── Where does the harm actually accrue — at the decision, or in the months of
│   │   automatic renewal after it?
│   ├── What must the product do *after* payment for the promise made at consent to be kept?
│   ├── Does it help someone leave a commitment, or only enter one — and does the
│   │   regulatory shift (click-to-cancel vacated; Consumer Duty in the UK) change that?
│   └── What carries the commitment between moments if nothing may be stored about a person?
│
├── Q4. What outcome is this product accountable for?
│   ├── Is success comprehension, a better decision, less later regret, or fewer
│   │   forgotten renewals — and which of those can be shown rather than asserted?
│   ├── What can be measured without recruiting testers, and what artefact could stand in
│   │   for evidence (a comparison against how the same terms read today)?
│   └── What would count as the product having failed its own user?
│
└── Q5. How does it reach people who will never declare a need?
    ├── Which differences between readers actually change what a good answer looks like
    │   (reading level, unit, chunking, audio, language) — and what may never be inferred?
    ├── What can a shopper change for themselves without being asked to name a condition?
    └── Where does one universal rendering fail the least numerate reader it was built for?
```

---

## What changed from rev. 2, and why

| Rev. 2 question | Fate | Reason |
|---|---|---|
| What the shopper still doesn't know at consent | **Merged into Q1** | Still the core product question, now framed as *is our rendering right* rather than *what is missing* |
| How far the app reaches beyond our three products | **Folded into Q2** | Reach is a deployment question, not a catalogue question |
| Does the experience continue after payment | **Promoted to Q3** | Research places the measurable harm after consent; this is now a root, not a child |
| How does it adapt without asking who they are | **Became Q5** | Kept, but grounded in the size of the undiagnosed audience |
| Where the model earns more than a sentence | **Demoted to a child of Q1** | The model's job is a rendering question; the tree should not treat it as a pillar |
| — | **New: Q2 (who hosts it)** | Nothing in the current design explains why anyone would deploy it |
| — | **New: Q4 (what outcome)** | Potentially the most consequential: we cannot claim impact we cannot show |

---

## What "appears complete" means for this product

A checklist to judge candidate extensions against, not a set of answers:

- **Every shape the app claims to handle behaves differently and correctly.**
- **Every screen has a beginning, a middle and an end** — including after success.
- **Nothing on screen is a placeholder**: fixed copy, one rendering, no trace of the shopper.
- **The app works when its dependencies do not** — no key, no network, no model.
- **A stranger can use it without reading anything** and still reach the right conclusion.
- **The product can say who it is for, who would deploy it, and what it would change.**

## Selection criteria for whatever comes next

1. It changes what someone sees or understands, not just what the app can do.
2. It can be built, tested and demonstrated in days rather than weeks.
3. It does not touch the money computation or the PayPal integration.

---

## Open questions

1. **Is the premise updatable?** If the evidence favours fewer, ordered, differently-united figures,
   are we willing to change the rendering — or does the three-figure translation stay as the fixed
   centre of the product?
2. **Who owns the screen?** Merchant-hosted (our store), payer-side (a tool the shopper arrives
   with), or platform-side (something a payment provider could turn on)? Each implies a different
   demo and a different credibility story.
3. **How far after payment may the product go** when it is allowed to store nothing about the
   person? Is a downloadable artefact (a receipt, a calendar entry, a shareable link) acceptable?
4. **What counts as proof** absent real users — a documented before/after comparison, an expert
   review, or a measured internal benchmark?
5. **Which reader do we design the universal rendering against** — the median shopper, or the least
   numerate reader — and what does that cost the median reader?
6. **Does the financed shape belong** in a product that cannot offer real financing?

---

## Amendment — 2026-11-07, later the same day

The "as-built" table above was written before the build moved on, and two of its rows and the
closing line below are no longer true. Recorded here rather than rewritten, so the record shows what
was believed when the tree was drawn.

- **Storefront → four doors.** The home page is now the question *what are you being asked to pay?*
  with a purchase, a subscription, a bill (a real PayPal invoice) and a pasted document beside each
  other; the shop is one of them (`../universal-commitment-companion/ipds/front-door.md`).
- **Adaptivity → reader-owned.** Text size, one figure at a time and read-aloud now exist
  (`../accessible-commerce-companion/ipds/adaptation.md`), stored in the browser, nothing inferred.
- **Shopper identity → a record they keep.** A settled payment can be rebuilt from PayPal on request,
  with a calendar entry for the next charge, and nothing stored (`commitment-continuity.md`).
- **Test count:** 68 at the time of writing; the suite stands at **191**.
- **The four new pairs are now built**, and so are the three from the second tree; the sentence
  ending "*none of the four new pairs is implemented*" below is superseded.
- Still true: no persistence, no accounts, no external data beyond PayPal and the model.

## Where each question is answered (2026-11-07)

| Tree question | Product decision | Technical decision |
|---|---|---|
| Q1 — is three dollar figures the right intervention | [`ipds/rendering-model.md`](../accessible-commerce-companion/ipds/rendering-model.md) — order by decision weight, dollars with arithmetic | [`itds/rendering-strategy.md`](../accessible-commerce-companion/itds/rendering-strategy.md) |
| Q2 — who hosts it | [`ipds/host-and-ownership.md`](../accessible-commerce-companion/ipds/host-and-ownership.md) — the payment platform's approval step | [`itds/delivery-surface.md`](../accessible-commerce-companion/itds/delivery-surface.md) |
| Q3 — is consent the right moment | [`ipds/commitment-continuity.md`](../accessible-commerce-companion/ipds/commitment-continuity.md) — the shopper carries the record | [`itds/carrying-the-commitment.md`](../accessible-commerce-companion/itds/carrying-the-commitment.md) |
| Q4 — what outcome is it accountable for | [`ipds/outcome-and-evidence.md`](../accessible-commerce-companion/ipds/outcome-and-evidence.md) — legibility, shown by comparison | [`itds/comprehension-signal.md`](../accessible-commerce-companion/itds/comprehension-signal.md) |
| Q5 — how it reaches people who never declare a need | [`ipds/adaptation.md`](../accessible-commerce-companion/ipds/adaptation.md) — accessible default, reader-owned controls | [`itds/adaptation-without-profiling.md`](../accessible-commerce-companion/itds/adaptation-without-profiling.md) |

Every decision above is **proposed**; none of the four new pairs is implemented. The one consequence
already shipped is IPD 6's production-placement line on the consent screen.

