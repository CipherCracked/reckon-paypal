# Accessible Commerce Companion — ITDs

| ITD 4 — *"Use a small curated local catalog for the demo, with a replaceable data layer."* |  |
| :---- | :---- |
| **THE PROBLEM** | The checkout needs product content for the model to read and for the demo to read as commerce rather than a mock. |
| **OPTIONS CONSIDERED (Decision in bold)** | 1. **A curated catalog of realistic products stored locally.**<br>2. Channel3 product data, for the sponsor prize.<br>3. Live merchant pages, scraped at runtime.<br>4. Generated placeholder products. |
| **REASONING** | Product data is not the uncertain part of this build; the payment moment is. A curated catalog gives control over what the demo shows and keeps an external dependency off the critical path. Channel3 adds a prize but also an integration risk inside a week. Scraping live merchants is the fragility already rejected at the delivery layer. Placeholder products make the demo read as a mock. |
| **TRADEOFFS** | The catalog is small and hand-built, so it demonstrates the mechanism rather than scale. |
| **NOTES** | Keep the data layer behind an interface so a real product source can replace it after the demo. Reconsider Channel3 only if the payment path is finished early. |
