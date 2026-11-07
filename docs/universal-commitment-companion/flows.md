# The four ways in — how each one works

**What this document is:** a reading aid, not a decision record. It shows the order of events behind
each door on the home page. The decisions live in the IPDs and ITDs beside it — this file only
follows the code.

**The rule that holds on every path below:** a figure is computed by our code, from an amount the
processor stated or a span of text we verified. The model writes words and points at sentences. Its
schemas have no monetary field, and every string it returns crosses `lib/ai/guard.ts` or a substring
check before it can reach a screen.

---

## 0. The front door

```mermaid
flowchart LR
    H["/ — the question,<br/>not a catalogue"] --> A["A purchase<br/>/product/…"]
    H --> B["A subscription<br/>/product/…"]
    H --> C["A bill<br/>POST /api/paypal/invoices"]
    H --> D["A document<br/>/read"]
    H -.-> E["/shop — one of these,<br/>not the product"]
    A --> F["Three figures,<br/>same shape everywhere"]
    B --> F
    C --> G["/bill/{id}"]
    D --> F
    G --> F
```

Each door prints its own real figure before anything is clicked, so the shape of the product is
visible without entering it (IPD 12).

---

## 1. A bill — the only door that creates something at PayPal first

A bill exists because a biller issued it. There is nothing to read until PayPal has one, so this is
the one path where the shopper's click is what brings the object into being.

```mermaid
sequenceDiagram
    autonumber
    actor S as Shopper
    participant H as Home (browser)
    participant API as POST /api/paypal/invoices
    participant M as Money + commitment libs
    participant PP as PayPal Invoicing v2

    S->>H: Open this bill
    H->>API: { slug }
    API->>M: computeCommitment(bill.terms) → today
    Note over API: The amount sent is the computed total,<br/>never the first figure on the bill.
    API->>PP: POST /v2/invoicing/invoices<br/>DUE_ON_DATE_SPECIFIED + items[0].unit_amount
    PP-->>API: invoice id + amount
    API->>API: drift guard — PayPal's amount must equal ours,<br/>or the request fails and nothing is shown
    API->>PP: POST /v2/invoicing/invoices/{id}/send<br/>{ send_to_recipient: false }
    PP-->>API: status SENT + links[rel=payer-view]
    API-->>H: { invoiceId, dueDate, payerUrl, figures }
    H->>S: /bill/{id}?slug=…
```

Then the bill screen reads it back, because a bill is the biller's to change:

```mermaid
sequenceDiagram
    autonumber
    actor S as Shopper
    participant P as /bill/{id}
    participant PP as PayPal

    S->>P: open
    P->>PP: GET /v2/invoicing/invoices/{id}
    alt PayPal answers
        PP-->>P: status, amount, due_date, payer-view link
        alt PayPal's amount ≠ our computed total
            P->>S: "PayPal holds X, the published terms add up to Y."<br/>No figures shown until it is resolved.
        else They agree
            P->>S: Due date first, then Across the term / Cost to leave / Charged today<br/>+ "Pay this bill at PayPal" (their page, not ours)
        end
    else PayPal unreachable
        P->>S: computed figures from the biller's published terms<br/>+ "these are not from PayPal's copy — check the amount"
    end
```

---

## 2. A document — the model may only quote

The shopper's own text is the source, so the numbers are *in the text*. The model is not asked what
they mean. It is asked to copy the sentences that state a commitment, and the server throws away
every quotation it cannot find in the text.

```mermaid
sequenceDiagram
    autonumber
    actor S as Shopper
    participant R as /read (browser)
    participant API as POST /api/read
    participant AI as Model
    participant V as Verification + parse

    S->>R: paste the document
    R->>API: { text }
    API->>API: length guard (40 … 20 000 characters)
    API->>AI: tool: record_quotations<br/>{ field, quote }[] + summary<br/>schema has no numeric field
    AI-->>API: spans copied from the text

    API->>V: normalise(document) once
    loop every span offered
        V->>V: is the span really in the text?<br/>(whitespace, dashes, quotes folded)
        alt found
            V->>V: accept
        else not found
            V->>V: discard and count it
        end
    end
    V->>V: parse amount / count / cadence / date out of accepted spans only
    V->>V: build CommitmentTerms → computeCommitment → presentFigures
    API-->>R: figures + the sentence behind each one + rejected count
    R->>S: "Each figure was worked out from the sentence beside it — not by the model."
```

Two rules the diagram is making visible:

- **A quotation is a citation, not a claim.** `document.includes(quote)` is a substring check that
  cannot be talked around. A model that invents `$420.00` produces a span that is not in the text,
  and the span is discarded before anything is read out of it.
- **A figure without a sentence behind it is absent, not estimated.** The total across the term is
  blanked with its own explanation when the document never says how many payments there are.

### 2a. When nothing can be verified — candidate mode

ITD 12. The degraded state shares the verified state's shape: the spans that were used, each beside
what it was used for, with the totals marked absent rather than estimated.

```mermaid
sequenceDiagram
    autonumber
    actor S as Shopper
    participant R as /read
    participant API as POST /api/read
    participant AI as Model
    participant X as Candidate finder

    alt no model configured / endpoint unreachable / the answer was prose, not a tool call
        API->>API: nothing interpreted
    else spans accepted but they do not add up to a commitment
        API->>API: nothing computed
    else no span survived verification
        API->>API: nothing verified
    end
    API->>X: money-shaped spans, dates
    API-->>R: mode "candidates" + a notice
    R->>S: "Nothing was interpreted." (stated before the amounts)<br/>→ the amounts, exactly as written<br/>→ "none of them is a total"
```

A summary the model writes that contains a figure is not one of these cases: the summary alone is
dropped and the verified figures still render, because the spans were checked independently of it.

The notice is in the reading order **before** the amounts, because a shopper who does not notice
they are in the degraded state would read a list of numbers as an answer.

---

## Endpoints involved

| Endpoint | Door | Purpose | Creates anything at PayPal? |
|---|---|---|---|
| `GET /api/commitment/{orderId}?slug=` | Purchase, subscription | Translation + labels, or a degraded answer (`orderId` is the literal `pending` before payment) | No |
| `GET /api/commitment/[orderId]?slug=` | Receipt | The same projection for a settled payment | No |
| `POST /api/paypal/orders` | Purchase | One-time or financed order + approval link | Yes — order |
| `POST /api/paypal/subscriptions` | Subscription | Catalog product, billing plan, subscription | Yes — product, plan, subscription |
| `POST /api/paypal/orders/[id]/capture` | Purchase | Takes the money once the payer approved | Moves money |
| `POST /api/paypal/invoices` | Bill | Draft invoice, sent; returns the payer link | Yes — invoice |
| `GET /bill/[invoiceId]` | Bill | Re-reads the invoice from PayPal and renders it | No |
| `POST /api/read` | Document | Verifies quotations, returns figures or candidates | No — and keeps nothing |

---

## Reading the code

| Step | File |
|---|---|
| Figures | `lib/commitment/compute.ts`, `lib/money.ts` |
| Figure order, labels, arithmetic lines | `lib/commitment/present.ts` |
| The schedule sentence | `lib/commitment/schedule.ts` |
| Model call that writes words | `lib/ai/extract-terms.ts` |
| Refusal of model-written money | `lib/ai/guard.ts` |
| Model call that quotes only | `lib/ai/read-document.ts` |
| Quote verification | `lib/document/normalise.ts` |
| Parsing a span | `lib/document/parse.ts` |
| Spans → terms → figures | `lib/document/read.ts` |
| What can be found without a model | `lib/document/candidates.ts` |
| PayPal invoice create + send | `lib/paypal/invoices.ts` |
| PayPal reads (order, bill, subscription) | `lib/paypal/retrieve.ts` |

The purchase and subscription paths — including what happens when a payment fails — are diagrammed in
`../accessible-commerce-companion/consent-flow.md`, which this document does not repeat.
