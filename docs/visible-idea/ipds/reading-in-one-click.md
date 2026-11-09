# IPD 22 — A Reading Anyone Can Start

**Status:** Adopted (2026-11-10) — **built (2026-11-10)**
**Date:** 2026-11-10
**Answers:** Problem tree Q3 of `../intro.md` — *what must the AI demonstrate, in one click, for a viewer to believe it does work a script could not*.
**Amends:** nothing. The document reader itself (IPD 19, ITD 18) is unchanged; this decides what a first-time visitor meets when they arrive at it.
**Supersedes:** nothing.

---

## Problem to solve

The document reader is the only place in the product where the AI does something a script could not, and it is the hardest thing to reach.

To see it, a visitor must already know the product exists, find the third of four door labels on the entry, arrive at an empty textarea, invent a document, paste it, submit it, and wait. On the current endpoint a reading takes roughly **47 seconds** measured, and the route allows 45 seconds of retries on top. A judge who is giving the product three minutes will never start; a judge who starts will spend most of their time watching a button say "Reading…".

What the visitor then receives is the strongest screen in the product: three figures, the sentences they came from, the number of quotations accepted, and the number rejected. None of that is visible until the visitor has already paid the cost of entry.

The blind readings named the same problem in two registers:

> A judge must invent a document, paste it, and then wait. There is no sample, no prefill, no "try one of these".
> — the product reading

> The AI showcase is load-bearing and genuinely defensible, and it is a text link at the bottom of the homepage.
> — the judge reading

## Options

### Option 1 — Leave it: the reader is for people with a real document

An empty box is honest; a visitor with a bill pastes it. *How it feels:* the product withholds its best evidence from everyone who did not arrive already convinced — which, at judging time, is everyone.

### Option 2 — **Named example documents, one click, read ahead of time**

Above the box, three labelled examples — *a phone contract*, *a gym membership*, *a payment plan* — each of which fills the box and starts the reading on click. The readings for those texts are computed at server start and cached, so the click lands on figures in about a second. One further example is written to be ambiguous, and its result is the refusal: the screen shows what was offered and why it was not used. The page says plainly that the examples are examples.

*How it feels:* the visitor watches the product do its job before deciding whether to trust it with their own document.

### Option 3 — Pre-fill the box with one sample on arrival

The largest sample text is already in the textarea; the visitor only presses the button. *How it feels:* one fewer decision, and a page that looks like a form already filled in by someone else — the visitor must first work out what is theirs and what is not.

### Option 4 — Show a recorded result instead of a live reading

A static screenshot of a reading, captioned as an example, with the live box below. *How it feels:* a marketing page bolted onto a tool; nothing on it can be verified by the visitor.

## Reasoning

The reader's defensibility is not that it reads documents — many entrants will claim that. It is that **the model is not allowed to produce a number, and the server throws away anything it cannot find word for word.** That claim can only be believed by watching it happen, including watching it fail.

A named example removes the two costs that stop a stranger: inventing a document, and waiting for a model. The second is the one that matters. A first-time visitor will not spend 47 seconds to find out whether the product is worth 47 seconds; a warmed example makes the first reading nearly free and lets the visitor decide afterwards.

The ambiguous example is not a fourth sample — it is the demonstration of the guarantee. Every other entrant's demo shows the model succeeding. Showing the model offered something and the server refused it is the only way a viewer can see the difference between this reader and a wrapper around an API. The work is not only presentation: the route currently returns a **count** of rejected spans (`lib/document/verify.ts:12-30`, `app/api/read/route.ts:93`) and discards the spans themselves, and the refusal path returns candidates without the count at all.

Pre-filling one sample (option 3) hides the same cost but answers a question the visitor did not ask, and leaves the textarea's ownership ambiguous — for a person with a cognitive disability, a box that already contains text is a box they must audit before using it. Named buttons keep the box theirs and empty.

## Decision

**Option 2.**

1. **Three named examples** above the textarea, each a button that fills the box and starts the reading: a phone contract with an early-termination fee; a gym membership with a joining fee and a stated term; a payment plan with a stated total.
2. **One document that cannot be read**, labelled as such, whose result is the refusal rather than the figures — and the screen says what stopped it. It does not depend on the model misbehaving: a document that states amounts but no commitment takes the deterministic candidate path (`app/api/read/route.ts:23-29`), which is the same outcome every time.
3. **Readings for the examples are warmed at server start** and served from cache on click (ITD 20). The page says the examples are examples, once, where they appear.
4. **The result leads with what was verified**: sentences quoted, spans rejected, and each figure's source sentence — before the arithmetic.
5. **The empty box remains** for a visitor's own document, and remains the primary way in for someone who came with one.

## Tradeoffs

- **Warm-up costs a model call per example at start**, and a cold deploy with no cache falls back to the slow path. The examples must therefore degrade honestly: a click that has to wait says so.
- **Four more documents in the catalogue** are content to write and to keep honest — each must state only what the reading can support.
- **An ambiguous example is a risk**: if the model happens to be right about it, the demonstration of failure disappears. The sample has to be constructed so that any offered span is unverifiable, not merely likely to be.
- **Leading with verification rather than the three figures** makes the page more technical for a person who came with their own bill; the figures must remain the largest thing on the screen.

## Notes

- The sample texts live in `lib/catalog/` beside the products and bills, for the same reason: they are content, not fixtures. They must be short enough to read and long enough to read (the route's minimum is 40 characters).
- The warm-up must not run when no model is configured. On such a deployment every sample reads "could not be interpreted", and remembering that would turn the demonstration into its opposite (the same failure mode `warmPublishedExits` already guards against).
- Whether a warmed reading may be shown as "live" is answered by saying what it is: a reading of that exact text, computed once. Nothing on the screen should imply the model ran in the last second.

## Revision — 2026-11-10 (adversarial review, before any build)

The decision stands; the demonstration it describes cannot be built as first written, and is corrected here.

1. **Showing a rejected span means printing a number the model invented.** The guard exists precisely to keep such figures off the screen (`lib/ai/read-document.ts:132`), and an existing test asserts the API never returns the invented total (`tests/api-read.test.ts:87`). So the rejection is demonstrated by **the count and the reason**, not by quoting the span: "the model offered 2 sentences; 2 were not found in your document, so none became a figure." The span may be named only after it has been shown to contain no money-like pattern — otherwise the demonstration reintroduces the thing it is demonstrating against.
2. **A model rejection cannot be guaranteed by construction.** Verification is a literal substring test (`lib/document/verify.ts:22`); a model that copies faithfully always passes, and a model that paraphrases is the only source of a rejection. A document cannot force either. The failure demonstration therefore uses the deterministic path — the document is readable, states amounts, and states no commitment — which yields the same result every time.
3. **The refusal example must be warmable too**, or the one button that shows the guarantee costs the visitor the full model wait. ITD 20 caches complete responses, including the candidate-mode answer, for exactly this reason.

---

## Built — 2026-11-10

Built as decided, with the review's three corrections.

**What is on the screen.** `/read` opens with a heading, then a block of four named examples above the textarea: *Read a phone contract*, *Read a gym membership*, *Read a payment plan*, and *Try a page of fees*. Each button carries one line saying what the document is, so the click is not a gamble. One sentence above them says the examples are written for this page, that none is a real seller, and that their readings were made when the server started — so nothing implies the model ran in the last second. The textarea below stays empty and stays the visitor's own way in.

**The four documents** live in `lib/catalog/examples.ts` beside the products and the bills, as content:

| Example | What it is written to show |
|---|---|
| `phone-contract` | All three figures present, including a $180.00 exit read out of "an early termination fee of $180.00 is charged" |
| `gym-membership` | A $0.00 exit that is *stated* — "there is no cancellation fee" — rather than typed in by hand, which is the mistake IPD 21 corrected |
| `payment-plan` | One total, one date, one cancellation fee: the simplest shape a reading can take |
| `fee-schedule` | **The refusal.** It states three amounts and no commitment, so the reader takes the deterministic candidate path and shows the amounts it found |

**How the refusal is demonstrated.** By count and reason, never by quoting the span. The `fee-schedule` document's only monetary sentences are a one-off charge and two cancellation fees, which `readQuotations` refuses to turn into a charge (`lib/document/read.ts` — "amounts that are only ever add-ons or an exit fee do not describe a charge"). The route's own notice then says the document does not state enough to work out a commitment, and the page prints the amounts it found with the line that none of them is a total. No invented figure ever reaches the screen, and the existing test that the API must not return one still passes.

**What changed in the route.** `POST /api/read` no longer reads the document itself: `lib/document/answer.ts` builds the answer, `lib/document/reading-cache.ts` decides whether that text has been read already, and the route validates, asks the cache, and sends the JSON (ITD 20). A refused document — too short, too long — is still refused before the cache is consulted, because a rule that refuses the same text is not an answer worth keeping.

**Warming.** `instrumentation.ts` now starts two warm-ups, both unawaited and both guarded by `isModelConfigured()`: the exit readings that already existed, and the four example documents (`lib/document/warm.ts`). They run as two sequential streams rather than one burst of seven.

**The result still leads with what was verified.** The reading's first line reports how many sentences were read out of the document, that the figures were worked out here rather than by the model, and how many offered spans were discarded. The figures keep their sentences (ITD 19), and the arithmetic sits under them.

**Known limitation, stated rather than hidden.** The refusal example's determinism rests on the model choosing the fields the sentences actually are — a one-off charge and cancellation fees. A model that instead offered "Replacement key card: $15.00, charged once" as the document's total would produce figures, and the demonstration would show a reading instead of a refusal. The construction makes that unlikely rather than impossible, and the same is true of the reverse: no document can force a model to paraphrase. The warm-up means whatever the server read once is what every visitor then sees, so the demonstration is stable even where it is not guaranteed.
