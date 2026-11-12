# PayPal's Record — Problem Decomposition

**Status:** Decomposed (2026-11-12) — two IPDs and one ITD to follow
**Date:** 2026-11-12
**Raised by:** the owner's queue item R2 — *Make PayPal the authority on what has actually happened*, and the Transaction Search check run for it on 2026-11-12.

---

## Problem Statement

The receipt states the future and the whole, and never the past. It says when the next charge falls due, what the agreement costs across its term, and what was charged today — and every one of those is either a promise PayPal made or our arithmetic over the plan's price and cycle count. Nothing on the screen says what PayPal's own record shows it has actually taken.

So a person holding a twelve-month agreement cannot tell from this page whether it is untouched, half-run or finished. The one number they came for — *how much has this cost me so far* — is the one number the record does not state. On a subscription that PayPal reports cancelled after a single payment, the screen shows the full term total, the payment just made, and nothing that connects them.

There is a second gap, and it is the one R2 exists for: the model has never met PayPal's facts anywhere in this product. It reads pasted documents and sellers' copy, and every screen checks what it read against the text. It has never been handed a figure that PayPal moved and asked to explain it. The hackathon asks for both APIs to be meaningful, and today they live on opposite sides of the app.

**The question between those two facts:** what may the record say about money PayPal has actually taken, and who is allowed to put it into words?

## Background and Context

**What the receipt holds now.** `app/receipt/[orderId]/page.tsx` reads the agreement from PayPal (ITD 17), translates the plan's terms into three figures — across the term, cost to leave, charged today — and states the standing: a line naming the next charge, or a notice that PayPal reports the agreement cancelled (IPD 23). Every figure on that screen is checked against a source; `computeCommitment` turns the plan's price and cycle count into a total, and the receipt refuses to render when PayPal's own amount disagrees with it.

**What "across the term" is, and is not.** It is our arithmetic: price × cycles plus any opening fee. It is honest arithmetic over a real plan, but it is a statement about the whole agreement, not about what has happened. A record that showed only it would be describing a commitment that may have ended nine months ago.

**Why the broad transaction API is not the answer.** Transaction Search is the endpoint this feature would have preferred: one call, every payment the merchant received. Measured against this app's sandbox credentials, it refuses. The per-agreement endpoint answers, and it answers with exactly the three things the line needs.

### Measured, 2026-11-12, sandbox credentials in `.env.local`

| Read | What came back |
|---|---|
| `GET /v1/reporting/transactions` (31 days, `fields=all`) | **403 NOT_AUTHORIZED**. This app may not use Transaction Search. |
| `GET /v1/billing/subscriptions?page_size=20&page=1` | 2 subscriptions, **both `CANCELLED`**; `billing_info.last_payment` empty on both |
| `GET /v1/billing/subscriptions/{id}` | `start_time` 2026-11-10T20:47:51Z on one, 20:55:34Z on the other; **no `status_change_time`** |
| `GET /v1/billing/subscriptions/{id}/transactions?start_time&end_time` | exactly **1 transaction each: `COMPLETED`, 24.99 USD, 2026-11-10**. Each body also carries `payer_name` and `payer_email`. |
| `GET /v1/billing/plans/{plan_id}` | one `REGULAR` cycle, monthly, **`total_cycles: 6`**, fixed price **$24.99**, `setup_fee` 0.00 |

So the demo's fact is real and needs no invented data: ***Taken so far $24.99 — 1 of 6 payments***, against the *Across the term $149.94* the screen already shows. Two cancelled agreements, one payment each, one plan of six — and none of it requires a payer's name, address or email.

**What the model costs.** Measured on this deployment's endpoint: 3.0–15.7 s cold, 3–6 s warm, with reasoning off (`AI_REASONING_EFFORT` unset). A receipt cannot wait six seconds for a sentence it did not need, so whatever the model writes has to be work the page can do without.

**Who this is for.** Adults with dyscalculia, ADHD and dyslexia. A table reading *1 of 6 · $24.99 · $149.94* is three numbers that have to be held in the head at once; the sentence *"PayPal has taken $24.99 so far, and $124.95 is still to come"* is the same fact with nothing to hold. That gap is what the model is for — and why it must not be allowed to invent a digit.

## Goals

1. The record states what PayPal's own record says it has taken, in PayPal's figures, on the receipt.
2. The statement is one of a small set of named states, and none of them is *nothing has been taken* when what happened is that we could not look.
3. The model's part is visible and bounded: it may write a sentence over facts the server holds, and every numeral it writes is checked before anything renders.
4. No payer name, email or account identifier from PayPal's transaction answer ever reaches a screen, a log or a cache key.
5. Nothing on the page waits for the model. The facts are on the page when it is served; the sentence arrives after, or not at all.

## Non-Goals

- **Not a transaction list.** No dates, no rows, no history screen. One line: how many payments, how much, out of how many.
- **Not a reconciliation.** Refunds, disputes and chargebacks are not read. A transaction whose status is not `COMPLETED` is not counted as taken, and nothing claims what happened to it.
- **Not a change to the three figures.** *Across the term*, *Cost to leave* and *Charged today* keep their sources and their arithmetic.
- **Not the account list.** The signed-in list of commitments gets no new line; each row would cost another PayPal read per subscription.
- **Not a new PayPal capability.** No Transaction Search, no webhooks, no stored records.
- **Not a mark on the figures.** The model writes one sentence about PayPal's numbers, not a figure, and the figures keep their own provenance rules (IPD 43).

## Constraints

- **The broad search is closed.** The feature must be built on the per-agreement endpoint, which takes a window and returns the payments for one agreement.
- **The window has to come from somewhere.** The endpoint requires `start_time` and `end_time`; the subscription states when it started.
- **The transaction body carries the payer.** `payer_email` and `payer_name` are in every record. They are dropped at the boundary, not filtered later.
- **Money is integer minor units.** Every total is added as integers (ITD 2); no figure on this screen may pass through floating point.
- **PayPal's absence is not a zero.** `unavailable` is a claim about our ability to look (IPD 26), and the line must say so.
- **The page does not wait.** A model read on the render path is capped at seconds (ITD 28); this one is not worth that wait, so it does not happen there.
- **One developer, and the deadline is today.** The feature must survive being cut to the line and the guard.

## Assumptions

- A transaction returned for an agreement is money taken for that agreement; the merchant is the collector, and the endpoint is the merchant's view.
- The sandbox's shape — a plan of six, one payment made, cancelled after the first — is representative of what a judge will see, and it is enough to demonstrate the line.
- A person reading a receipt wants the running total more than a list of payment dates.
- A sentence the model writes over four handed facts is still useful when the figures are already on screen: it is the reading that costs the audience effort, not the numbers' absence.

## Problem Tree

```text
├── Q1. What can the record say PayPal has actually taken, and how does it know?
│   ├── Which of PayPal's records answers it, when the broad one is closed?
│   ├── What counts as money taken — which statuses, over what window?
│   └── What is said when the record cannot be read, or lists nothing?
│
├── Q2. Where does that fact sit on a receipt that already shows three figures?
│   ├── A fourth tile, or a line beside "Next charge"?
│   ├── How is "1 of 6" stated when the count comes from the plan and the money from the record?
│   └── What is said when the plan states no length, or the record outruns it?
│
├── Q3. What may the model add?
│   ├── Does it write anything at all, when the line can be built from the facts?
│   ├── What may it say, and what is refused?
│   └── What does the screen show when it is refused or silent?
│
└── Q4. What must never appear, and what may be remembered?
    ├── Which fields of PayPal's answer are dropped at the boundary?
    ├── What does the read-aloud and the printed copy say?
    └── May a sentence be kept, and keyed by what?
```

## Decisions

| # | Question | Document |
|---|---|---|
| IPD 45 | Q1, Q2 — what the record states about money taken, the states it can be in, and why it is a standing line rather than a fourth figure | [`ipds/taken-so-far.md`](ipds/taken-so-far.md) |
| IPD 46 | Q3 — the exact line is the server's; the model writes one plain-language sentence beneath it, marked, and nothing when its numerals are not PayPal's | [`ipds/plain-words-from-paypals-numbers.md`](ipds/plain-words-from-paypals-numbers.md) |
| ITD 38 | Q1, Q4 — the agreement's own transactions within a budget, summed in minor units, payer fields dropped, and a numeral allow-list gate on the model's sentence | [`itds/the-agreements-own-transactions.md`](itds/the-agreements-own-transactions.md) |

Q4's product side is answered inside ITD 38 and IPD 46: the read-aloud speaks the line because it already speaks every other fact on the record, and the printed page carries it because it is part of the record.

## Open Questions

- **What happens to a refunded payment?** A transaction that is not `COMPLETED` is not counted, so returned money is invisible to this line. The sandbox holds none; whether the record should show one is not decided here.
- **Why is `status_change_time` missing?** Both cancelled subscriptions answer without it, so the receipt's existing cancelled notice has no date to show. It is a gap in the fixture, not in R2, and it is recorded here because it was found while measuring.
- **Should the account list carry the same line?** Deferred. It would cost one transaction read per subscription per visit, and the list is already a scan bounded by the merchant's history.
- **Does the sentence belong in the read-aloud?** Decided no: the read-aloud speaks what is on the page, and the model's sentence is decoration when it appears. A reader who hears the line has the fact.
