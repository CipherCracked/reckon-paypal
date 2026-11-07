# IPD 1 — Primary User Profile

**Status:** Adopted (2026-11-07) — the design target; every profile reads one screen
**Date:** 2026-11-05
**Answers:** Problem tree root question 1 — *Who is the primary user, and what cognitive difference defines their need?*

---

## Problem to solve

The first root question decides everything downstream: what the interface shows, what the AI is asked to do, which PayPal surface matters, and what counts as success. Pick a profile that is real but cannot be shown in three minutes, or one a judge reads as a lifestyle inconvenience, and both the product and the impact claim weaken.

The field has four credible candidates. Each is a genuine cognitive difference with evidence of harm in commerce. They are not interchangeable.

---

## Options

### **Option 1 — Adults with dyscalculia, at the moment of judging a price**

A shopper looks at a product page carrying several numbers at once: a sale price, a struck-through original, a percentage off, shipping added later, tax added later still, and a monthly instalment offer underneath. The shopper cannot hold these figures together or tell whether the total is a good one. The companion restates the purchase as one readable truth — what this costs today, what it costs across the whole commitment, and what it costs per use — and holds that answer steady while the shopper decides.

### Option 2 — Adults with ADHD, at the moment of impulse

A shopper has already decided to buy and is looking for the button. The companion interrupts that momentum and asks them to sit with the commitment before confirming. The relief is a pause that the shopper did not know they wanted.

### Option 3 — Adults with acquired brain injury, at the moment of consent

A shopper reaches terms they cannot evaluate — renewal clauses, cancellation windows, bundled consent — and their own judgement of those terms is the thing that has changed. The companion reads the terms back, names what is being agreed to, and asks for confirmation in the shopper's own frame. The relief is a second reading from something that is not impaired.

### Option 4 — Adults with intellectual disability, with a supporter present

The shopper and a trusted supporter make the purchase together. The companion produces a shared view both can read, so the supporter can help without taking the decision away.

---

## Reasoning

This choice was made against a stated rubric rather than by argument. The rubric and every score are recorded below so the decision can be challenged.

Weighting follows the brief: the hackathon names social impact as the focus, the build is solo with a three-minute demo, and the project must use both PayPal and AI. That gives 50 percent to the dimensions of the harm, 40 percent to what a single builder can show inside a week, and 10 percent to the technical requirement.

Dyscalculia takes the decision on three criteria that carry a third of the total weight between them: its impact is observable in the session where it happens, its assistance leaves the shopper's decision untouched, and almost no shopper-side tool occupies the space. ADHD is the strongest rival and beats dyscalculia on evidence quality and reach — both real advantages — but its impact only becomes visible weeks after the purchase, which neither a demo nor a week of building can surface.

What drove the choice, plainly: a judge can watch a shopper fail to compute a total, then watch the companion place the true total in front of them, and see the difference in one screen. That property belongs to dyscalculia and to none of the other three.

---

## Decision Record — Scoring

Each criterion is scored 1–5 and multiplied by its weight. The weights encode the brief's priorities, not a claim of objectivity.

| # | Criterion | Weight | Dyscalculia | ADHD | Brain injury | Intellectual disability |
|---|---|---|---|---|---|---|
| 1 | Severity of harm | 15% | 3.5 | 4.0 | 5.0 | 4.5 |
| 2 | Strength of evidence | 15% | 3.0 | 4.5 | 3.5 | 3.0 |
| 3 | Reach | 10% | 4.0 | 4.5 | 3.0 | 2.5 |
| 4 | Reads as disability, not preference | 10% | 4.5 | 3.0 | 5.0 | 5.0 |
| 5 | Impact observable now | 15% | 5.0 | 2.0 | 2.5 | 2.5 |
| 6 | Preserves the user's agency | 10% | 5.0 | 3.0 | 4.0 | 3.5 |
| 7 | Not already occupied | 10% | 4.5 | 2.0 | 4.5 | 4.5 |
| 8 | PayPal is load-bearing | 8% | 3.5 | 4.5 | 3.0 | 3.0 |
| 9 | AI does real work | 7% | 4.5 | 3.0 | 4.5 | 4.0 |
| | **Weighted total (out of 5)** | **100%** | **4.12** | **3.40** | **3.86** | **3.57** |

**Sensitivity.** The ranking survives moderate reweighting. ADHD overtakes dyscalculia only when the weight on evidence is pushed past roughly 35 percent, which means choosing research rigour over the hackathon's stated impact and demonstration priorities.

**Scores that are judgement calls, not facts:**

- Criterion 4 scores ADHD at 3 because of how a general audience reads it, not because its status is in doubt. ADHD is a protected disability.
- Criterion 1 for dyscalculia at 3.5 reflects harm that is material but rarely catastrophic. Brain injury scores highest here because impaired judgement can expose a person to fraud.
- Criterion 8 for dyscalculia is lower than ADHD's because recurring subscriptions are a more natural PayPal surface than one-off price comprehension.

---

## Tradeoffs

Dyscalculia is less familiar to a general audience than ADHD. The demo will need one sentence of explanation — that this is a recognised learning disability, not a maths aversion — before the relief reads as relief.

The profile also narrows the product. A companion built around price comprehension will not speak to a shopper whose barrier is sensory overload or reading load. That is accepted: one profile shown in depth carries further than four handled thinly, and the decomposition already lists coverage of every category as a non-goal.

---

## Revision — 2026-11-07: the design target is not the audience

Evidence gathered after this document was written (`docs/app-completeness/research.md`) confirms the
choice and falsifies one thing the product was beginning to claim.

**Confirmed.** Everyday money tasks are measurably harder for adults with dyscalculia — working out
change, judging a discount (Vigna et al., 2022). Criterion 5, "impact observable now", is the reason
this profile won, and it still holds: the failure happens in the session where the shopper is.

**Corrected.** The population that shares this barrier is far larger than the population that has
the diagnosis. **34% of US adults** score at or below Level 1 in numeracy (OECD, PIAAC 2023; OECD
average 25%), while dyscalculia itself is commonly estimated at 3–7% and, in the British Dyslexia
Association's words, is "a lifelong hidden condition".

So this document decides **who the interface is designed against** — the dyscalculic shopper, whose
barrier is the hardest to design for — and not **who the product is for**. The product is for anyone
who cannot hold a commitment's terms together, most of whom will never be diagnosed and will never
select anything. Any statement of the audience must say that, and any claim of reach must use the
numeracy figure, not the prevalence of the diagnosis.

**Also corrected.** The option text above describes the companion as restating "what it costs per
use". Nothing in the product computes a per-use cost; IPD 3 decided the third figure is the **cost of
leaving**. The earlier wording is left in place as the record of what was considered, and this note
is the correction of what was chosen.

**Not changed.** The choice of dyscalculia over the other three profiles, and the scoring that
produced it, stand. This revision narrows what the choice entitles us to claim, not what we build.
