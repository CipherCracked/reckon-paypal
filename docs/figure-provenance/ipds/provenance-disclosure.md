# IPD 18 — The Provenance Line

**Status:** Implemented (2026-11-08)
**Date:** 2026-11-08
**Answers:** Problem tree Q2 of `../intro.md` — *what may the screen say about where a figure came from?*
**Amends:** IPD 7's source line (`../../accessible-commerce-companion/ipds/rendering-model.md`) and IPD 14's single status statement (`../../demo-feel/ipds/entry-and-identity.md`), by separating the two: the status line says what the shop is, the provenance line says where a number came from.

---

## Problem to solve

Every screen that shows figures ends with one sentence about where they came from. On the entry and on the document door that sentence is true. On two screens it is not, and on one it contradicts the notice printed above it.

`components/CommitmentView.tsx:31` defaults `sourceNote` to *"Figures calculated from the PayPal order for this purchase."* Only two callers override it:

| Screen | What it passes | What is true |
|---|---|---|
| Entry (`/`) | *"Computed from the terms shown here. Nothing has been charged…"* | true |
| Document (`/read`) | *"Each figure is computed from the sentence beside it…"* | true |
| Product (`/product/[slug]`) | shows no figures, so no line | nothing to claim |
| Consent (`/consent/[orderId]`) | nothing — takes the default | **false**: computed from `lib/catalog/products.ts`; no PayPal call is made |
| Bill, PayPal reachable | nothing — takes the default | **half false**: `today` is checked against PayPal's amount; the term total and exit cost are not |
| Bill, PayPal unreachable | nothing — takes the default | **contradicted**: a notice above says the figures were computed from what the biller published, and the default says the opposite |

A default that is right for two callers and wrong for three is the defect, not the call sites. It also hides the wrongness: a caller who forgets is not told.

The question is not whether to keep a line. It is what the line is *for*: the shopper deciding whether to agree, or the judge checking whether the product's claim matches its architecture. Both read it, and they read it differently — the shopper wants to know whether to trust the number, the judge wants to know whether it could be checked if they looked.

## Options

### Option 1 — **One line beneath the figures, in three parts, written by every screen**

The sentence names its sources in the order the figures appear: what was read from PayPal, what was read from the seller's words, what nobody stated. No default in the component.

*How it feels:* the numbers have a footnote that is short, specific, and never the same on two screens — because the screens do not have the same sources.

### Option 2 — A marker beside each figure, linked to a legend

A small superscript on each amount, and a legend below explaining the markers.

*How it feels:* a paper with citations. Precise, and it puts three symbols and a key on the screen whose purpose is to reduce the number of things being looked at.

### Option 3 — No line at all

The arithmetic under each figure is the only annotation.

*How it feels:* confident. It also makes no claim that could be false — and leaves a judge unable to see the chain without reading the code, which the rules do not require them to do.

### Option 4 — A separate page about the numbers

A linked page repeating the provenance for the whole product.

*How it feels:* thorough, and invisible. A judge watching three minutes of video will not click it, which makes it the same as option 3 with extra steps.

## Reasoning

The figures already carry a line of arithmetic directly beneath each amount. The provenance sentence is the same kind of object — a short statement attached to a number, read at the moment the number is questioned — so it belongs in the same place, adjacent to the figure block, not on another page and not encoded in symbols.

Three parts, because the sources are three and the product's claim is *checkability*, not *PayPal-ness*. A figure read from the seller's published sentence is as checkable as one read from a plan: in both cases the number came from somewhere the reader can point at, and in both cases our arithmetic did the rest. A line that only claims PayPal would have to go quiet on the document door, which is the door where the product is strongest. Naming all three sources is also what makes the line honest on the bill, where `today` is checked against PayPal, the term is computed from the biller's published terms, and the exit cost may be stated by nobody.

The remedy is structural, not editorial. `sourceNote` becomes required. A caller that has nothing to say cannot compile, which is the only version of this rule that survives a ninth route. Deleting the default also removes a sentence that was doing two jobs: it claimed provenance *and* disclaimed advice (*"This page gives you no advice about whether to buy"*). The second clause is true on every screen and belongs with the product's standing statement, not attached to a figure that may or may not have come from PayPal.

## Decision

**Option 1.** Three rules:

1. **The line names sources, not reassurances.** What was read, and from which kind of source. No claims about what the screen does not do.
2. **An absent source is named as absent.** If nobody published an exit policy, the line says so, in the same sentence as the sources that do exist.
3. **The component has no default.** `sourceNote` is required, so an omission is a type error rather than a false claim.

On `/product` there are no figures and therefore no line. The seller's copy stands unlabelled there, because it is the input being translated, not a claim about a number. The fact that the catalogue is an example is stated once, on the consent screen, where money is involved (IPD 14).

## Tradeoffs

- **Every screen now writes a sentence**, and a screen with three sources writes a longer one. Length is the cost of having three sources, and shortening it by merging them is how the false line happened.
- **The line admits the catalogue is example content** on the screens that compute from it. That is deflating in a demonstration and is the point.
- **The shopper and the judge want different sentences.** A line written to satisfy an auditor can read as defensive to someone deciding whether to agree. The three-part shape is the attempt to serve both; it is unproven, and no user is available to test it.

## Notes

- The bills screen currently shows the false line *beneath* a notice that says the opposite. Whatever replaces it must not repeat that: in the unreachable state the notice already carries the provenance, and the line must agree with it rather than restate it differently.
- The "no advice" clause removed from the default is not dropped — it moves to the product's standing statement, which every screen already carries.
- This decision makes the claim testable. It does not make it true until ITD 17 is implemented: the line can only name PayPal as a source once something is actually read from PayPal.
- **Implemented 2026-11-08** as `lib/commitment/sources.ts` (`describeSources`, `absentFigureNote`) plus a required `sourceNote` on `CommitmentView`. Two refinements found in the build, both recorded rather than absorbed silently:
  - The absent clause reads **"Nobody published what it costs to leave."** The first wording was *"Not stated by anyone: …"*, which put the words "Not stated" twice on a bill screen — once in the figure, once in the line. The figure already says it; the line says why.
  - A **statement of state may follow the sources** (*"Nothing has been charged and nothing has been created at PayPal."* on the entry). The rule against reassurances was written for sentences about the screen's behaviour — *"this page gives you no advice"* — not for a fact about what has and has not happened to the shopper's money.
- **Amended 2026-11-08 by IPD 19:** the line gained a fourth part, a **quoted span** — *"What it costs to leave is quoted from the description shown on this page: \"cancel any time, no fee\"."* A figure read out of the seller's own sentence is a source the first three parts cannot describe: it is not a PayPal object, it is narrower than "the terms shown here", and it is emphatically not absent. The sentence is printed rather than summarised, because printing it is what makes the claim checkable.
