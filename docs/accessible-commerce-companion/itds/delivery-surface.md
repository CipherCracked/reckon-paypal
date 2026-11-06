# Accessible Commerce Companion — ITDs

| ITD 3 — *"Use a hosted demo store we control, with the companion inside its checkout."* |  |
| :---- | :---- |
| **THE PROBLEM** | Where the companion runs decides whether it can see the final total, whether the demo holds together on stage, and how much of a seven-day build goes to plumbing rather than product. |
| **OPTIONS CONSIDERED (Decision in bold)** | 1. **A hosted demo store we build, with the companion embedded in its checkout.**<br>2. A browser extension overlaying third-party stores.<br>3. A merchant-embedded widget.<br>4. A standalone app where the shopper enters purchase details. |
| **REASONING** | The product depends on the order object at checkout. In a store we control, the checkout is ours, the server creates the order, and every step is inspectable. An extension must inject into pages it does not own and read totals it cannot verify — the failure the product exists to prevent. A merchant widget answers the merchant's problem, not the shopper's. A standalone app asks the shopper to re-enter the numbers, which is the task dyscalculia takes away. |
| **TRADEOFFS** | The demo works on our store, not on Amazon. Judges see a controlled environment, and the extension path stays unbuilt. |
| **NOTES** | The store should read as a plausible merchant rather than a test harness. It needs at least one one-time and one recurring path, so the same mechanism is visible across commitment shapes. The consent step is where the product lives; the rest of the store exists to reach it. |
