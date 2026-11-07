# ITD 10 — Quote-Grounded Reading

**Status:** Adopted (2026-11-07) — implemented, and verified end to end against a live model
**Date:** 2026-11-07
**Answers:** Problem tree Q4 of `../intro.md` — *what must it know, and who supplies it when there is no seller to ask?*
**Serves:** IPD 11 revision (the hybrid) — read a document, pay a commitment, one screen.
**Amends:** ITD 2 (`../../accessible-commerce-companion/itds/ai-approach.md`), whose interface was built for merchant copy the system already holds.

---

## The problem

The product's first rule is that a model never produces a figure. Its schema has no monetary field,
and `lib/ai/guard.ts` refuses any returned string containing one. That works while the only source of
amounts is PayPal.

A document the shopper brings breaks the assumption: its amounts are *in the text*. Refusing to read
them means the reading path can never state a total. Trusting the model to read them means a misread
`$105.00` becomes a confident `$150.00`, and the entire claim of the product — that every figure can
be traced — dies quietly.

## Options considered

### Option 1 — Model extracts amounts and terms

Send the document, get back `{ today: 105.00, acrossTerm: 1260.00, exit: null }`. One call, complete
answers, and no way to tell a misreading from a reading.

### Option 2 — **Model returns quotations only; code parses and computes**

The response schema has no numeric field at all: it returns a list of `{ field, quote }`, where each
quote is asserted to be copied from the document. The server then:

1. checks every quote occurs verbatim in the text the shopper supplied;
2. parses amounts out of the accepted quotes with the same money utilities the rest of the app uses;
3. builds `CommitmentTerms`, and from there `computeCommitment` and `presentFigures` — unchanged;
4. renders each figure beside the sentence it came from.

A quote that is not found is discarded, so the field it was meant to fill becomes "Not stated".

### Option 3 — No model: regular expressions over the text

Find money-shaped strings, dates and words like "per month". No key, no network, no fabrication —
and no ability to tell a total from a discount, a shipping charge from a fee, or a due date from a
transaction date.

### Option 4 — Model reads a rendered page image

Requires vision on a screenshot or PDF page, which inherits the PDF parsing problem the scope
revision deliberately excluded.

---

## Reasoning

**Option 1 is the version of this product that should not exist.** Its failure is silent and it lands
on exactly the reader least able to catch it. There is no test that can distinguish a correct
extraction from a plausible one, because plausibility is what the model is optimised for.

**Option 3 is honest and nearly useless alone.** Money-shaped strings are everywhere in a bill — the
subtotal, the tax, the previous balance, the amount paid, the discount, the late-fee schedule — and
picking the one that answers "what will this cost me" is the part that requires reading. Regexes find
candidates; they cannot choose.

**Option 2 keeps the invariant by changing what the model is asked to do.** Reproducing a span is
verifiable in a way that producing a number is not: `document.includes(quote)` is a substring check,
free to run, impossible to fake past. The model becomes a locator, not an authority. The arithmetic
stays where it has always been — in `lib/money.ts` and `lib/commitment/compute.ts`, integer minor
units, no floats.

It also produces something the other options cannot: **provenance**. Every figure can say *"from:
'Total due: $1,260.00'"*, which is what IPD 9 promised a stranger would be able to check.

**The cost is coverage, and it should be named.** A document that states only a subtotal and expects
the reader to add tax will show a figure our code computed and a note about what it did not. A
document in another currency, or one whose numbers appear only in a table the pasted text mangles,
will show "Not stated" more often than a careless model would. That is the right failure: the product
says less rather than saying something wrong.

## Decision

**Option 2.**

1. **Schema: quotations, no numerics.** `{ field: FieldName, quote: string }[]`, plus the model's
   plain-language summary — which passes the existing guard unchanged.
2. **Verification is server-side and unconditional.** Each quote is tested as a substring of the
   submitted text (whitespace-normalised). Rejections are silent to the model, visible to the code.
3. **Parsing is ours.** `parseAmounts` and the cadence/term readers live in `lib/document/`, tested
   against text, not against the model.
4. **Every figure carries its source.** The rendering shows the quote beside the figure; a figure
   without an accepted quote is "Not stated", never a guess.
5. **The pasted text is processed and discarded.** No storage, no logging of its contents, no cache.

## Tradeoffs

- **More model calls' worth of failure surface**: a valid document can yield few accepted quotes if
  the model paraphrases instead of copying. The prompt must demand verbatim spans, and the UI must
  make "we could not find this" a normal state rather than an error.
- **Whitespace and formatting drift** — line breaks, ligatures, non-breaking spaces — will reject
  quotes that look identical to a human. Normalisation has to be defined once, in one function, and
  tested, or the reading path will feel broken for reasons no one can see.
- **It is slower to build than Option 1** by roughly the cost of the verification layer and its tests,
  which is the part that makes the product defensible.
- **The model still decides what to quote**, so a document it reads badly produces thin figures. The
  product degrades to "we could not read this" rather than to a wrong number, which is the intended
  failure but is still a failure.

## Notes

- ITD 2's guard stays exactly as it is. This is not a relaxation; it is a second, stricter rule beside
  it — and a test proves a fabricated quote never reaches a figure.
- The reading path does not create a PayPal order for a third party's bill. A bill we can pay is an
  invoice we issued; anything else is read-only, and the screen says so.
- If the model is unavailable, the reading path returns the candidates Option 3 can find and states
  plainly that nothing was interpreted — the same degradation the consent screen already has.

---

## Build notes — 2026-11-07

- **`BillingPeriod` was widened to `"month" | "year"`.** A document saying "$20.00 per year for 2
  years" is $40.00. Converting the count to twelve monthly payments gives $480.00 — a tenfold error
  produced by a "helpful" conversion. `computeCommitment` multiplies the amount by the count and never
  reads the period, so keeping the cadence as written costs nothing and the schedule sentence now
  says "one a year" when the document said so.
- **A stated total is the whole charge.** When a document states both a total and its parts, the
  parts are not added to the total; they are already inside it. Only when no total is stated are the
  parts summed, which is the one case where our arithmetic is doing real work.
- **A repeating charge with no stated count zeroes the total across the term explicitly** — the
  figure is replaced with an absence and its own sentence, rather than being computed from a count of
  one. `CommitmentView` gained `figureNotes` for that: an absence now says *why* it is absent.
- **Implementing it changed one shape**: `presentReading` returns the breakdown too, because a screen
  that says "these are the document's own amounts" cannot invent a breakdown from the figure it just
  computed.
