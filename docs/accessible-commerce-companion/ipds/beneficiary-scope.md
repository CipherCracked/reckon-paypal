# IPD — Beneficiary Scope

**Status:** Proposed
**Date:** 2026-11-05
**Answers:** Problem tree root question 1 — *Who else benefits from the same mechanism, and does serving them require configuration?*

---

## Problem to solve

The product is built for adults with dyscalculia, and its mechanism is to read a commitment and restate it. Restating a commitment in plain, computed terms lowers cognitive load for more people than dyscalculia alone.

That opens a choice about scope. The product could stay a single-disability tool, could offer modes for several disabilities, or could claim cognitive accessibility as its subject. Each choice changes the interface, the privacy stance, and the credibility of the impact claim.

---

## Options

### **Option 1 — One rendering, universal design; dyscalculia is the primary user and others benefit without selecting anything**

Every design decision is made for the dyscalculic shopper — computed figures, plain labels, one screen, explicit terms — and those same decisions lower load for a dyslexic, ADHD, autistic, or cognitively impaired shopper who never declares anything.

### Option 2 — Disability-specific modes

The shopper selects a mode — dyscalculia, dyslexia, ADHD, autism — and the interface adapts. The product serves more people directly and asks each of them to name their condition at the moment of payment.

### Option 3 — Claim cognitive accessibility generally

The product stops naming a primary user. Its subject becomes cognitive accessibility, and it presents itself as useful to anyone whose barrier is attention, reading, or numbers.

### Option 4 — Single disability, no generalisation

The product serves dyscalculia only, and its interface is optimised for that barrier alone.

---

## Reasoning

The benefit generalises because the mechanism does not change — only the barrier does. A commitment stated as today, term, and exit helps a shopper who cannot compute, one who cannot read quickly, one who cannot hold attention, and one who cannot tolerate ambiguity. That makes breadth a property of the rendering rather than a feature to be configured.

A modes menu is the option that costs most. It requires the shopper to declare a diagnosis to a payment interface, which contradicts IPD 4's refusal to collect anything about the person. It also front-loads a decision at the moment the shopper is trying to pay, adding exactly the load the product exists to remove.

Claiming cognitive accessibility generally gives up the population whose need was validated in IPD 1, and a claim that broad is one a solo builder cannot evidence.

Universal design carries the breadth without the declaration. Each choice is justified by the primary user, and the wider benefit follows from those choices rather than from an additional setting.

---

## Tradeoffs

One rendering cannot be tuned for every barrier. Adaptations that require a different medium — audio output, symbol-supported text, a step-by-step mode — are outside it, so some users gain less than a tailored interface would give them.

The breadth is also invisible. A shopper who is not dyscalculic will not learn from the interface that it was designed with them partly in mind.

---

## Notes

- **Benefits are not claims.** The defensible statement is that the product is designed to reduce cognitive load and that dyscalculia is the primary need. Asserting efficacy for autism, ADHD, or acquired impairment would be a claim this project has no evidence for.
- No mode selection, no stored diagnosis, no preference that outlives the session.

---

## Revision — 2026-11-07: universality is now a requirement with a direction

The evidence strengthens this decision and adds an obligation the document did not carry.

**Strengthened.** The case against modes was framed as a privacy and cognitive-load argument. It is
also a reach argument: **34% of US adults** are at or below Level 1 numeracy and dyscalculia is
hidden and largely undiagnosed, so almost nobody who needs this would ever select themselves into a
mode even if we offered one. A product that requires declaration reaches the diagnosed, which is a
small fraction of the people it is for.

**Added obligation.** "One rendering" was stated as a property (no modes) rather than as a standard
(the rendering must work for the hardest reader). Those are different commitments, and only the
second is testable. Concretely:

- Every design choice is judged against the **least numerate reader**, not the median one.
- If a choice helps the median reader and costs the least numerate reader, the least numerate reader
  wins, and the cost is accepted rather than balanced.
- A rendering that cannot be used by the target reader is a defect, not a preference.

**Unchanged.** No modes, no declared diagnosis, no stored preference, and no claim of benefit beyond
designed load reduction. Audio, symbol support and step-by-step modes remain outside this decision —
and are now explicitly listed as the cost of it.
