# Accessible Commerce Companion — ITDs

| ITD 4 — *"Use a small curated local catalog for the demo, with a replaceable data layer."* |  |
| :---- | :---- |
| **THE PROBLEM** | The checkout needs product content for the model to read and for the demo to read as commerce rather than a mock. |
| **OPTIONS CONSIDERED (Decision in bold)** | 1. **A curated catalog of realistic products stored locally.**<br>2. Channel3 product data, for the sponsor prize.<br>3. Live merchant pages, scraped at runtime.<br>4. Generated placeholder products. |
| **REASONING** | Product data is not the uncertain part of this build; the payment moment is. A curated catalog gives control over what the demo shows and keeps an external dependency off the critical path. Channel3 adds a prize but also an integration risk inside a week. Scraping live merchants is the fragility already rejected at the delivery layer. Placeholder products make the demo read as a mock. |
| **TRADEOFFS** | The catalog is small and hand-built, so it demonstrates the mechanism rather than scale. |
| **NOTES** | Keep the data layer behind an interface so a real product source can replace it after the demo. Reconsider Channel3 only if the payment path is finished early. |

---

**Revision — 2026-11-07: the interface exists; the catalog is still three products.**

The "replaceable layer" the Notes promise was built: `lib/catalog/products.ts` exposes
`findProduct(slug)` and nothing else reads the catalog directly, so a different source can be
substituted without touching the route handlers or the screen.

What has not happened is the substitution itself. Three hand-written products remain, and every
product carries the terms the translation needs — shape, recurrence, instalment schedule, exit terms
— which is precisely what a real product feed would *not* provide. The gap is therefore not "where do
products come from" but "where do commitment terms come from", and a product dataset does not answer
it.

**Channel3, priced accurately.** The sponsor prize is $1,500 for one project using its tools (rules
page, 2026-11-07). Against that: product data solves the part of the problem that is already solved by
three fixtures, and leaves the part that is actually hard — merchant terms — untouched. Reconsider
only if the commitment-terms question is answered another way first.
