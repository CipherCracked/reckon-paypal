# IPD 38 — Which Stated Terms Become a Schedule

**Status:** Decided (2026-11-12)
**Date:** 2026-11-12
**Answers:** Problem tree Q2 of `../intro.md` — *what shapes can a stated term take, and which can this product honestly schedule?*
**Serves:** R1 in `todo.md` §19; IPD 37 (a stated term is what makes a listing a commitment); IPD 19's three figures.

---

## Problem to solve

A term read out of a listing is a length — *six months*, *twelve months*, *"billed quarterly"*, *"every 90 days"*, *"seasonal"*. A schedule is something else: a number of charges, and how often each falls due. Between the two sits an arithmetic the merchant did not write, and the product cannot afford to write it on their behalf.

The machinery that turns a schedule into money can express exactly one shape. `BillingPeriod` is `"month" | "year"` (`lib/commitment/types.ts:11`); `computeCommitment` multiplies the per-period amount by the count; the consent route sends the count and the period to `ensurePlan`, which writes `frequency: { interval_unit: "MONTH" | "YEAR", interval_count: 1 }` and refuses a plan without a whole number of cycles (`lib/paypal/subscriptions.ts:99–103`, `:136`). A subscription that never ends has no `total_cycles` this code will accept, and a weekly or quarterly charge has no interval unit it can send.

So *"12 months"* is only schedulable if the twelve months are twelve monthly payments. A box billed quarterly for a year is four charges; printed as twelve, every figure on the screen is three times the truth. A box billed monthly with no stated end is a schedule with no total — *across the term* has no value, and three figures become two.

The catalogue states these shapes and does not distinguish them. In one search of thirty results for *subscription* on 2026-11-12, one listing stated both a count and a cadence, six stated a count with no cadence word, three stated a cadence with no count, and twenty stated neither. Whatever rule is chosen here decides how much of that vocabulary survives.

## Options

### Option 1 — **A term in whole months becomes monthly payments; a stated cadence that is not monthly, or no stated end, is shown as stated and not scheduled**

A listing that states a term in months, and does not state a different cadence, becomes `count = months`, `period = month`. The figures follow: the price repeated for as many charges as the term states. A listing that names a different charge period — quarterly, annually, every 90 days — is not converted: the screen prints the merchant's sentence and says that this page cannot compute an end-to-end total for it. A listing that states a cadence and no term is the same kind of thing: the merchant described a schedule the catalogue does not end.

*How it feels:* a curated box and a catalogue box are read the same way — *Across the term $149.94 · Cost to leave not stated · Charged today $24.99* — with *"6-Month Subscription"* quoted under the figure. A quarterly box opens with its own sentence: *this listing says it bills every three months; it does not say for how long, so there is no total here* — and its price, in the merchant's words, with no figure invented on top.

### Option 2 — Teach the money path every cadence the words use, and plans that do not end

Weeks, days, quarters, *"every three months"*, and a plan whose cycles are uncapped. The schedule then matches the listing exactly, including the commonest subscription there is: monthly, cancel anytime.

*How it feels:* complete, and like a different feature. It changes what a plan is (`interval_count` alongside `interval_unit`, no `total_cycles`), what the first figure is (a total with no term is not a total), and what the shopper consents to. Each of those is a decision about money with its own risks, taken at the same deadline as this one.

### Option 3 — Read the term as the number of payments, whatever the listing says

*"12-month subscription billed quarterly"* becomes twelve monthly payments. One rule, no exceptions, no refusals.

*How it feels:* confident and wrong. The screen multiplies a price the merchant charges four times by twelve, and PayPal is asked to collect a schedule nobody published. The quarterly case is not exotic — it is one of the first shapes a subscription search returns.

### Option 4 — Schedule only a listing that states a count and a cadence in the same breath

Take a `paymentCount` span literally: *"6 payments"*, *"paid monthly for 12 months"*. Nothing is assumed, because both halves are written.

*How it feels:* exact, and barely better than the four ids. Measured on one search: one listing in thirty states both. The product would keep the ceiling it is trying to remove and remove the four listings it already has.

## Reasoning

The deciding factor is **who is doing the arithmetic**. Every figure this product prints is either copied from a source or computed by our code from parts the source stated — never inferred from what a merchant probably meant. *"6-Month Subscription"* states six months. It does not state six charges. Turning months into monthly payments is therefore an assumption, and Option 1 makes that assumption narrow enough to be seen, guarded, and quoted: it holds only while the listing says nothing about a different charge period, the merchant's own sentence sits under the figure, and the arithmetic line (*6 payments of $24.99*) lets a reader check the step that was taken.

The second factor is **what the existing precedent already does**. The curated map has always read *"6 month BarkBox plan"* as six monthly payments, and the front door's worked example depends on it (`lib/market/subscriptions.ts:15–18`, `:29–36`). A rule that refused this would make the product's own four listings unschedulable — the opposite of making the whole catalogue possible. Option 1 keeps the rule the product already relies on and extends it where it is checkable.

Option 3 keeps the same rule but drops the guard, which is where the money is lost: a merchant who wrote *quarterly* meant four charges, and the page would print twelve. Option 2 is the honest long-run answer and is refused only on scope — it is not a smaller version of this decision, it is a second one. Option 4 is refused because it was measured: it resolves one listing in thirty, which is not a catalogue.

The two refusals are the price of the decision and are made deliberately. A quarterly or annually-billed box, and a subscription that never ends, are stated as the merchant stated them and not scheduled. Both are common; both need figures this product does not yet have; neither can be given one without inventing the other.

## Tradeoffs

- **A month-term is assumed to be monthly charges.** A listing that says *"12-month subscription"* and bills annually, without ever saying *annually*, will print twelve payments where there is one. The guard only catches a cadence the merchant wrote down. This is the decision's residual risk, and it is the one to test against real listings before the video is recorded.
- **The commonest real subscription cannot be bought here.** *Monthly, cancel anytime* — a cadence and no end — opens as a described listing with no total and no way to agree. That is the shape most shoppers actually meet, and the product declines it rather than approximate it.
- **Terms stated in years are refused.** *"1-year plan"* could mean twelve monthly charges or one annual one, and the catalogue does not say. Only whole months are scheduled, which leaves a wording that appears in real titles unschedulable.
- **A one-payment term is a one-time purchase by arithmetic.** *"One Month Gift Box"* schedules as one charge, so the screen shows a recurring shape whose figures are a single payment. Nothing is wrong numerically; the label may read oddly.

## Notes

- **The cadence fields the reader needs are `termLength` and `period`.** `period` already exists in the reader's vocabulary for documents (`lib/document/fields.ts:15`); the term length is the new one (ITD 33).
- **A listing with a cadence and no term is not "no term".** It is a stated schedule without an end. IPD 40 gives the three absences their own sentences so a shopper can tell *"monthly, no end"* from *"the copy says nothing"*.
- **`ensurePlan` is not changed by this decision.** One finite schedule it can already express is the boundary of what may be sold.
- **This is the decision to revisit first** once the demo is recorded: extending the money path to `interval_count` and uncapped cycles is what turns the most common listings into commitments, and it is a decision about plans and figures, not about reading.
