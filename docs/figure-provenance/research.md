# What Could Replace the Hardcoded Content

**Status:** Research record — not a decision
**Date:** 2026-11-07
**Feeds:** [Q2 of the problem tree](intro.md) and the narrowing question *"if we narrowed it just to removing hardcoded items rather than learning about users, then what?"*
**Method:** PayPal's own API references (`docs/api/...`, the `.md` and operation pages, verified 2026-11-07) and each sponsor's own documentation. Where a claim rests on a vendor's summary rather than a specification, it is marked.

---

## The question this answers

Two different things are called "hardcoded" in this project, and they have different fixes.

1. **The catalogue**: three products and two bills written in `lib/catalog/products.ts` and `lib/catalog/bills.ts`. Names, copy, prices, terms, due dates — all literal.
2. **The provenance claim**: several screens state or imply that the figures came from PayPal when they were computed from that literal file. `components/CommitmentView.tsx:31` defaults `sourceNote` to *"Figures calculated from the PayPal order for this purchase"*, and `app/api/commitment/[orderId]/route.ts` never contacts PayPal — `orderId` is only echoed.

Removing (1) is a data-source change. Fixing (2) is a copy change and could be done today. They are often discussed as one problem; they are not.

---

## What is actually hardcoded

| Field | Where it lives today | Shape |
|---|---|---|
| Product name | `products[].name` | string |
| Product copy | `products[].description` | string, deliberately ambiguous — it is the input the product translates |
| Price | `terms.itemPrice` | integer minor units |
| Shipping / tax | `terms.shipping`, `terms.tax` | integer minor units |
| Recurrence | `terms.recurrence { count, period }` | 12 × month |
| Exit cost | `terms.exit` | `none` \| `fee(0)` \| `unknown` |
| Biller and due date | `bills[].biller`, `bills[].dueInDays` | string, integer |

---

## What PayPal can supply natively

Verified against the operation pages, 2026-11-07.

### Catalog Products v1 — `GET /v1/catalogs/products`, `GET /v1/catalogs/products/{id}`

Returns `id`, `name`, `description`, `type` (`PHYSICAL`/`DIGITAL`/`SERVICE`), `category` (a fixed enum), `image_url`, `home_url`, `create_time`, `update_time`. The list response returns only `id`, `name`, `description`, `create_time` — the rest needs one call per product.

**Covers:** name, copy, a category, an image, a home link.
**Does not carry:** a price. The product object has no amount field at all.

### Subscriptions v1 — `GET /v1/billing/plans?product_id=…`

Confirmed to accept `product_id` as a filter, so a product and its plans can be walked from one root. A plan carries `billing_cycles[]` (`frequency { interval_unit, interval_count }`, `tenure_type` `TRIAL`/`REGULAR`, `sequence`, `total_cycles`, `pricing_scheme.fixed_price`) and `payment_preferences` (`setup_fee`, `auto_bill_outstanding`, `setup_fee_failure_action`, `payment_failure_threshold`).

**Covers:** price per cycle, cycle length, number of cycles (the term), and a one-off setup charge.
**Does not carry:** any notion of leaving early. There is no cancellation fee, no termination charge, no early-exit policy anywhere in a billing plan. `payment_preferences` governs *payment failure*, not *walking away*.

### Orders v2 — `GET /v2/checkout/orders/{id}`

`purchase_units[].items[]` carry `name`, `description`, `quantity`, `unit_amount`, `category`; `purchase_units[].amount.breakdown` carries `item_total`, `shipping`, `tax_total`, `discount`. `custom_id` and `invoice_id` are free-text fields the merchant controls.

**Covers:** name, copy, price, quantity, shipping, tax — for one purchase, after it is created.

### Invoicing v2 — `GET /v2/invoicing/invoices`, `POST /v2/invoicing/invoices/search-invoices`

Listing and searching both exist. An invoice carries `detail.invoicer` (name and address), `detail.due_date`, `detail.note`, `detail.terms_and_conditions`, `detail.memo`, `items[]` with `name`, `description`, `quantity`, `unit_amount`, and `amount`.

**Covers:** the biller, the due date, the line items, and a free-text terms field.

### The mapping, field by field

| Hardcoded field | PayPal source | Verdict |
|---|---|---|
| Product name | Catalog product `name` | available |
| Product copy | Catalog product `description` | available |
| Price | Plan `fixed_price` / order `unit_amount` | available |
| Recurrence and term | Plan `billing_cycles` | available |
| Shipping and tax | Order `amount.breakdown` | available |
| Setup fee | Plan `payment_preferences.setup_fee` | available |
| Biller and due date | Invoice `detail.invoicer`, `due_date` | available |
| **Exit cost** | — | **nowhere in the API** |

**Seven of eight fields can come from PayPal. The eighth cannot.**

That eighth is the figure the product is built around. The three figures are *charged today*, *across the term*, and *what it costs to leave*; the first two are arithmetic over PayPal's own numbers, and the third is a policy the seller writes and PayPal has no field for. A build that sources everything from PayPal would therefore still hold exactly one editorial fact — the one that carries the product's argument.

This is not a gap to work around. It is the finding: **PayPal is authoritative for what is charged and silent on what it costs to stop.** The free-text fields (`detail.terms_and_conditions` on an invoice, `description` on a product) are where a seller states an exit policy in prose, which is the same unsimplified input the product already translates.

---

## Sponsors, assessed against this problem

The question is narrow: **can a sponsor supply the content that is currently hardcoded?** Not whether the tool is good.

| Sponsor | What it actually provides | Supplies the hardcoded content? |
|---|---|---|
| **Channel3** | Search over a cross-retailer catalogue (50M+ products per the company's own funding announcement; the docs claim broader). Returns structured titles, descriptions, images, **current prices**, retailer offers, commission-ready links. Free developer account; SDK, MCP and CLI. Bonus prize. | **Partly — the shop, and only the shop.** It supplies retail items with prices. It supplies no term, no recurrence, no exit policy, so it cannot back the subscription, the financing, or the bill. It also puts a *second* price authority in the product, from retailers we do not sell for; honouring the money invariant would mean creating a PayPal order for an amount Channel3 quoted, which is an order for goods we cannot fulfil. |
| **Kernel** | Cloud browser infrastructure for agents — spin-up, session persistence, stealth, anti-bot handling. | In principle: it could read a live merchant's terms page instead of a written one. In practice that is scraping someone else's site to demonstrate a product, and it makes the demo depend on a third party's markup during judging. Not a source of content; a way of acquiring it. |
| **Elastic** | Vector and hybrid search over a corpus you supply. | No. It indexes content; it does not provide it. It would make the document door faster, and the document door already works. |
| **AG Grid** | Data grid component. | No. Presentation. |
| **Bryntum** | Gantt, scheduler, calendar components. | No. Presentation — though a payment calendar is the one place a term becomes visible as a shape. |
| **APIMatic** | Generates SDKs and AI-facing descriptions from an API spec. | No. It would make PayPal's spec easier for a model to call; it adds no product data. |
| **Postman** | API design, testing, monitoring; parent of Astropods. | No. |
| **Astropods** | Agent hosting, blueprints, traces, evals — "the agent operating system layer" in Postman's stack. | No. It would host the model, which we already call. |
| **Render** | Deployment. | No. |
| **Zapier** | Workflow automation between SaaS tools. | No. |

**One sponsor is relevant, and only to one of the two problems.** Channel3 solves "the shop is a hardcoded list" — the most visible instance of the complaint — and does so with a bonus prize attached. It does not solve, and cannot solve, the terms that the figures are computed from, because terms are not product data. Nobody sells a subscription's cancellation policy as an API.

---

## What follows for the narrowing question

Three options, stated as what each would actually buy.

### A. Fix the provenance claim only

Change the `sourceNote` default and the API route so that no screen attributes a computed figure to PayPal. State plainly that the terms are an example and the arithmetic is real. Nothing else moves.

*Buys:* the product stops making a false claim. *Costs:* a day. *Leaves:* the catalogue hardcoded, honestly labelled.

### B. Source the commitment from PayPal, keep the exit policy editorial

Create the three products and their plans at PayPal; derive every figure except exit from real plan and order objects; state the exit figure as the seller's published policy, read from the terms text, and say so on screen.

*Buys:* a genuine provenance chain for two of the three figures, and a much stronger Stage 1 answer — PayPal becomes structural rather than decorative. *Costs:* real sandbox state that must exist before judging, a catalogue that can be empty, and a demo that fails if the sandbox is reset. *Leaves:* one editorial figure, named as editorial.

### C. Add Channel3 for the shop

List the shop from Channel3 instead of a literal array.

*Buys:* real product data and a bonus prize. *Costs:* a second price authority, an order for goods we do not sell, an external dependency in the judged path, and it fixes the least load-bearing of the two problems — the shop is where a purchase happens, not where a commitment has to be understood. *Leaves:* the terms hardcoded anyway, because Channel3 does not have them.

**B is the only one of the three that changes what PayPal means to this product.** A is mandatory regardless. C is available and orthogonal.

---

## Confidence

| Claim | Source | Confidence |
|---|---|---|
| Catalog product objects carry name, description, type, category, image and home URL, and no price | PayPal Catalog Products v1 operation pages | **High** — read from the published response schema |
| Billing plans can be listed by `product_id` and carry cycles, term length and a setup fee | PayPal Subscriptions v1, List plans | **High** — query parameter and fields read from the operation page |
| No PayPal API expresses an early-termination charge | Absence across Catalog, Plans, Orders and Invoicing references | **High** for the objects read; an absence, stated as one |
| Invoices can be listed and searched, and carry biller, due date and free-text terms | Invoicing v2 operation summary | **High** for existence of the operations; **Medium** for the exact field paths, which come from the schema rather than a live call |
| Channel3 returns prices, images, offers and merchant links | Channel3's own documentation; funding announcement for catalogue size | **Medium–High** — vendor documentation, not tested |
| Channel3 supplies no subscription or term data | Its documented response shape is retail product data | **Medium** — an absence in vendor docs |
| The other eight sponsors supply no content | Each vendor's own description of its product | **Medium–High** |
| Sourcing products and plans from PayPal is worth the fragility it adds | No test | **Low** — this is the judgement B rests on, and it is untested |
