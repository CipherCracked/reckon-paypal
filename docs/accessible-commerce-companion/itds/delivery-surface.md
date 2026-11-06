# Accessible Commerce Companion — ITDs

| ITD 3 — *"Use a hosted demo store we control, with the companion inside its checkout."* |  |
| :---- | :---- |
| **THE PROBLEM** | Where the companion runs decides whether it can see the final total, whether the demo holds together on stage, and how much of a seven-day build goes to plumbing rather than product. |
| **OPTIONS CONSIDERED (Decision in bold)** | 1. **A hosted demo store we build, with the companion embedded in its checkout.**<br>2. A browser extension overlaying third-party stores.<br>3. A merchant-embedded widget.<br>4. A standalone app where the shopper enters purchase details. |
| **REASONING** | The product depends on the order object at checkout. In a store we control, the checkout is ours, the server creates the order, and every step is inspectable. An extension must inject into pages it does not own and read totals it cannot verify — the failure the product exists to prevent. A merchant widget answers the merchant's problem, not the shopper's. A standalone app asks the shopper to re-enter the numbers, which is the task dyscalculia takes away. |
| **TRADEOFFS** | The demo works on our store, not on Amazon. Judges see a controlled environment, and the extension path stays unbuilt. |
| **NOTES** | The store should read as a plausible merchant rather than a test harness. It needs at least one one-time and one recurring path, so the same mechanism is visible across commitment shapes. The consent step is where the product lives; the rest of the store exists to reach it. |

---

**Revision — 2026-11-07: this decides what to build, not who the product is for.**

This ITD chose the demo store for a reason that still holds — inspectability, and a server we
control that creates the order — and that reasoning is unchanged. What it does not decide, and was
wrongly read as deciding, is the product's owner. That decision now lives in **IPD 6
(`ipds/host-and-ownership.md`)**: the companion belongs on the payment platform's authorisation step,
and the merchant store is the demonstration vehicle.

Two corrections follow:

- **"A merchant widget answers the merchant's problem, not the shopper's."** Half right. A merchant
  hosting this screen loses conversions and gains only fewer returns (~$26.50 per $100 of returned
  merchandise is the processing cost this would avoid). That is a real but weak incentive, and it is
  the reason a merchant is not the credible owner — not a reason the shopper is not served.
- **"An extension must inject into pages it does not own and read totals it cannot verify."** This
  is an assumption, not a finding, and it is the assumption that eliminates Option 2. It is left
  standing here because nothing in the build tests it. IPD 6 records it as a reason the payer-side
  option ranks below the platform, and flags it for revisit.

The demo store also carries an obligation the row above does not mention: it must **say** that in
production the screen belongs on the platform's authorisation step. A judge who sees only a store we
built will otherwise conclude the product is a store plugin.
