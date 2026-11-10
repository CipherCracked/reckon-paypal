# Can a subscription's terms be sourced the way a one-time price was?

**Question.** One-time items stopped being invented when Channel3 started
supplying real listings (`lib/market/channel3.ts`). The two plan entries in
`lib/catalog/products.ts` are still invented: 12 × $12.00 coffee, and 12 ×
$105.00 plus a $60.00 fee for a mattress. Can real published terms replace
them, the way Channel3 replaced the one-time items?

**Short answer.** No — not completely, and the reason is a property of the
market rather than a gap in our tooling. Merchants publish the *rules* of a
term commitment and leave the *figures* to the signed agreement, because the
figures vary by enrolment. A subscription with no stated amount per period
cannot be a shop item: PayPal needs an amount to build a plan, and the screen
needs one to compute a term total.

Captured 2026-11-10 with the tavily extract skill. Quotations are verbatim.

---

## Gold's Gym — Chapman, Tennessee

Source: <https://www.goldsgym.com/locations/tn/chapman/terms-of-the-agreement>
Captured: 2026-11-10

> There is a $149 early termination fee to cancel a 12 Month plan if cancelled
> by the Member prior to fulfilling the Initial Term, due upon cancellation.

> This Agreement will renew automatically on a month to month basis at the end
> of the Initial Term with Bi-Weekly dues to be paid in the amount equal to the
> dues for the equivalent membership type in effect at that date.

> Bi-Weekly installment payments are drafted automatically every other Friday
> with the billing information provided on the Member Agreement.

States: a 12-month term, a real $149 early-termination fee, a bi-weekly
cadence, automatic renewal, a 30-day notice period.
Does **not** state: the amount of a bi-weekly due — it is "provided on the
Member Agreement", which the member signs.

## Club Fitness — St. Peters, Missouri

Source: <https://www.clubfitness.us/join-online-terms-and-conditions>
Captured: 2026-11-10

> The indicated rate per month + tax for a minimum of the indicated number of
> monthly installment payments based on automatic payments billed to a
> checking, saving, credit or debit card account. Upon completion of your
> minimum installment payment (i.e. on your thirteenth payment), your monthly
> rate will increase by $1.00 and your membership shall automatically renew
> each month.

> Notwithstanding any other terms of this Agreement, if your applicable
> membership level has a minimum number of installment payments and you wish
> to terminate this Agreement prior to fulfilling that minimum term, you will
> be required to pay a one-time Early Termination Fee of $75.

States: a minimum instalment term (12 payments, implied by the rate rise on the
thirteenth), a real $75 early-termination fee, an annual membership fee in
addition to the monthly dues, a 30-day notice period.
Does **not** state: the monthly rate — it is "the indicated rate", filled in per
membership level. The same page lists the fee three times, "Early Termination
Fee: $75", once for each plan level, and never lists a price.

## Pages that do publish a price

Device instalments and annual-plan-billed-monthly services (Adobe, SiriusXM,
carrier device pages) publish all three facts on one page. Those pages render
their prices in JavaScript: a tavily extract of
<https://www.adobe.com/creativecloud/plans.html> returned the page's component
shell and no figures. Firecrawl, which renders, has no credits until 2026-11-13
— the day after the submission deadline.

## What this means for the catalogue

| Fact a plan needs | Published by a merchant? |
| --- | --- |
| The term length | Yes — 12 months, both agreements |
| The early-termination fee | Yes — $149 and $75, both agreements |
| The cadence | Yes — bi-weekly, monthly |
| The amount per period | **No** — "as indicated", "the indicated rate" |

So the structural terms can be real and cited. The amount cannot be. That
figure is either the buyer's chosen plan at checkout, or it is invented.

The `BillingPeriod` type holds `month` and `year` only, so Gold's bi-weekly
cadence is not representable as written; Club Fitness's monthly instalments
are.
