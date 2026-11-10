# Accessible Commerce Companion

Shows what a commitment actually costs — what is charged today, what it adds up to across its term,
and what it costs to leave — before a shopper agrees to it.

Built for the PayPal AI Hackathon 2026. PayPal supplies the money; a language model supplies only
the words.

**The one-page brief** — what it does, where the numbers come from, what it refuses, and what is
not real — is [`docs/judge-brief.html`](docs/judge-brief.html). Open it directly; it has no build
step and no dependencies.

## What it does

The home page is the question, not a catalogue: **what are you being asked to pay?** It works one
real commitment through in full — the three figures and the arithmetic behind them, before anything
is clicked — and offers the other three ways in at a second rank.

| Door | Commitment shape | What clicking it does |
|---|---|---|
| **A purchase** | paid once | three figures, then PayPal's own approval page, then capture on return |
| **A subscription** | paid every month for a year | three figures, then the subscription's approval page |
| **A bill** | owed by a date | **creates a real PayPal invoice**, then opens the bill page, which re-reads it from PayPal |
| **A document** | whatever someone sent you | paste the text; three figures, each beside the sentence or arithmetic it came from |

The shop (`/shop`) is the way in to real products: a search over a live catalogue, with each
listing's real price, its retailers and the spread between their offers. The demo entries above
still exist for the commitment shapes the catalogue cannot supply — a repeating term, a bill owed by
a date, and a pasted document.

Before the payment is taken, every path shows the same three figures, in the order that matters most
to the decision:

- **Across the term** — every charge the commitment adds up to
- **Cost to leave** — or "Not stated" when the seller published none, never `$0.00`
- **Charged today** — what leaves the account now, last because the seller has already made it
  unmissable

Each figure carries the arithmetic that produced it (`12 × $12.00`), so a stranger can check it
without trusting the page.

Three more things sit on the same screen:

- **A schedule line** — how many payments there are, what each one is, and *"what happens if a
  payment is missed is not stated on this screen"* when the document or seller never says.
- **An optional recognition check** — shows the amount again and asks only whether it matches what
  the shopper expected. Never a gate; skipping it leaves the payment path untouched.
- **Reader-owned controls** — text size, one figure at a time, and read-aloud using the browser's
  own speech synthesis. The text size lives in the frame, so it is in the same place on every
  screen and scales the whole document; read-aloud sits under the figures on every screen that has
  them. There is no "accessibility mode" to select, and nothing is inferred.

After a completed payment the shopper can keep a record: `/receipt/{paypal-id}?slug=…` reads the
order or subscription back from PayPal, refuses to render unless it is settled, and offers a calendar
entry for the next charge. Nothing is stored — the record survives because the shopper keeps it and
PayPal holds the agreement.

On a subscription PayPal still reports as active, the cost-to-leave figure carries a verb: **Cancel
this subscription**. It asks once — naming the agreement and saying it cannot be undone here — and
then calls PayPal's own cancel endpoint. The screen reports PayPal's answer and nothing more:
*cancelled*, *not running* (PayPal's words), or *we cannot tell whether that went through — check
PayPal*. A failed request is never shown as a cancellation. A subscription PayPal reports as
cancelled still produces its record, with what was paid and a dated statement of where it stands.

## Why the numbers can be trusted

1. **Every figure shows what it was worked out from.** Where a product has a PayPal id configured,
   the price and the term come from the billing plan PayPal holds; otherwise they come from the
   published terms in `lib/catalog/` — and the screen says which, on the screen, every time. Each
   figure carries either the seller's sentence it was read out of or the arithmetic that produced
   it. A source that cannot answer (no plan, no fixed price, no end to the term) is a fallback with
   its own label, never a blank and never a guess.
2. **Our code does every calculation**, in integer minor units (`lib/money.ts`,
   `lib/commitment/compute.ts`). No floating point touches money and no model is asked for a figure.
3. **The model never supplies a figure.** Its extraction schema has no monetary field, and every
   span it returns for a pasted document must appear literally in the shopper's text; anything else
   is discarded and counted, and the count is shown. Its one free-prose output is a plain-language
   summary, which cannot change a figure and is refused if it writes a figure-shaped string
   (`lib/ai/guard.ts`).
4. **An absence is stated as an absence.** A term the seller never published is "Not stated"; a
   total the document cannot support is blanked with its reason. Nothing is estimated, and no note
   contradicts the figure above it.

## How it is built

- **PayPal** is where the money moves, and the only place it moves. Orders API v2 creates and
  captures the one-time purchase and the first payment of the financed example — the remaining
  eleven payments are not scheduled at PayPal, and the checkout charges only what is due today.
  Subscriptions v1 with Billing Plans carries the recurring product and, where a product id is
  configured, holds the price and term the screen reads; Invoicing v2 creates and sends the bill.
  All three have been exercised in the sandbox on their create, read and capture/approve paths; the
  subscription **cancel** request has been checked on its error path only, because its success path
  needs a buyer-approved subscription.
- **Deterministic code** does the arithmetic and the projection to the screen.
- **The language model** reads merchant copy and documents and returns labels, one plain summary,
  or quotations. `lib/ai/guard.ts` rejects any figure-shaped string it writes.

The whole system works with no model at all, and says so: every figure the code computes is
unchanged, the cost to leave is absent wherever the seller never published it, and the screen says
the plain-language summary is missing. `/read` has no model-free reading, so it lists the amounts
found in the document and states that none of them was interpreted.

## Setup

Requirements: Node 20 or newer.

```bash
npm install
cp env.example .env.local   # then fill it in
npm run dev
```

`env.example` lists ten variables — four required, six optional:

| Variable | Purpose |
|---|---|
| `PAYPAL_CLIENT_ID` | PayPal REST app client id (server-side) |
| `PAYPAL_CLIENT_SECRET` | PayPal REST app secret (server-side) |
| `PAYPAL_BASE_URL` | Optional. Defaults to `https://api-m.sandbox.paypal.com` |
| `AI_BASE_URL` | Base URL of an endpoint serving `POST {AI_BASE_URL}/chat/completions` |
| `AI_MODEL` | Model id to ask for |
| `AI_API_KEY` | Optional. Bearer token; omit it for a model on this machine |
| `PAYPAL_PRODUCT_COFFEE_SUBSCRIPTION` | Optional. A catalog product id whose billing plan holds the price and term |
| `PAYPAL_PRODUCT_HEADPHONES` | Optional. Same, for the one-time product |
| `PAYPAL_PRODUCT_MATTRESS` | Optional. Same, for the financed product |
| `CHANNEL3_API_KEY` | Optional. Server-side key for the live product catalogue behind `/shop` |

The three `PAYPAL_PRODUCT_*` ids are empty by default. With them set, the consent screen reads the
price and term from the plan and says so; with them empty it computes from the published terms in
`lib/catalog/` and says that instead. Starting a subscription creates its product and billing plan
at PayPal on first use and reuses them afterwards (`lib/paypal/subscriptions.ts`); the purchases and
bills create their own PayPal objects as they are used.

Create a sandbox app at <https://developer.paypal.com/dashboard/applications/sandbox>. Every value
above stays server-side — the app loads no PayPal client script into the page, so there is no public
key to expose.

**No provider is named in the configuration.** The endpoint, the key and the model id are three
environment variables and nothing else. One dependency in `package.json` carries a vendor's name on
its import (`lib/ai/client.ts`), and it is there for what an SDK is for — retries, timeouts, error
classes — not for deciding what the model may say. The one thing the endpoint must support is
function calling with a forced tool choice — the whole design rests on the model pointing at spans
rather than writing prose. That format is common enough that the app runs unchanged against a hosted
model, an aggregator, a proxy, or a daemon on the same laptop; switching is three environment
variables. `AI_BASE_URL` must include the provider's version path as it publishes it (for example
`https://your-provider.example/v1`); the app appends only `/chat/completions`.
`lib/ai/client.ts` is the only file that knows what a request looks like on the wire.

The endpoint is reached with the **reference client for that format**, not with hand-rolled HTTP:
retries with backoff, `Retry-After`, timeouts and an error taxonomy are the client's job, and
reimplementing them would be the one piece of this stack with nothing of ours in it. What the client
does *not* do is decide what the model may say — the schemas, the guards and the span verification
are ours, and they hold whatever the transport does.

If your provider does not serve that shape, put a gateway in front of it — that is the ordinary
deployment pattern, and it costs one line of configuration:

```
AI_BASE_URL=https://your-gateway.example/v1
```

## Commands

```bash
npm run dev          # start on http://localhost:3000
npm test             # run the Vitest suite
npm run lint         # eslint
npm run check-model  # send one document to the configured model and report what came back
npm run comparison   # regenerate docs/accessible-commerce-companion/comparison.md
npm run build        # production build
```

`npm run check-model` is the fastest way to tell a bad key from a bad document: it prints the
endpoint and model id, sends a two-line bill, and says whether a tool call came back. It never
prints the key.

`npm run comparison` rewrites
[`docs/accessible-commerce-companion/comparison.md`](docs/accessible-commerce-companion/comparison.md)
from the same functions the consent screen runs — the seller's copy beside the figures the shopper
reads, for every product. The suite fails if the committed file and the code disagree, so the
document cannot drift from the behaviour it describes.

## Demo script

See [`docs/demo-script.md`](docs/demo-script.md) for the screens a three-minute video covers.

## Scope and limits

No accounts, no profiles, no database, no stored session. The demo is USD only. The shop searches a
live product catalogue (Channel3); the three demo entries remain in `lib/catalog/` for the
commitment shapes the catalogue does not carry, and every screen says which source answered.
Documents are pasted as text — there is no PDF parsing — and a third-party bill is read, never paid.

The check needs only two things: the amount being charged, and the terms the seller publishes. That
is why it fits any checkout rather than this one. At scale it belongs on the payment layer, where it
needs no merchant's cooperation — but it runs today in an ordinary store, on any order total, and on
a bill that has already been issued.
