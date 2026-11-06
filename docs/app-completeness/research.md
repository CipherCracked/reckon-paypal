# Problem research — what the evidence says about helping people judge a commitment

**Status:** research log. Feeds the problem tree in `intro.md`; takes no product decisions itself.
**Date:** 2026-11-07 · Sources are linked inline. Figures are as reported by the cited source; where a
number came from a secondary summary rather than the primary study, it is marked.

---

## 1. How large is the audience, really?

- **34% of US adults** score at or below Level 1 in numeracy (OECD, PIAAC 2023) — above the OECD
  average of 25%. At Level 1 a person "can do basic maths with whole numbers or money" but not much
  beyond. — https://gpseducation.oecd.org/CountryProfile?primaryCountry=USA&treshold=5&topic=AS
- Prevalence figures for **dyscalculia** specifically are commonly given as 3–7% of the population;
  the British Dyslexia Association's adult information sheet describes it as "a lifelong hidden
  condition". — https://cdn.bdadyslexia.org.uk/uploads/documents/Downloadable-Resources/Dyscalculia-FactSheet_Adults.pdf
- Everyday money tasks are measurably harder for this group: young adults with dyscalculia show
  weaker performance on ordinary tasks such as working out change or judging a discount (Vigna et
  al., 2022, as summarised at https://neuromoney.io/blog-dyscalculia-money.html).

**What this means for the tree:** the audience is two orders of magnitude larger than "diagnosed
dyscalculia", but almost all of it is **undiagnosed and unaware**. Any product that requires the
person to opt in as someone who needs help reaches a rounding error of the people it is for.

---

## 2. Does disclosure actually work? (this is the uncomfortable one)

- The CFPB's own research programme on consumer disclosures ("Disclosure 2.0") found that **"in none
  of the government's Disclosure 2.0 efforts have anywhere near 100 percent of the consumers tested
  understood or accurately used 100 percent of the information disclosed"** — and that was in
  laboratory conditions, without real-world distraction.
  — https://www.rsfjournal.org/content/3/1/74
- Format effects are large and sometimes counter-intuitive. **Low-numeracy consumers are more
  attracted by percentage formats** than by absolute amounts (Graffeo & Bonini, 2018), meaning the
  presentation that feels clearer may bias them. — https://pmc.ncbi.nlm.nih.gov/articles/PMC9234211
- **Less is more**: comprehension improves — particularly for people low in numeracy — when
  information is *reduced and ordered* rather than complete. Hibbard et al., "Less Is More in
  Presenting Quality Information to Consumers".
  — https://journals.sagepub.com/doi/10.1177/10775587070640020301
- **Natural frequencies beat percentages**: "3 out of 100 people" is understood better than "3 per
  cent", in medical and payday-loan contexts alike. UK BEIS literature review on online contractual
  terms. — https://assets.publishing.service.gov.uk/media/5d303836e5274a14ed4871c7/improving-consumer-comprehension-online-contractual-terms-literature-review.pdf

**What this means for the tree:** our entire premise — *restate the commitment as three dollar
figures* — is an assumption the literature does not straightforwardly support. More figures is not
obviously better than fewer, ordered figures; and the choice of unit (dollars vs. percentages vs.
frequencies vs. per-day costs) may matter more than the presence of a translation at all.

---

## 3. Where the harm actually shows up

- The average consumer now manages **12 active subscriptions** and spends **over $273/month** on
  recurring services; **42% have forgotten about a subscription** they hold.
  — https://www.shopify.com/blog/subscription-tracker-app
- Over **40% of Americans** pay for "ghost" subscriptions they forgot they signed up for, averaging
  **$17/month (~$200/year)** (C+R Research, as reported by CNBC Select).
  — https://www.cnbc.com/select/best-subscription-trackers
- Subscription-management tools operate **after the fact**, from bank feeds: Rocket Money reports
  **5M+ users** and $500M in cancelled subscriptions.
  — https://greenlight.com/learning-center/reviews/rocket-money-review

**What this means for the tree:** the measurable harm is *not* "the shopper misunderstood a single
price"; it is "the shopper kept paying for something they had stopped thinking about". A product that
exists only at the moment of consent cannot touch that harm, and every existing tool addresses it
from the other end of the lifecycle.

---

## 4. The regulatory ground has moved

- The FTC's "Click-to-Cancel" / Negative Option Rule was **vacated in its entirety** by the US Court
  of Appeals for the Eighth Circuit on 8 July 2025 on procedural grounds; the FTC has since moved to
  revive it. — https://www.crowell.com/en/insights/client-alerts/clicking-all-the-right-boxes-ftc-moves-to-revive-click-to-cancel-rule-following-eighth-circuit-vacatur
- In the UK, the FCA's **Consumer Duty** requires firms to demonstrate good outcomes for customers
  in vulnerable circumstances, and its 2025 review found firms giving **inadequate consideration to
  outcomes for different customer groups**, including those with characteristics of vulnerability.
  — https://www.globalfinregblog.com/2025/03/fca-sets-out-findings-from-firms-treatment-of-vulnerable-customers
- Dark-pattern enforcement continues on both sides of the Atlantic, with inability to switch off
  auto-renewal inside the purchase flow the most frequently observed problem in the 2024 ICPEN
  sweep of 27 agencies. — https://www.icpen.org/sites/default/files/2024-07/Public%20Report%20ICPEN%20Dark%20Patterns%20Sweep.pdf

**What this means for the tree:** in the US the legal duty to make leaving easy has just been
removed, while in the UK a duty to show good outcomes for vulnerable customers has become explicit.
Leaving a commitment is now a *market* gap rather than a compliance checkbox — and a compliance
argument only exists in some jurisdictions.

---

## 5. Who would ever deploy this?

- Price transparency is repeatedly justified by *seller* benefits — fewer returns, less confusion,
  stronger credibility — rather than by the seller's interest in fewer sales.
  — https://luthresearch.com/glossary/understanding-where-price-transparency-is-a-legal-requirement-for-e-commerce
- Where transparency has been studied, the finding is that it narrows price dispersion and lowers
  prices — that is, it redistributes value away from sellers.
  — https://www.congress.gov/crs_external_products/RL/PDF/RL34101/RL34101.6.pdf
- The actors already operating in this space are **consumer-side, post-purchase**: bank-feed
  monitors, not checkout screens. No comparable consumer-side product was found that intervenes
  before the payment is authorised.

**What this means for the tree:** the app currently assumes a merchant who is willing to show a
screen that may talk a shopper out of the purchase. Either that merchant exists for reasons other
than conversion (regulation, brand, ethics), or the tool belongs to someone else — the payer's
bank, the browser, or the payment platform itself, which is present across every merchant and is
also the sponsor of this hackathon.

---

## 6. What this research does *not* establish

- No study was found that measures the effect of a **three-figure commitment translation** at
  checkout on comprehension or on later regret. That is our hypothesis, not a finding.
- Nothing here proves that better comprehension changes purchase decisions; several results suggest
  comprehension and behaviour are only loosely coupled.
- No usability data with the target population has been gathered by us; all evidence above is
  secondary.

---

## Where this challenges our existing decisions

| Existing decision | What the evidence says |
|---|---|
| **IPD 1** — primary user = adults with dyscalculia | Right about the mechanism, far too narrow on reach: ~34% of adults have low numeracy and nearly all are undiagnosed. A self-selected audience is the wrong delivery. |
| **IPD 2** — intervene at the moment of consent | The harm (forgotten subscriptions, ~$200/yr) accrues *after* consent. Consent is one moment in a lifecycle the product now ignores. |
| **IPD 3** — translate into today / term / exit | Not obviously the best rendering. Evidence favours fewer, ordered items, and unit choice (dollars vs. percentages vs. frequencies) may dominate. Three figures is our design, not a proven optimum. |
| **IPD 4** — labelled aid, no advice, no blocking | Still defensible, but "no advice" may under-serve: evidence on ordering suggests the *arrangement* of information is itself a recommendation mechanism. |
| **IPD 5** — one universal rendering | Consistent with the hidden-condition reality: no mode selection. But "universal" needs evidence that it works for the least numerate reader, not just that it avoids modes. |
