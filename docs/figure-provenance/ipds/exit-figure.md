# IPD 19 — The Exit Figure

**Status:** Proposed
**Date:** 2026-11-08
**Answers:** Problem tree Q3 of `../intro.md` — *where does the exit figure come from, given PayPal has no field for it?*
**Serves:** ITD 18, which decides how a seller's prose becomes an amount.

---

## Problem to solve

The product exists for its third figure. What a commitment adds up to is arithmetic anyone can do with a calculator; what it costs to leave is the term sellers leave out, and it is the one a shopper discovers too late.

**PayPal has no field for it.** A billing plan carries `payment_preferences` with `setup_fee`, `auto_bill_outstanding`, `setup_fee_failure_action` and `payment_failure_threshold` — all of which govern a *failed payment*, none of which charges for *walking away*. Invoicing has free-text `terms_and_conditions`. Orders have nothing at all. So the figure is either read from the seller's published words or it is invented, and those are the only two possibilities.

The build already knows this. `lib/commitment/types.ts` gives exit three states — `none`, `fee(amount)`, `unknown` — and `CommitmentView.tsx:66` renders the third as *"Not stated"* with the note *"This seller has not published what it costs to cancel."* The bill door uses all three. The products use `fee(0)` for the coffee subscription, whose copy says *"cancel any time, no fee."*

What is undecided is whether that is a policy or an accident of how the catalogue was written.

## Options

### Option 1 — **Report the seller's silence as a finding, and quote them when they speak**

The figure comes from the seller's published words. When those words state a number, the figure is that number and keeps the sentence it came from. When they are silent, the screen says "Not stated" and does not soften it. When they state the absence — "cancel any time, no fee" — that is a published term and shows as zero, not as silence.

*How it feels:* the seller's own conduct, reported. On a bill where the biller said nothing, the third figure is empty and the screen says why.

### Option 2 — Estimate it from the category

Show a typical cancellation charge for subscriptions of this shape, sourced from market data.

*How it feels:* helpful, and it puts our guess where the seller's term belongs. A shopper who reads "$40 to leave" and is later charged nothing, or $120, has been given a number by us and not by them.

### Option 3 — Omit the figure when it is unknown

Two figures instead of three, with no third line at all.

*How it feels:* cleaner, and it removes the only figure most sellers omit — which is the one the product was built to surface.

### Option 4 — Read the seller's page at render time

Follow a link to a cancellation policy and read it live.

*How it feels:* thorough. It also makes correctness depend on a third party's markup at the moment a judge opens the video, and reading someone else's site to demonstrate a product is a choice that needs more justification than a hackathon week allows.

## Reasoning

The product's claim is about the *seller*, not about itself. Its three figures are a report: this is charged now, this is the total, this is what leaving costs. A report that fills a gap with an estimate is no longer a report, and the guard that drops unverifiable figures would have to be suspended to allow it — which means option 2 contradicts the invariant the rest of the product is built on.

The distinction that matters most is between **two kinds of silence**: a seller who published "no fee" and a seller who published nothing. They are not the same fact and must not render the same way. `fee(0)` is a term; `unknown` is the absence of one. Collapsing them — showing "$0" for both, or "Not stated" for both — tells the shopper something untrue in one direction or the other. The current data model already keeps them apart, and this decision is to keep it.

Option 3 looks honest and is a quieter version of the same failure. The exit figure is the one that is missing from the seller's page; removing it from ours restores the asymmetry the product exists to correct. A screen that says "Not stated" has told the shopper something they could not have learned from the seller, which is the whole point.

Option 4 is not rejected on capability — Kernel could do it — but on what it makes true. If the answer depends on a live fetch of a page we do not control, then the claim "this is what it costs to leave" is true only when the network was up and the page had not changed. The product would be reporting the web, not the commitment.

## Decision

**Option 1**, with a source hierarchy that is explicit on screen:

1. **The seller's structured terms** — a plan's `payment_preferences`, an invoice's `terms_and_conditions` — carry the most weight, because they are machine-readable and stable.
2. **The seller's prose** — a product description, an invoice note — is read next, quotation-verified (ITD 18). The figure keeps the sentence that produced it.
3. **Silence is a finding.** "Not stated", with *"This seller has not published what it costs to cancel."* No estimate, no softening, no omission of the line.

The screen never says the absence is our failure to look. It says the seller did not publish, which is a fact about them.

## Tradeoffs

- **A real bill can show two of its three figures as "Not stated"**, and the screen looks emptier than the product's argument. This is the harm case, not a defect in the rendering.
- **"Not stated" can be wrong in the shopper's favour of doubt.** A seller whose policy exists behind a link we did not follow is reported as silent. We are reading what they put in front of the shopper, and saying exactly that.
- **Prose reading costs a model call** and can fail; a failed read must render as silence with a reason, never as zero.

## Notes

- `fee(0)` and `unknown` must stay distinct in the type, the copy, the read-aloud text and the comparison document. Any place that maps both to "no charge" is a defect.
- The comparison document (IPD 9) generates the seller's copy beside the figures. The exit figure's absence is one of the things it counts, so this decision changes what that document reports rather than only what the screen shows.
- The document door already produces an exit figure from a verified span. On a bill, that is the same mechanism applied to a different source, which is why the implementation is a reuse rather than a new capability.
