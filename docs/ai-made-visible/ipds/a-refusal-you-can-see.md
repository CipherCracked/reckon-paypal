# IPD 44 — A Refusal You Can See

**Status:** Built (2026-11-12), refusal observed live in 4 of the 4 most recent reads
**Date:** 2026-11-12
**Answers:** Problem tree Q4 of `../intro.md` — *what must a trap document prove, and is a document we wrote an honest demonstration?* (re-opened 2026-11-12; it had been closed as out of scope)
**Serves:** IPD 32 (the checking is shown), ITD 29 (a refused span is still the model's).

---

## Problem to solve

IPD 32 built a panel that shows the sentence a model offered and the server refused, and recorded in its own build notes that **the panel's most convincing state could not be reached**. Six documents were posted to `/api/read` — including deliberately misspelled ones and ones with typographic apostrophes — and the model copied every span verbatim. `rejected: 0` every time. The panel therefore existed, was tested, and could not be demonstrated by any document the product offered.

Two things follow. The video can only show the empty case, which is the case that proves nothing: a check that never fires is indistinguishable from no check. And a judge who asks *does it ever catch anything?* has to take the answer on trust, which is precisely the failure mode this whole problem folder exists to fix.

Reading the code turned up a second, worse defect behind the first. When a model's answer about leaving was refused, `presentReading` still rendered the sentence it renders when the seller said nothing: *"The document does not say what it costs to cancel or leave early."* — while the disclosure directly below quoted the refused sentence about exactly that. Two statements on one screen, one of them false, in a product whose promise is that it does not claim more than the text supports.

So the question is what a demonstration of the refusal has to be, and whether the document that produces it can be one we wrote.

## Options

### Option 1 — **Offer a fifth example that is a real paste artefact, and make the note tell the truth about a refused answer**

A membership agreement, written the way a document looks after it has been through a PDF and a copy-paste: three words broken across line breaks.

```
Your member-
ship runs for 12 months. The monthly fee is $39.00, billed on the 1st. A join-
ing fee of $25.00 is charged once. Cancelling before the end of the subscrip-
tion costs $95.00.
```

The note on the button says what the document is and nothing about the outcome: *"Copied out of a PDF, where words break across the lines."* Its `label` is *"Read a membership sent as a PDF"*. Alongside it, when a refused span was the model's answer to a question, the figure's note stops claiming the document is silent and says instead: *"The sentence about leaving was not in your text, so no figure is shown."*

*How it feels:* a visitor clicks the fifth button, the reader works, three figures appear, and under them the panel opens on a sentence the model produced and the document does not contain. Nothing is switched on to make it happen; the document is the input, the check is the check.

### Option 2 — Leave it unreachable and narrate the panel

Keep the four examples, and let the video describe what the panel would say if a sentence were ever refused.

*How it feels:* a claim again, and a bigger one than before, because it now describes a case the recording has never seen. IPD 32's own tradeoffs name this as the risk; leaving it is choosing the risk.

### Option 3 — A switch that injects a refusal

A query parameter or a development flag that plants a refused span so the panel can be shown on demand.

*How it feels:* a prop. A fault injected by a switch demonstrates the switch. It also puts a code path in the product that no user's document can reach, on the screen whose entire value is that everything shown came from the text.

### Option 4 — Make the check tolerate the artefact

Normalise the text so that a hyphen followed by a line break is dropped before comparison, which would let the model's joined *subscription* verify against the document's broken one.

*How it feels:* the panel goes quiet, and so does the product's best claim. Verification is a literal substring check; widening it to admit re-segmented words means accepting a sentence that is not in the document, which is the one thing the check exists to prevent. The artefact is also the ordinary case — pasted PDFs break words — so this is not an edge case being tolerated, it is the boundary being moved.

## Reasoning

The deciding factor is **whether the demonstration is produced by the product or by the demonstration**. Option 3 can show the panel and proves nothing, because the interesting claim is not that the panel renders but that the server refuses something a real model really offered. Option 4 makes the same point from the other side: it removes the only artefact measured to defeat the check, and the check then never fires on anything. Option 1 is the only one where the input is an ordinary document, the model is the configured model, and the refusal is the server doing its job.

The second factor is **whether a document we wrote is an honest demonstration**. IPD 32's six-document measurement answers that in the useful direction: the model copies verbatim, which is why the earlier examples never refused. A word broken across a line is not a trap we designed to fool it — it is what a PDF does to text, and a person pasting one gets it for free. The example is therefore authored in the same sense as the other four, and the note is written so that it stays true either way: it describes the document, not the result. If a future model joins the halves correctly, the page is still telling the truth; it simply has nothing to refuse.

The third factor is the **honesty of the absence**. A refused answer is not the seller being silent, and rendering it as silence is the product asserting something about the document that the product itself has just contradicted. The three absences (IPD 31) are a discipline; a fourth state — *we asked, the model answered, the sentence was not in your text* — needed its own sentence rather than being folded into one of the three. That is the `unmatched.ts` half of the build.

## Tradeoffs

- **A fifth button on the reader page.** Four examples was already a list; five is longer. The alternative is that the product's best moment is unreachable, which is worse than one more line of buttons.
- **The refusal depends on the model.** Three broken words refused in every measured run, and earlier single-break variants refused in five of seven — but a different configuration, temperature or model could copy the text correctly and the panel would stay quiet. Nothing in the product promises otherwise, and the note promises nothing, so the example degrades to an ordinary read rather than to a lie.
- **The example is authored, and the page does not say so on the button.** The reader page states that the examples are not real sellers where they appear; the note here says where the text came from, not that we wrote it. The narration has to carry that, as `../intro.md`'s open questions already require for the refused example.
- **Two new sentences for a state only one screen can reach.** `UNMATCHED_LEAVING` and `UNMATCHED_TERM` exist only for the pasted-document path; the commitment screens cannot produce a refused answer. They are small and tested, but they are product copy written for a case the front door never shows.
- **It does not make the refusal common.** The panel still fires rarely, and that is correct — a check that fired often would mean a model that could not be trusted with ordinary text. The example exists so the rare case has one door a visitor can open.

## Built (2026-11-12)

- `lib/catalog/examples.ts` — the fifth example, `pdf-membership`, with the note that describes the document and promises nothing about the reading.
- `lib/document/unmatched.ts` — `UNMATCHED_LEAVING`, `UNMATCHED_TERM`, and the two field sets that decide which question a refused span was answering.
- `lib/document/read.ts` — `presentReading` takes `{ refused }` and picks the note per question: a refused answer produces the unmatched sentence, silence produces the absence sentence.
- `lib/document/answer.ts` — `refused` is computed once and passed both to the reading and to the view, so the note and the panel can never disagree about what was refused.
- `tests/document-read.test.ts` (4), `tests/api-read.test.ts` (1), two in `tests/read-page.test.tsx`.

Two measurements from the build. **Three broken words, not one.** A single broken word refused in five of seven runs and sometimes cost the payment count; three refused in every recent run — the first live read of the finished example returned `quoted 5, rejected 1`, refusing *"Your membership runs for 12 months."* **The refusal lands on a different question than expected each time**, which is why the note override keys on the fields the model answered, not on which figure came out empty.

**In the four screen checks run at the end of the pass** (1440 and 390, both themes) the refusal landed on the term sentence every time, so what a visitor sees is the panel — the fourth absence is what happens when the refused span is the answer to a question the reading could not otherwise fill, and it is pinned by `tests/document-read.test.ts` rather than demonstrated by the fifth example today.
