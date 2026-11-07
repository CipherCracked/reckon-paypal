# ITD 12 — When the Reader Cannot Read

**Status:** Adopted (2026-11-07) — implemented as candidate mode
**Date:** 2026-11-07
**Answers:** Problem tree Q4 of `../intro.md` — *what does it do when a source is silent, contradictory or unreadable?*
**Serves:** IPD 11 revision, Stage 2. Extends the degradation rule the consent screen already follows.

---

## The problem

The reading path has four ways to fail that the payment path does not: no API key configured, the
model unavailable or rate-limited, a document the model returns no usable quotations for, and a
document whose quotations pass verification but yield fewer terms than the figures need.

The product has already decided what degradation means once: when the summary call fails, the screen
keeps every locally computed figure and flags only the missing wording. It never replaces a computed
total with a single amount. The reading path needs the same rule stated for a source that is, by
definition, unreliable.

## Options considered

### Option 1 — **Show what pattern-matching found, and say plainly that nothing was interpreted**

Amounts, dates and cadence words can be found without a model. Present them as *found in the text*,
not as *what this costs*, and state that the figures the product would normally compute could not be
produced.

### Option 2 — Hide the reading path when the model is unavailable

The feature exists only when the key does. Nothing can mislead because nothing is shown.

### Option 3 — Show an error

"The document could not be read. Try again later."

### Option 4 — Ask the model for a plain summary as a fallback

If extraction fails, summarise the document in words.

---

## Reasoning

**Option 3 is the wrong shape of honesty.** It tells the shopper nothing they can act on, at the exact
moment they came for help, and it makes the product's usefulness depend on a third party's uptime
without saying so.

**Option 2 is defensible and unnecessary.** The candidate finder is the same code that parses accepted
quotations; it costs nothing extra to run over the text directly. Hiding it loses the one thing that
still helps — the shopper sees the amounts that are in the document, which is more than the document
gave them.

**Option 4 is the option that must not be taken.** A plausible prose summary of a document nobody
could read is precisely the failure the whole design refuses: words that sound like understanding,
with no figure and no provenance to check them against.

**Option 1 keeps the invariant while giving something true.** A pattern-found amount is *not* a
computed figure — it is a quotation by another route — and it can be labelled as such: "found in the
text". What must never appear is a number labelled *Across the term* that was not computed. The rule
is unchanged; only the vocabulary of the degraded state is new.

**One thing must be decided before the first paint**: whether the shopper's own text is echoed back.
Echoing the whole document back as page content is useful (they can point at what we missed) and
dangerous (it looks like we have analysed it). The answer is to echo nothing by default and show only
the spans that were used — which is also what the verified path shows, so the degraded state and the
working state share a shape.

## Decision

**Option 1.**

1. **No key, no model, or no accepted quotations** → the reading path runs in candidate mode.
2. **Candidate mode states its limit in its own words**: these amounts appear in the document; the
   product did not interpret them.
3. **No computed figure is ever derived from an unverified quote** — not one, not labelled
   approximately, not in a tooltip.
4. **The degraded state shares the verified state's shape**: the spans that were used, each beside
   what it was used for, with the totals marked absent rather than estimated.
5. **Silence is attributed**: "the document does not state this" and "we could not read this" are
   different sentences and must not be combined into one.

## Tradeoffs

- **Candidate mode can look like a product that did not work.** That is the accurate impression when
  the model is unreachable, and the copy must not overstate what pattern-matching achieved.
- **A candidate list invites the shopper to do the arithmetic themselves**, which is the exact task
  the product exists to remove. It is still better than a wrong total, but it is not help.
- **Two visual states to keep accessible**, translate and compare — the comparison document (IPD 9)
  must describe the degraded rendering too, or the evidence covers only the happy path.
- **Silent-then-audible**: a shopper may not notice they are in candidate mode. The statement has to
  be in the reading order before the amounts, not after them.

## Notes

- The payment surfaces get the same treatment through `presentFigures` being computed locally: an
  unreachable model costs wording, never a figure.
- This ITD is the answer to "what if the AI is the part that breaks" that the submission copy and the
  video should both show — a product that degrades truthfully is a stronger claim than one that never
  mentions it.
