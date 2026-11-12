# IPD 39 — What the Shopper Waits For

**Status:** Decided (2026-11-12)
**Date:** 2026-11-12
**Answers:** Problem tree Q4 of `../intro.md` — *when is a listing read, and what does the shopper see while it is?*
**Serves:** R1 in `todo.md` §19; IPD 37 (the shape is read, not looked up); the finding that nothing on a screen shows the AI working (`context.md`, 2026-11-11).

---

## Problem to solve

Once the shape of a listing comes from reading it (IPD 37), the product's central figure depends on a model call. Measured on the current free endpoint: roughly 47 seconds for one short description. Until now that cost was hidden because only four listings ever needed a reading, and those four are read at server start (`instrumentation.ts` → `lib/commitment/warm.ts`). Every other listing was answered instantly and wrongly.

After this work, a person can open any product in the catalogue, and on the first visit its reading is cold. The page currently resolves the product in one go: title, photograph, price, the three figures, the button that starts agreeing. If the reading happens inside that, the whole page — including the catalogue's answer, which arrives in a few hundred milliseconds — waits most of a minute behind a model. If it happens outside it, the screen has to describe a state it has no word for yet.

There is a second thing at stake, which the owner named: no screen in this product shows the AI doing something a script could not. The reading has been real, load-bearing, and invisible — its best state is a refusal, which no visitor can produce on demand. Whatever is decided here decides whether the one moment AI works in front of a shopper is hidden or shown.

## Options

### Option 1 — **The page opens with what the catalogue already answered; the commitment panel says the seller's words are being read, and fills in when they land**

The title, the brand, the photograph, the price and the offers render as soon as the catalogue answers. Where the figures go, the page says what it is doing and whose words it is reading — *reading this listing's words for its term* — and the commitment appears in that place when the reading returns. The wait is bounded, it is named, and it ends in a figure or in a stated failure.

*How it feels:* a person clicks a product and sees the product. The commitment is underneath, arriving a moment later, with a sentence that says where it came from. On a listing that has been read before, there is no wait at all — the cache answers. On the first visit to a listing, the wait is the only visible sign that a model is involved, and it is the honest one: the product is reading.

### Option 2 — The page waits with nothing on the screen

The `/read` shape: the route holds the request until the reading is done, then renders everything at once. The visitor sees a blank page or a browser spinner.

*How it feels:* 47 seconds of nothing, on a page whose photograph, price and title were already answered. It also throws away the one part of the page that could have reassured a person the site is working.

### Option 3 — Read only when the shopper asks

The page renders as it does today, with the price and a control: *read this listing's terms*. The figures appear after the person asks for them.

*How it feels:* the product's central question sits behind a button, on a page whose promise is that the commitment is translated before you agree. This is the shape the entry already had for the document reader, and it was criticised for exactly this: a visitor will not spend most of a minute to find out whether the product is worth most of a minute.

### Option 4 — Read ahead, so nobody waits

Warm the listings a shopper is likely to open: the shop's first page of tiles, a browsed category's first thirty, the results of a search.

*How it feels:* instant everywhere, and impossible. Thirty tiles at roughly 47 seconds each is twenty-four minutes of model time per page view, against a free endpoint that has already been measured to serialise requests. The warm-up would still be reading yesterday's visit when today's arrives.

## Reasoning

The deciding factor is **what the wait is hiding**. Option 2 hides the catalogue's already-known answer behind a model's slow one; Option 3 hides the model's answer behind a decision the shopper has to make first; Option 4 pretends the model is not there. Option 1 is the only one where the wait stands for the work actually being done, and the work is the product. A shopper who waits 47 seconds and then sees *"6-Month Subscription"* quoted under a total knows what their minute bought.

The second factor is **which of these shows the AI**. This product's verification discipline is the thing a judge or a careful visitor finds remarkable — the model is only allowed to point, and the server checks — and until now no screen has shown it happening. A panel that says *reading the seller's words* and then produces a quotation with the merchant's sentence under the arithmetic is the shortest demonstration the product has: it shows the input, the act and the result on one page, without a single word of explanation.

The third factor is that **the wait is a first-visit cost only**. The reading is remembered for ten minutes and shared with anyone else reading the same text, and the four fixture listings are read at server start. The entry, the demo's most-seen screens and any product opened twice are instant.

## Tradeoffs

- **Nearly a minute is a long time for this audience.** Adults with ADHD and dyslexia are the people least served by a page that changes under them, and the commitment is the part they came for. The fallback must say what is happening and must not be a spinner, and the page must not shift the price or the title when the figures arrive.
- **The product now depends on a free endpoint for its main path.** The reading is the shape of the listing; if the endpoint is down, the page cannot say what the listing is. Today it says something definite and unverified, which is worse in principle and more robust in a demo.
- **A demo click on a random shop product shows the wait.** The video has to either use a warmed listing or make the wait an asset — which it can, because the wait is the AI working.
- **Two visitors to the same unread listing share one reading** (the existing single-flight behaviour), so a popular product is read once. A listing nobody opens is never read, which is the point of doing it here rather than on the shop.
- **The shop stays dumb.** Nothing about a tile's shape is read on the shop page, so browsing costs no model time and the shelf cannot be built on this decision (IPD 40).

## Notes

- **The wait belongs to the product page, not to resolution in general.** The consent route, orders, subscriptions and the receipt must never wait for a model on a request that is about to move money; they read what is remembered and say so when nothing is (ITD 34, ITD 35).
- **The ceiling is the page's, not a render's.** `MODEL_READ_DEADLINE_MS` (3 s) exists for a figure that decorates a render; this read is the page's subject, so it gets the answer budget `/read` already has (`MODEL_ANSWER_DEADLINE_MS`, 60 s). What the page does when that also expires is IPD 40's fourth state.
- **The first figure is what makes the wait worth it.** A listing whose term is read but not schedulable (IPD 38) arrives from the same wait with a sentence instead of a total. That is a worse screen and a true one; the alternative was a total nobody could compute.
- **Measure the endpoint again before the video.** 47 seconds is the recorded figure on one free endpoint at one moment. If the endpoint's speed changes, this decision's cost changes with it, and the streaming shape is what makes that visible rather than surprising.
