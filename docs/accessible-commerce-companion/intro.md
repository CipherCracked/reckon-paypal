# Accessible Commerce Companion — Problem Decomposition

**Status:** Draft
**Date:** 2026-11-05
**Revision:** Scope broadened from a single checkout to any commitment at the moment of consent — paid now, paid over time, or financed.
**Context:** PayPal AI Hackathon 2026 · solo · submissions close 2026-11-12

---

## Problem Statement

People with cognitive disabilities can fail at the moment they agree to pay — not because they lack money or intent, but because each purchase asks them to hold several derived numbers at once: what is charged today, what the commitment costs across its term, and what it costs to leave.

Merchant-side accessibility tools catch structural defects (alt text, contrast, labels, focus order). They do not catch the cognitive load of an actual purchase. Shopper-side AI tools exist for productivity, scheduling, and reading — almost none for buying.

The result: some people abandon purchases they wanted, agree to recurring charges they did not understand, or avoid online commerce entirely.

---

## Background and Context

**Scale**

- Cognitive difficulty is the most commonly reported disability type among US adults — roughly 1 in 7 (CDC, cited by UsableNet). Vision is about 1 in 18; hearing about 1 in 16.
- Average ecommerce cart abandonment is about 70%. Of abandoners, 17% cite a checkout that was "too long or complicated" (Baymard, cited by UsableNet).
- A 2025 industry survey reports 81% of disabled shoppers struggled to complete a transaction, most often at CAPTCHA or complex verification. *(Single source — lower confidence.)*

**Gap in the market**

- Automated accessibility scanners can flag missing labels and low contrast. They cannot judge whether a five-step checkout is understandable.
- Merchant-side overlays (Recite Me, AudioEye, accessiBe) are compliance products sold to stores, not companions for shoppers.
- Neurodivergent consumer AI tools (Goblin Tools, Tiimo, Speechify) cover tasks, schedules, and reading — not commerce.

**Hackathon context**

- PayPal's 2026 developer direction is agentic commerce: Agentic Commerce Protocol, Store Sync, Agent Ready, delegated payments, instant checkout.
- Agentic checkout optimizes for autonomy — fewer steps, less confirmation. Cognitive accessibility often needs the opposite: slower, clearer, confirmed steps. That tension is unresolved and unexplored.

---

## Goals

1. Identify the single user profile and purchase moment where assistance produces the clearest, most defensible impact.
2. Define what "assistance" means in a way that preserves user agency rather than replacing it.
3. Produce a problem tree whose questions can be answered as IPDs and ITDs within the available time.

---

## Non-Goals

- Not a merchant-side accessibility overlay or compliance widget.
- Not a fully autonomous purchasing agent.
- Not a diagnostic or clinical tool.
- Not coverage of every disability category.
- Not a general productivity assistant.

---

## Constraints

- Solo developer, roughly 7 days (2026-11-05 → 2026-11-12, 3:00 PM EST).
- Must meaningfully use **both** PayPal APIs and AI.
- No access to target users for research or testing.
- Deliverables: public repo with license, hosted demo, sub-3-minute video.
- Sandbox payments only.

---

## Assumptions

- A controlled demo environment is acceptable; the product does not need to work on arbitrary merchant sites for the first version.
- Judges reward a specific, concrete impact story over broad but shallow coverage.
- One profile demonstrated deeply reads better than several handled thinly.
- Secondary research is sufficient; primary user research is not feasible in the time available.

---

## Problem Tree

### 1. Who is the primary user, and what cognitive difference defines their need?

- Which profile: dyscalculia, ADHD, acquired cognitive impairment, intellectual disability, dyslexia?
- How does the same purchase flow fail differently for each?
- Is one profile primary, or must the product adapt per user?
- Who else benefits from the same mechanism, and does serving them require configuration?
- Is anyone else involved — a caregiver, a support worker, a family member?

### 2. Where in the purchase journey does the problem occur, and where should the product intervene?

- Before purchase — deciding whether to buy at all?
- During checkout — understanding cost, terms, and next steps?
- After purchase — renewals, refunds, disputes?
- Which commitment shapes must be covered — paid now, paid over time, financed?
- Which moment is both most painful for users and most demonstrable for judges?

### 3. What should assistance look like — explain, decide, act, or support?

- Does the product explain, recommend, execute, or verify?
- Which quantities must the translation contain — charged today, cost across the term, cost of leaving?
- Should the product confirm the shopper understood, and if so how?
- How much decision authority does the user keep?
- What must the user still do themselves for the product to empower rather than patronize?
- How is consent represented and confirmed?

### 4. What systems must the product work with to complete a real purchase?

- What is PayPal's necessary role — payment, subscription, invoicing, disputes?
- What product and merchant data is required, and where does it come from?
- Does the product live inside a store, beside a browser, or standalone?
- What is the minimum credible integration for a working demo?

### 5. How does the product earn trust and preserve agency?

- What must the user disclose, and to whom?
- How does it avoid being condescending or infantilizing?
- What happens when the product is wrong?
- How is a caregiver or supporter involved without removing the user's autonomy?

---

## Open Questions

- Which cognitive profile should be primary?
- Should the product work on arbitrary stores, or in a hosted demo store?
- What is the minimum credible PayPal integration?
- Does involvement of a second person strengthen or complicate the story?
- How do we make an accessibility impact claim without user testing?

---

## Research Confidence

| Claim | Source | Confidence |
|---|---|---|
| Cognitive difficulty ≈ 1 in 7 US adults | CDC, via UsableNet | Medium |
| Cart abandonment ≈ 70%; 17% cite complexity | Baymard, via UsableNet | Medium |
| 81% of disabled shoppers struggled at checkout | LinkedIn post citing a 2025 survey | Low |
| PayPal agentic commerce is a 2026 strategic focus | developer.paypal.com, PayPal investor release | High |
