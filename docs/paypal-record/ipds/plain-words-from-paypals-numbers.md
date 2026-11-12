# IPD 46 — Plain Words From PayPal's Numbers

**Status:** Decided (2026-11-12)
**Date:** 2026-11-12
**Answers:** Problem tree Q3 of `../intro.md` — *what may the model add, what may it say, and what does the screen show when it is refused or silent?*
**Serves:** the owner's queue item R2; IPD 45, which builds the exact line from PayPal's record; IPD 43, which put a mark on anything the model produced; IPD 31 and IPD 44, which made a refusal something the product can say out loud.

---

## Problem to solve

IPD 45 puts one exact sentence on the receipt: *Taken so far $24.99 — 1 of 6 payments.* It is checked against two sources and it is the whole factual content of the feature.

But the audience for this product is people who find numbers hard. *$24.99 · 1 · 6* is a sum and a fraction to hold at once; *"PayPal has taken $24.99 so far, and $124.95 is still to come"* is the same fact as one clause. Turning figures into a sentence is the one thing a model is genuinely better at than the server, and it is the one place in this product where a model would be handed figures rather than asked to find them.

That is also the danger. Every other model call in this product extracts spans and the server finds them in the text; here the model would *write* a figure. A single invented digit on the screen a shopper keeps would be the exact failure the product exists to prevent — and the record is the one screen that is printed and kept.

## Options

### Option 1 — **The server's exact line always; the model writes one plain sentence beneath it, after the page, marked, and only if every numeral in it was PayPal's**

The line from IPD 45 renders with the page. A small client component asks the server for a sentence; the server re-reads the facts from PayPal, hands the model the four approved numbers, and refuses the answer if it contains any numeral that is not one of them. A sentence that passes appears beneath the line, with the mark *Written by the model, checked against PayPal's figures.* A sentence that fails, or never arrives, leaves the line alone.

*How it feels:* the page is complete the moment it loads — one sentence about one of six payments. A moment later, if the model answered, a second sentence in plainer words appears under it and says who wrote it. If the model is down, refused, or slow, the page is exactly what it was, and nothing suggests something is missing.

### Option 2 — The model's sentence replaces the line when it passes

One sentence on screen, always the model's when available, the server's when not.

*How it feels:* two different wordings of the same fact on the same screen, depending on the run. A person who reloads sees slightly different figures in words, and there is no way to tell which sentence is the stable one. When the model fails the page quietly changes voice, and the mark disappears with no explanation of what was different.

### Option 3 — No model sentence; the exact line is the whole feature

*How it feels:* correct, cheap, and ordinary. The person has the fact in the plainest form the server can write. Nothing is refused, nothing is marked, and the one screen where PayPal's figures could be explained to the audience the product is for explains them as a table.

### Option 4 — The model writes the whole statement, figures included, and the guard checks it

The model produces *"PayPal has taken $24.99 of the $149.94"* as the line itself, with the server's numbers supplied as facts.

*How it feels:* the same as Option 2, with one more failure mode — a sentence that passes a numeral check but reads the numbers wrongly (*"$24.99 of 6 payments"*) is harder to spot than a number that is absent, because every digit in it is one PayPal supplied. And the record's one stable sentence becomes dependent on an endpoint being up.

### Option 5 — The model chooses which state's sentence to show from the facts

The server sends the facts; the model picks among the seven states and writes the sentence.

*How it feels:* the choice between *no payment yet*, *one of six* and *all six* is logic the server already performs exactly; handing it to a model makes the screen's state depend on a guess. It also means a model failure has no line to fall back to — the fallback would have to re-implement the logic, which is the server's job done twice.

## Reasoning

The deciding factor is **which sentence a person can check**. The line from IPD 45 is built from two PayPal answers and can be verified against them; the model's sentence cannot be verified beyond its numerals. So the checkable sentence must be the one that is always there, and the uncheckable one must sit beside it, marked, rather than in its place. On a screen a shopper prints and keeps, a number that appears only when a third party answers is a worse number than one that never disappears.

The second factor is **what the guard can actually check**. A numeral allow-list catches digits and spelled-out numbers; it cannot catch *most of it*, *nearly finished*, or *only*. Those are claims about the numbers, and the guard is blind to them. The prompt forbids comparison, advice and prediction, and the exact line sits directly above the sentence so a reader has the figures one line away. Option 1 makes the model's unsupported part an addition to the truth rather than a substitute for it; Options 2 and 4 make it the truth.

The third factor is **what a refusal should look like here**. On `/read`, a refused span is shown inside a panel, because the document is the reader's own and the refusal is evidence about their text (IPD 44). Here the facts are ours and already on screen; a refused sentence is a decoration that did not come. Showing *"the model wrote a sentence we would not show you"* would introduce doubt about the line above — which did not come from the model and is not in question.

The fourth is **why the model is here at all**. It is not here to calculate, choose a state, or decide what happened. It is here to turn *Taken so far $24.99 — 1 of 6 payments* into a sentence a person with dyscalculia does not have to parse. That is the labour the audience pays for, and it is the only labour the model is given.

Option 3 is rejected because it leaves that labour undone on the screen where the facts are hardest; Option 5 because it gives away logic that is exact for no gain.

## Tradeoffs

- **Two voices on one record.** The exact line and a plain restatement say overlapping things. For most readers the second is redundant; for the audience it is the point.
- **The sentence is not deterministic.** Wording differs between runs, which can look like the record changed. It is cached against the facts, so a given state of the agreement tends to keep one sentence, but a cache miss may reword it.
- **The guard is a numeral check, not a meaning check.** *"Nearly all of it"* with no numeral in it would pass; only the prompt and review stand against it, and a test pins the wording rule where it can.
- **A refused sentence is invisible.** The product cannot show the near-miss without making the line above look doubtful, so a failure costs the reader the explanation and gives no account of itself.
- **One more model call per receipt view.** Cached by the facts, so a repeated view is free, but the first view of a new agreement pays for it — after the page, so no one waits.

## Notes

- The sentence never speaks for a state the line does not already state: if there is no completed payment, no term, or no answer, the component does not ask the model at all. There is nothing plain to say about a fact that is not there.
- The mark is a constant beside `READ_BY_MODEL` (`lib/commitment/provenance.ts`), with its own comment: *written*, not *read*, because the model produced the words from figures the server handed it rather than finding a sentence in a source.
- The read-aloud speaks the line and not the model's sentence (IPD 45): the line is the fact, and the sentence is a second telling of it.
