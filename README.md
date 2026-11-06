# Accessible Commerce Companion

A demo store that states the whole commitment — what is charged today, what it costs across its
term, and what it costs to leave — at the moment a shopper agrees to pay.

Built for the PayPal AI Hackathon 2026. PayPal supplies the money; a language model supplies only
the words.

## What it does

A shopper picks one of three products, each with a different commitment shape:

| Product | Shape |
|---|---|
| Noise-Cancelling Headphones | paid once |
| Coffee Subscription | paid every month for 12 months |
| Mattress — 12 Months | financed over 12 instalments |

Before the payment is taken, the consent screen shows three figures and an itemised breakdown, in
the order that matters most to the decision:

- **Across the term** — every charge the commitment adds up to
- **Cost to leave** — or "Not stated" when the seller has not published one, never `$0.00`
- **Charged today** — what leaves the account now, last because the seller has already made it
  unmissable

Each figure carries the arithmetic that produced it (`12 × $12.00`), so a stranger can check it
without trusting the page.

An optional recognition check shows the amount again and asks only whether it matches what the
shopper expected. It is never a gate; skipping it leaves the payment path untouched.

After a completed payment the shopper can keep a record: `/receipt/{paypal-id}?slug=…` reads the
order or subscription back from PayPal, refuses to render unless it is settled, and offers a calendar
entry for the next charge. Nothing is stored — the record survives because the shopper keeps it and
PayPal holds the agreement.

## How the split works

- **PayPal** is the source of truth for amounts. Orders API v2 creates and captures one-time
  purchases; Subscriptions v1 with Billing Plans carries the recurring product.
- **Deterministic code** does every calculation, in integer minor units (`lib/money.ts`,
  `lib/commitment/compute.ts`). No floating point touches money, and no model is asked for a figure.
- **The language model** reads merchant copy and returns labels and one plain summary. Its response
  schema has no monetary field, and every string it returns is checked for a figure before it can
  reach a screen (`lib/ai/guard.ts`). If extraction fails, the page shows the PayPal amount with a
  plain statement that the terms could not be read.

## Setup

Requirements: Node 20 or newer.

```bash
npm install
cp env.example .env.local   # then fill it in
npm run dev
```

`env.example` lists the five variables:

| Variable | Purpose |
|---|---|
| `PAYPAL_CLIENT_ID` | PayPal REST app client id (server-side) |
| `PAYPAL_CLIENT_SECRET` | PayPal REST app secret (server-side) |
| `PAYPAL_BASE_URL` | `https://api-m.sandbox.paypal.com` for sandbox |
| `NEXT_PUBLIC_PAYPAL_CLIENT_ID` | Public client id for the JS SDK |
| `ANTHROPIC_API_KEY` | Key for term extraction |

Create a sandbox app at <https://developer.paypal.com/dashboard/applications/sandbox>. Only
`NEXT_PUBLIC_PAYPAL_CLIENT_ID` is exposed to the browser; every other value stays server-side.

## Commands

```bash
npm run dev     # start on http://localhost:3000
npm test        # run the Vitest suite
npm run build   # production build
```

## Demo script

See [`docs/demo-script.md`](docs/demo-script.md) for the five screens a three-minute video covers.

## Scope

No accounts, no profiles, no database, no stored session. The demo is USD only. The catalog is a
curated local file (`lib/catalog/products.ts`) behind a replaceable layer.

The check needs only two things: the amount being charged, and the terms the seller publishes. That
is why it fits any checkout rather than this one. At scale it belongs on the payment layer, where it
needs no merchant's cooperation — but it runs today in an ordinary store, on any order total.

