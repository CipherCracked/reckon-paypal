# IPD 21 — The Entry Shows the Work

**Status:** Adopted (2026-11-10) — **built (2026-11-10)**
**Date:** 2026-11-10
**Answers:** Problem tree Q1 and Q2 of `../intro.md` — *what must a stranger know after ten seconds*, and *how is a seller's sentence becoming three figures shown without an explainer*.
**Amends:** IPD 14 (`../../demo-feel/ipds/entry-and-identity.md`) — the verdict that the entry works one commitment in full stands. What that worked example is made of changes: it must show the seller's words, not only the figures.
**Supersedes:** nothing.

---

## Problem to solve

The first screen states the product's claim and never shows the act that earns it.

A stranger meets a headline — "Every payment asks you to work something out" — one worked coffee subscription with its three figures, and four door labels. The figures carry their arithmetic, which is good. What is missing is the other half of the product: **the sentence the figures were read out of.** Nowhere on the entry is there a seller's written words beside the reading of them.

Two independent blind readings of the build found the same absence, without coordinating:

> The seller's copy is a muted paragraph and the figures are a grid. Nowhere is there a two-column "what they wrote / what we worked out".
> — the product reading

> There is no side-by-side of what the seller wrote versus what the shopper reads, even though the code to generate one exists.
> — the judge reading

The cost is specific. "The model reads the seller's sentence" is a claim. A reader can only believe it by seeing the sentence and the figure together, close enough that the connection needs no explanation. A headline that asserts the connection asks the reader to take the product's word for the one thing it exists to prove.

There is a second, smaller defect on the same screen: the headline names the *reader's* difficulty ("asks you to work something out") and never names the reader. The only sentence on the site that says who this is for is the footer line about a hackathon.

## Options

### Option 1 — Rewrite the copy, keep the layout

A new headline that states the job and the audience, the same worked card beneath it. *How it feels:* a better-labelled prototype — the reader is told what the product does, and the screen still does not show it.

### Option 2 — **One seller sentence beside its three figures, with the source line, above the fold**

The headline states the job and the readers. Beneath it, one real catalogue commitment is shown in two columns: on the left the seller's own sentence, quoted and attributed; on the right the three figures with their arithmetic, each marked as worked out from that sentence where that is true. One primary action leads into the full journey; the other doors stay as a quieter row.

*How it feels:* the product introduces itself by doing the thing, and the thing is visible without a click.

### Option 3 — A "how it works" panel above the example

Three numbered steps explaining read → verify → compute, followed by the figures. *How it feels:* a product explaining itself in the third person; the reader learns the architecture instead of seeing the result.

### Option 4 — A recorded reading on the entry

A short animation of a sentence being highlighted and figures appearing. *How it feels:* a video on the home page — convincing the first time, unverifiable the second, and it cannot be replayed by someone using a screen reader.

## Reasoning

The product's claim is not that the figures are correct — a calculator can claim that. The claim is that **a figure can be traced to the words that produced it.** Traceability is demonstrated by placing the trace on the screen, at the same moment, in the same reading order. Any placement that separates the sentence from the figure turns a fact into a description of a fact.

The two-column arrangement also serves the person the product was built for. COGA guidance asks that related information be grouped so it need not be held in memory; a reader who cannot retain a quantity across a scroll is exactly the reader for whom "here is what they wrote, here is what it means" must be one glance.

The choice of worked example is decided by the same logic, and it reverses a recommendation from the blind readings. Both reviewers proposed featuring the mattress or the clinic bill instead of the coffee subscription, on the ground that a $0.00 exit cost "demonstrates nothing". For the *figure* that is true. For the *transformation* it is the opposite: the coffee subscription is the one product whose exit term is stated in words — *"cancel any time, no fee"* — so its `$0.00` is the only exit figure on the entry that can be shown to have been read. A figure that happens to be zero, sitting beside the sentence that produced it, proves the mechanism. A figure of `Not stated` proves only the honesty rule, which is a different and later claim. The mattress earns its place as a second line, not the headline.

Naming the audience in one sentence is not marketing. The product's scope decision (dyscalculia first, ADHD and dyslexia served by the same screen) is otherwise invisible until a reader opens a decision record, and a judge scoring Potential Impact has nothing to score.

## Decision

**Option 2.** On the entry, above the fold:

1. **A headline naming the job**, in the product's own voice, and **one sentence naming who it is for** — adults who find billing language hard, including people with dyscalculia, ADHD or dyslexia — without asking the reader to identify as any of them.
2. **The seller's sentence, quoted and attributed** — the span the reading accepted from the coffee subscription's description, presented as the seller's words, not as our summary. The screen renders what verification accepted; it does not hardcode a sentence the model may not have chosen.
3. **The three figures beside it**, in the established order (across the term, cost to leave, charged today), each with its arithmetic, and the exit figure marked as read from that sentence.
4. **One line stating the relationship**: the figures were worked out from the words shown, not entered by hand.
5. **One primary action** into the full journey. The other three doors remain, in a quieter second rank.
6. **One contrast line below**, naming the opposite case — a seller who published nothing, and the screen that says so — so the honesty rule is present on the entry as text rather than as a claim.

## Tradeoffs

- **The entry grows.** A quoted paragraph, three figures, a second-rank row and a contrast line compete for one screenful; the sentence and the figures must survive being viewed on a phone.
- **One example still privileges one shape.** The reader who arrived with a bill meets a subscription first, and must find their door in the second rank.
- **A quoted sentence is somebody's marketing copy.** It must be presented as the seller's, never restyled into our voice.
- **The contrast line risks explaining the mechanism twice.** If it reads as a caption for the product rather than a fact about a seller, it should be cut in favour of the second-rank row.

## Notes

- The worked example is computed at render time from the catalogue and the seller's sentence; it creates no PayPal object and must say so, exactly as the current entry does (ITD 16).
- The exit figure on the coffee subscription is currently a structured `{ kind: "fee", fee: $0.00 }`, so it is *not* read from the sentence at render. To make the entry's claim true, the example must take the `unknown` path through `resolveExitTerm`, or the screen must not claim the figure came from the quoted words. This is the one place where the copy and the code can disagree, and the code is the thing that has to change.
- Where the quoted span is displayed, it must be the same span the verification accepted, not the whole description with the exit sentence picked out by eye (ITD 19).

## Revision — 2026-11-10 (adversarial review, before any build)

The decision above is unchanged. Four things it did not account for were found by reading the code, and they are conditions on building it rather than amendments to it.

1. **The entry has no time budget, and this decision arms the wait.** Only the bill page wraps its reading in `withBudget` (`app/bill/[invoiceId]/page.tsx:50`); the entry (`app/page.tsx:41`) and the receipt call `resolveExitTerm` bare. Today the coffee subscription never reaches the model because its exit is structured. The moment it takes the `unknown` path — which this decision requires — the entry performs a model call on every render with a cold cache, against a client that allows three attempts of 45 s. **Building this decision requires adding the same budget to the entry (and the receipt), or the front door becomes the slowest page in the product.** The 10-minute cache life means this is not theoretical: a visitor arriving after the cache has expired pays the full wait.
2. **On the PayPal path there is no seller's sentence to quote.** `resolveProduct` prefers PayPal; `termsFromPlan` forces the exit term to `unknown` (`lib/paypal/catalog.ts:94`), and the catalogue product this demo creates carries **no description** (`lib/paypal/subscriptions.ts:70-81`), which `readProductCardFromPayPal` reads as `""` (`lib/paypal/catalog.ts:123`). So with `PAYPAL_PRODUCT_COFFEE_SUBSCRIPTION` configured, the entry's summary is empty and its third figure reads "Not stated" — before this decision is built, not after. The worked example cannot claim a quotation on that deployment. **Either the catalogue product is created (or patched) with the seller's copy in its description, or the entry takes its worked example from the file and says so.** The second is the smaller change and the honest one; the first is the better demo.
3. **The exit figure has no arithmetic.** `presentFigures` hardcodes `exit: null` (`lib/commitment/present.ts:89-93`). Decision §3 asks for "each with its arithmetic"; for the exit figure there is none to give, and the screen must show the quotation in its place rather than an empty arithmetic line.
4. **Changing the coffee terms breaks a committed artifact.** `lib/comparison.ts` builds `docs/accessible-commerce-companion/comparison.md` from the file's terms, and `tests/comparison.test.ts` fails if the document and the code disagree. Flipping the coffee exit to `unknown` changes what that document prints and requires regenerating it. The generated document is the product's own evidence that the seller's words and the screen's figures agree; it must not be left saying the opposite of the entry.

## Built — 2026-11-10

Built as decided, with one sentence added that the decision did not ask for. The entry is now a headline naming the job and the readers, then two columns: `What the seller wrote` (the shop's description, quoted, `app/page.tsx`), and the three figures, with the exit figure carrying the span the reading accepted. The primary action and the second-rank doors are unchanged.

What the build changed to satisfy the revision above:

- **The budget (revision §1) was added to the entry and the receipt**, both with `retries: 0`, because a page render is not the place to spend three attempts of 45 s.
- **The seller's copy now exists at PayPal (revision §2).** `ensurePlan` sends the product's `description` in the catalogue-product `POST` (`lib/paypal/subscriptions.ts`), so the PayPal path and the file path both have a sentence to quote. Where the description is still empty, the entry says so in words ("no words of the seller's to quote") rather than leaving a blank column.
- **The exit figure shows a quotation where the other two show arithmetic (revision §3)**, exactly as asked.
- **`comparison.md` was regenerated (revision §4)**; the coffee exit now reads "not stated" there, agreeing with the entry.

One sentence the decision did not ask for: **a line stating what actually happened**, `data-entry-relationship` = `stated` / `silent` / `unreadable`. Decision §4 asked for "the figures were worked out from the words shown, not entered by hand", and that sentence is false for two of the three figures — they are worked out from *terms*, only the third is read from the sentence. The line the build ships says which one was read and from where, and switches to an absence sentence when the reading found nothing. A screen may not claim a source it did not read.

The contrast line (§6) is a property of *this* seller now: "the cost to leave reads **Not stated** — never $0.00". That is the honest version of the same point, and it survives being read by someone who never sees a silent seller.

**Known limitation, stated rather than hidden.** The seller's sentence is read by a model, and the reading is warmed at server start. For the first minute or two after a cold start — and whenever a read fails — the entry says the words could not be read, because that is what happened. The reading lands in the cache and every later visit shows the sentence and the figure together. Naming the in-progress state ("the words are being read now") would be truer than "could not be read" during warm-up, and is deliberately not built here: it needs a fourth outcome in `ExitOutcome`, which belongs with the one-click samples in IPD 22.
