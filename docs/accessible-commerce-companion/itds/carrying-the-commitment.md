# Accessible Commerce Companion — ITDs

| ITD 6 — *"Build the record from PayPal at the moment it is asked for, and verify it there, so the shopper carries the commitment and we keep nothing."* |  |
| :---- | :---- |
| **THE PROBLEM** | IPD 8 promises the shopper a record of what they committed to — next charge, total, exit terms, where to manage it — while the product continues to store nothing about anyone. A record has to come from somewhere. Three of the four obvious sources (a database, a session, an emailed copy) are storage; the fourth has to be found or the promise is empty. |
| **OPTIONS CONSIDERED (Decision in bold)** | 1. **A receipt route keyed by the PayPal id already in the URL; on request it retrieves the order or subscription from PayPal, confirms it is settled, and renders the record from the response plus catalogue terms. The `.ics` is generated from the same response.**<br>2. Render the record client-side from state the consent screen already holds, and generate the `.ics` in the browser.<br>3. Store the record server-side under an unguessable link.<br>4. Email the record to an address the shopper supplies. |
| **REASONING** | Option 1 makes PayPal the store of record, which is true: it holds the transaction, its amount, its status, and — for subscriptions — the next billing time. Nothing is persisted by us because nothing needs to be; the id in the URL is an index into someone else's database. It also makes forgery irrelevant in the right way: if the order is not settled at PayPal, the route refuses rather than printing a plausible-looking receipt. Option 2 dies with the tab — the whole point is an artefact that outlives the session — and generates a record from whatever the client last rendered rather than from the authority. Options 3 and 4 are the stores IPD 4 and IPD 8 rule out. |
| **TRADEOFFS** | A receipt is only viewable while PayPal's sandbox keeps the order, and the route depends on PayPal's API being reachable — so it must fail honestly ("we cannot confirm this payment right now") rather than degrade into a guess. The order id is visible in a URL, which is acceptable because it is a payment reference, not a person: no name, no address, no account. The next-billing time for a subscription can be absent; the route then states the interval instead of inventing a date. |
| **NOTES** | One-time orders: `GET /v2/checkout/orders/{id}`, require `status === "COMPLETED"`, and refuse otherwise. Subscriptions: `GET /v1/billing/subscriptions/{id}`, use `next_billing_time` when present. Both already use the same OAuth token helper the payment routes use — no new credential path. |

---

**Revision — 2026-11-07: what exists, and what this adds.**

**As-built.** After capture, `ConsentScreen` sets `payment.status = "paid"` and shows one sentence.
Nothing is rendered from the capture response beyond `status`, and nothing survives the tab. There is
no receipt route, no `.ics`, and no renewal date anywhere in the app — `PaymentState.paid` carries
only a note.

**What this adds, and what it refuses to add.** A route under `/receipt/[orderId]`, a `text/calendar`
response for the next charge, and a link from the paid state. No database, no session, no file, no
log of who asked. The route is a read of PayPal's record, formatted.

**Where the next charge comes from.** Subscriptions: PayPal's `next_billing_time`, which is the real
date. One-time orders: no next charge, and the record says so rather than showing a blank or a zero.
Financed-as-one-time (the catalogue's mattress): the record repeats the consent screen's caveat that
the payments were not set up at PayPal — a receipt that implies a schedule the payment did not create
would be the exact failure this product exists to prevent.
