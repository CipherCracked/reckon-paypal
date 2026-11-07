# ITD 11 — One Commitment, Three PayPal Primitives

**Status:** Adopted (2026-11-07) — implemented: one `CommitmentTerms` in the middle, adapters at the edge
**Date:** 2026-11-07
**Answers:** Problem tree Q3 of `../intro.md` — *where does it meet people, if not in our store?*
**Serves:** IPD 11 revision (the hybrid), Stage 1.
**Amends:** ITD 1 (`../../accessible-commerce-companion/itds/paypal-integration.md`), which knew only orders and subscriptions.

---

## The problem

The screen is one thing; PayPal presents three. An **order** is a capture of one amount. A
**subscription** is a billing agreement with a plan, a cadence and a next billing time. An **invoice**
is a payable document with a due date, sent to a payer who may not have an account.

They differ in what they can tell us, and the difference matters to the reader:

| | Order | Subscription | Invoice |
|---|---|---|---|
| Amount today | yes | yes (first period) | yes (total due) |
| Cost across a term | from our own catalogue | from our own catalogue | not stated by PayPal |
| Cost to leave | from our own catalogue | from our own catalogue | never stated |
| When it is due | immediately | next billing time | a real due date |

If each surface gets its own screen, the product becomes three products that resemble each other,
and the one thing that makes it defensible — that every figure is computed the same way — stops being
true at the second screen. If instead everything is forced through the order API, invoices become
fake purchases and the due date is lost, which is the one fact a bill exists to convey.

## Options considered

### Option 1 — **Adapters at the edge, one `CommitmentTerms` in the middle**

Each surface gets a small adapter that turns what PayPal returned into a `CommitmentTerms`, plus the
metadata that has no place in the money model. Everything downstream — `computeCommitment`,
`presentFigures`, the view — is unchanged and unaware of the origin.

### Option 2 — A commitment service with per-shape plugins

A registry of surfaces, each registering its own read, render and payment hooks. Correct in a product
with ten surfaces; a heavier thing to build and test for three.

### Option 3 — A screen per surface

An order screen, a subscription screen, an invoice screen, each free to present its own numbers.

### Option 4 — Represent every commitment as an order

Create an order for a bill's amount and treat the due date as copy. Fewer code paths, one payment
flow, and a bill described as a purchase.

---

## Reasoning

**Option 3 fails the only rule that has survived every revision**: one rendering, one computation, no
modes. Three screens also triples what must be kept accessible, translated and compared, and the
comparison document (IPD 9) would have to describe three of them.

**Option 4 is the tempting shortcut and it is dishonest in the reader's direction.** A bill paid today
and a purchase made today are not the same commitment; the due date is not decoration, it is the
deadline, and it is exactly the fact the research says people with ADHD get wrong. Creating an order
to model a bill would also make PayPal's invoice semantics — the payer's hosted page, the due date,
the reminder — unavailable, so the demo would show less than PayPal can already do.

**Option 2 is the shape this becomes**, and building it now would be designing for surfaces that do
not exist. Three adapters are less code than a registry, and the registry can be extracted later from
three working examples, which is a much better moment to decide what the abstraction is.

**Option 1 keeps the invariant that matters**: every figure on every surface comes from the same
`computeCommitment` over the same `CommitmentTerms`, and the surface only decides *what it can fill
in honestly*. Where PayPal says nothing — an invoice's cancellation terms — the figure is "Not
stated", which the product already renders as a first-class answer rather than a blank.

**The due date does not become a fourth figure.** `RenderedFigure` carries `Money | null` and the
three figures answer one question: what will this cost me. A date answers a different question, and
merging it would either force the type to carry unions it cannot compute with, or make the comparison
document compare a date to an amount. Instead each surface may return a **commitment context** — the
source, the due date or next billing time, and the link where the payer settles it — and the view
renders that above the figures as its own line. The money model stays untouched, which is why the 104
existing tests survive this decision.

## Decision

**Option 1: adapters at the edge, one terms model in the middle, a context for everything that is not
money.**

1. **One adapter per surface** in `lib/commitment/adapters/`, each returning
   `{ terms: CommitmentTerms, context: CommitmentContext }`.
2. **`CommitmentContext`** — `{ source: "order" | "subscription" | "invoice"; dueDate: string | null;
   payerUrl: string | null; readOnly: boolean }`. It carries no money.
3. **Nothing below the adapter knows the surface.** `computeCommitment` and `presentFigures` keep
   their current signatures and their current tests.
4. **An invoice's unstated terms are "Not stated"**, not inferred from the presence of a due date.
5. **A surface that cannot produce a payable link says so**, and the view refuses to imply payment is
   possible (`missingLink`, `readOnly`).

## Tradeoffs

- **Three adapters are three places to be wrong**, each with its own "what can PayPal actually tell
  us" question. The mitigation is that they are the thinnest code in the product: mapping, no
  arithmetic.
- **Adapters that disagree about `exit`** would produce figures that look comparable and are not.
  There is one rule — if the seller or PayPal did not state it, it is `null` — and a test per adapter.
- **The context line is a second visual element** competing with the three figures, in a design that
  deliberately ordered and limited them. It must sit above them and read as fact, not as a fourth
  number.
- **Invoices will most often show "Cost to leave: Not stated"**, which is honest, slightly sad, and
  may read as the product failing rather than the biller failing. The copy has to attribute it:
  *the seller did not publish this*, not *we could not find it*.

## Notes

- Orders and subscriptions already work through this shape informally; this ITD makes the boundary
  explicit before the invoice path is added, rather than after.
- If a fourth surface arrives (a document the shopper brings), it uses the same adapter shape with
  `source: "document"` and `readOnly: true` — which is the whole point of deciding this now.
- Not decided here: whether the adapter for a document parses terms itself or receives them from the
  quote-grounded reader in ITD 10. That is an implementation detail of the same seam.
