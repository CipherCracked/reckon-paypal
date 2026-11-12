## Inspiration

A subscription that costs "$24.99" is a sentence with a hole in it. The number the shop shows you is one charge. The number that matters is what it takes across six months, and what it costs to stop — and both arrive as arithmetic at the exact moment you are least able to do arithmetic.

For adults with dyscalculia, that is not an inconvenience, it is a wall disguised as a checkout page. ADHD makes a term-length condition in paragraph four easy to skip. Millions of adults read fluently and still cannot hold a monthly figure in their head long enough to compare it. Every product on the market solves this with a text-size setting.

Reckon is built on a different premise: the problem is not that the numbers are too small, it is that nobody has translated the agreement. So the product translates it — into the three figures people actually need — and then shows, for every one of those figures, the sentence it came from.

## What it does

There are two doors, and they lead to the same screen.

**A listing.** Reckon's shop browses a live retail catalogue of millions of products — categories, price bands, search, and any product URL you paste. Open a listing and Reckon reads the seller's own words to find out how long the agreement runs. Not a category, not a badge: the sentences. *"6-Month BarkBox plan"* becomes six monthly charges. *"Monthly box, cancel anytime"* becomes a charge with no end, and the page says so rather than inventing a total. A two-year protection plan and a monthly wall calendar are refused, because a warranty is not a schedule and a calendar is not a bill.

**A document.** Paste any contract, membership or invoice — Reckon reads it and returns the same three figures with the sentence behind each one. Where the model misreads, the page shows you the sentence it tried to quote and that it was not in your text.

Then, on either screen: **charged today**, **across the term**, **cost to leave** — each one attached to its evidence, each absent figure named as "not stated" rather than filled with a guess. A shopper is asked whether the figures match what they understood, and approves the payment in place with PayPal's own button.

PayPal then keeps speaking. Once you have a record with the store, Reckon re-reads PayPal itself: *"Taken so far $24.99 — 1 of 6 payments."* That line is PayPal's arithmetic, not the store's memory, and the model's plain sentence sits beneath it, written only from facts PayPal just returned.

## How we built it

Next.js 15 and React 19, TypeScript strict, money handled as integer minor units end to end so no total is ever a floating-point guess.

**PayPal, meaningfully, on both sides of the transaction.** Orders v2 creates and captures one-time payments. Subscriptions v1 with Billing Plans carries the repeating and financed shapes, including `total_cycles`, a setup fee for what is owed on day one, and a failure threshold. Invoicing v2 covers billed documents. Identity (Log in with PayPal) lets a person see every agreement the store holds for them. The per-agreement transactions endpoint is the authority on what has actually been taken — we tried the Reporting API first and it answers 403 with these credentials, so the honest source is the one we kept. The checkout itself is `@paypal/react-paypal-js` in-page, with our own server still creating every agreement: the browser never decides an amount.

**Channel3** supplies the shop: browse by the catalogue's own sixteen root categories, price bands, search, product lookup from a pasted link, offers, and a subscriptions shelf that reads listing text to find products that charge again — 22 live tiles on the day we checked, every one a product that repeats.

**The AI is deliberately narrow, and that is the point.** The model's only job is to copy spans out of text it was given. The server then checks each span literally against that text. Anything the model writes that the server did not compute itself — any currency figure, any count — is refused before it reaches a screen, and the record's one model sentence is gated by a numeral allow-list built from PayPal's own response. The model is configured by environment variable rather than by code, so it is a setting, not a dependency.

711 tests, `tsc` clean, lint clean, MIT licensed.

## Challenges we ran into

**Teaching a reader the difference between a period and a promise.** "3 Year Protection Plan", "Monthly Wall Calendar" and "12 months, billed quarterly" all look like schedules and none of them are one. The reader now requires both a duration and an agreement word, refuses coverage and publication words first, and reports a stated cadence that disagrees with the term as unschedulable rather than overstating the bill three times over.

**Making the model's failures visible instead of hiding them.** Most products in this space ask you to trust the model. We made the model's refusals a feature — a sentence it tried to quote, shown verbatim, with the reason it was rejected. Producing that state on demand took a PDF whose line breaks split three words: the model joins them, the joined sentence is not in the document, and the check refuses it every time.

**Latency as a design material.** A cold read takes seconds. That meant a deadline on every model path, a warm-up at start-up, a cache keyed by the text itself so an edited listing can never be quoted stale, and a page that streams the catalogue's half immediately while the reading arrives.

**Privacy by construction.** PayPal payer names and emails are dropped by type before anything is summed, logged or cached. Payer identity never reaches a screen.

## Accomplishments that we're proud of

A stranger can open one listing, with no account and no sign-up, and understand a commitment in under a minute — and then see exactly where each figure came from.

The verification chain is the part we would show a judge first. The AI is load-bearing, the checks are visible, and a screen exists whose entire job is to show the model being wrong.

The record screen states what PayPal has taken, computed from PayPal's own transactions, with a sentence written over those facts and nothing else.

The checkout is one press, in place, with the figure above the button, and the confirmation comes from re-reading PayPal rather than from trusting a client callback.

## What we learned

A "not stated" state is a feature, not a hole. Deciding what the product refuses to say turned out to be most of the product.

Trust boundaries are architectural. Never trust the model to state a figure, never trust the browser to state an amount, never trust a callback to state a settlement — each of those became a rule in code, not a note in a document.

And accessibility is not a layer on top of a product. The figures being monospaced, the text size being adjustable, the pacing of a decision being the shopper's — those changed the data model, not the stylesheet.

## What's next for Reckon

Four things, in order of what we would build next.

**PayPal telling the app something, unprompted.** Today Reckon asks; a signature-verified webhook endpoint should let `BILLING.SUBSCRIPTION.PAYMENT.FAILED` arrive and change the record while it is open. Keeping only the subscription id, event type and timestamp in a bounded in-memory map would keep the product's promise that nothing is written to a database.

**A document you can interrogate.** Right now Reckon answers three fixed questions. The audience has follow-ups: *"Can I cancel in month 3?"*, *"What happens if I miss a payment?"* The same discipline applies — an answer built only from a span that verifies literally, or the word *not stated* — which turns extraction into an interface without loosening the guarantee.

**AG Grid over a person's whole record.** A single agreement is three figures. A person's actual situation is a dozen agreements across two years: which are still charging, what each costs per month, what leaving all of them would cost. That is a sortable, filterable table with each figure traceable to its source — and AG Grid is the right tool for a grid that has to stay legible under a screen reader and a large text size.

**And the unglamorous part:** a real deployment, so judges can open it without a terminal.
