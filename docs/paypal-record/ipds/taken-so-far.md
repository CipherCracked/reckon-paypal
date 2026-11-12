# IPD 45 — Taken So Far Is a Line, Not a Fourth Figure

**Status:** Decided (2026-11-12)
**Date:** 2026-11-12
**Answers:** Problem tree Q1 and Q2 of `../intro.md` — *what can the record say PayPal has actually taken, and where does that fact sit on a receipt that already shows three figures?*
**Serves:** the owner's queue item R2; ITD 17, which made the record's figures PayPal's; IPD 23, which put the agreement's standing on a line rather than in the figures; IPD 26, which keeps *could not look* from becoming *you have none*.

---

## Problem to solve

The receipt shows what the agreement costs across its term, what it cost today, what leaving would cost, and when the next charge falls due. Every one of those is about the price or about the future. Nothing says how much of the agreement has already run, and the one figure a person actually wants — *how much has this cost me so far* — is absent.

PayPal can answer it. The agreement's own transactions endpoint returns the payments made for it, with their status and amount. What comes back is not a number but a small fact: **how many payments, how much, out of how many the plan states.** That shape has to be put somewhere the receipt can hold, and the receipt has three tiles and one standing line to put it in.

The temptation is to turn it into a fourth tile: `Taken so far · $24.99`, matching the three beside it. It fits the grid and it is one number. It is also the smaller half of the fact, and it says nothing at all in the states that matter most — an agreement with no completed payment, a plan that states no length, a record we could not read.

## Options

### Option 1 — **A standing line of its own, beside "Next charge", with a named state for each thing PayPal's record can be**

The line sits above "Next charge", under the cancelled notice if there is one, and reads as a sentence:

> **Taken so far** $24.99 — 1 of 6 payments.

The count and the money come from PayPal's transactions; the "of 6" comes from the plan's `total_cycles`. The line has a sentence for every state the two sources can produce — none taken yet, all taken, a plan that states no length, a payment whose amount PayPal did not return, a record that lists more taken than the plan says the agreement was for, and a record we could not read. Each names which of the two sources is speaking.

*How it feels:* a person opens the record and reads, in the plainest sentence on the page, that one of six payments has been taken and it cost $24.99 — under a notice saying PayPal reports the agreement cancelled, above a line saying there is no next charge. The three figures below say what the agreement was for and what it cost to enter. Nothing has to be subtracted in the head.

### Option 2 — A fourth figure in the grid

`Taken so far · $24.99`, with a note naming the count.

*How it feels:* four tiles where the page's argument is three — what it costs, what it cost today, what leaving costs. The tile holds an amount and cannot hold *of 6*, so the progress the feature exists for drops into a note under it. In a record where nothing was taken, a tile must show an amount and has none, so the screen needs the dash this product has spent its whole design refusing to blur.

### Option 3 — Restate "Across the term" as what is still to come

Replace the whole-term figure with `$124.95 remaining`, computed as the term total minus what was taken.

*How it feels:* one number changes meaning depending on how far the agreement has run, so the same screen says $149.94 before the first payment and $124.95 after it. The figure the shopper was shown when they agreed stops being the figure they can check. Worse, the subtraction needs both sources to agree; when they do not, the screen would print an invented remainder rather than the disagreement.

### Option 4 — A list of the payments

Every transaction with its date and amount, the way a bank statement reads.

*How it feels:* for one payment it is the line plus a table; for twelve it is a ledger on a page whose job is to state a commitment, not to itemise it. It also puts dates on screen that mean nothing without the plan's cadence beside them — rows of numbers, for the audience the product exists to spare rows of numbers.

### Option 5 — Derive "1 of 6" from the plan and today's date, and skip the transactions

The plan says monthly, six cycles; the start time says when it began; the calendar says how many payments should have happened.

*How it feels:* identical text, no extra PayPal read — and it is a lie of exactly the kind this product was built to prevent. It reports what should have happened as what did. It cannot see a failed payment, a suspension, a cancellation after the first charge, or a payment made late; and it calls our arithmetic PayPal's record in the one sentence that claims to be PayPal's record.

## Reasoning

The deciding factor is **what kind of fact this is**. The three figures answer *what does this agreement cost*; they are prices, drawn from the plan and the seller, and they belong on tiles because a price is one number. *Taken so far* answers *what has this agreement done*; it is a count and a sum from PayPal's own record, and the count is half the fact. The receipt already has one line for a fact of that kind — the next charge, which ITD 25 kept off the grid for the same reason. This is its mirror. A line can hold a sentence, and a sentence can say *none*, *all*, *six*, or *could not read*; a tile can hold an amount.

The second factor is **the states, and which option can state them**. The record can legitimately hold zero completed payments for an agreement that is running — a trial, or a payment that has not settled. It can hold a payment with no amount. It can hold more taken than the plan's total. It can hold nothing at all because we could not look. Option 2 collapses all of those into an amount or a dash, and Option 3 collapses the last two into a fabricated remainder. Option 1 gives each its own sentence, and the sentence says which source is speaking: the plan's total failing is not the record failing, and neither is the shopper's agreement being empty.

The third factor is **where the number comes from**. Option 5 is the only option that looks identical on screen and is still wrong, and it is the reason R2 exists: PayPal arithmetic is not PayPal's record. The line must be built from transactions that PayPal returned, and the *of 6* is the only part allowed to come from the plan — labelled as such by the wording, because the plan is what states the length.

The fourth is **the audience**. Three figures and a progress count is four things to hold at once. One sentence that names what was taken, and how much of the agreement that is, is one thing. That is also why the line is worded *Taken so far* rather than *Paid*: the subject is PayPal's record, and the product never says *you paid* — the shopper knows what their card did; the page knows what PayPal wrote down.

## Tradeoffs

- **On a fresh agreement the line repeats "Charged today".** Both read $24.99 for a record opened minutes after the first payment. They are different facts — the price of entering, and the history — and the line adds the *of 6* that the figure cannot. Still, the first screen after a purchase shows the same amount twice.
- **The line is only as fresh as the render.** PayPal's record lags settlement, so a payment made a moment ago may not appear. The wording says *PayPal's record*, not *you have paid*, and a missing payment arrives on the next visit.
- **"1 of 6" can read as five more to come.** On a cancelled agreement the notice above says otherwise and the next-charge line says *None*, so the order matters: the past is stated under the notice and before the future. A reader who skips both lines can misread the count as an expectation.
- **A cancelled agreement never reaches *all 6*.** It will say *1 of 6* forever, which is true of what was taken and not of what was agreed. The screen already holds the agreement's own end in the cancelled notice; the line does not repeat it.
- **Seven sentences to keep true.** Each state is copy that can drift from the API's behaviour; every one is pinned by a test, and the screen can only say what its state says.

## Notes

- The sentence is one sentence with a label, and the label is `Taken so far`. It sits immediately above `Next charge`: what PayPal has done, then what it will do.
- The read-aloud speaks the line, because it already speaks every other fact on the record (IPD 24). The printed page carries it because a record is printed whole.
- The line is shown only on a record that has a PayPal agreement behind it. A one-time order has no term to have run through, and *Charged today* is the whole of its history.
- The figure *Across the term* is left exactly as it was, including the hint under it for an agreement cancelled early — that hint and this line now say the same thing two ways, one at the whole and one at the part, which is the pair the screen needed.
