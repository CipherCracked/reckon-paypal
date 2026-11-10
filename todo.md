# Todo

## 1. Verify the subscription flow by hand

The subscription return path was fixed on 2026-11-09 (`application_context` with
`return_url` / `cancel_url`, and the consent page now routes a returned
`subscription_id` to `/receipt/{id}`). Tests cover the wiring; no live approval has
been done yet, because that needs a PayPal sandbox **buyer** login.

- [ ] Start the dev server: `npm run dev`
- [ ] Open the coffee subscription (the 12-month recurring product) and click approve
- [ ] Log in on PayPal's sandbox page with a **sandbox buyer** account — not the
      merchant account whose keys are in `.env.local`
- [ ] Approve the subscription
- [ ] Confirm you land on `/receipt/I-...` with the figures, **not** on PayPal's own
      confirmation page

If it fails, the first thing to check is the request body sent to
`POST /v1/billing/subscriptions` — it must carry `application_context.return_url`.

---

## 2. Give it a face

A stranger should understand the product in ten seconds: who it is for, and the
seller's sentence beside the three figures.

- [x] Replace the abstract headline ("Every payment asks you to work something out")
      with what the product does, and one line naming the people it is for — adults
      who find billing language hard (dyscalculia, ADHD, dyslexia)
- [x] Put the transformation on the first screen, above the fold: the seller's own
      sentence on the left, the three figures with their arithmetic on the right,
      and one line saying the figures were worked out from that sentence
- [x] ~~Feature the mattress or the clinic bill, **not** the coffee subscription —
      its cost to leave is $0.00 and demonstrates nothing~~ — **reversed in IPD 21:**
      the coffee subscription stays, because its exit is now `unknown` and the
      figure is read out of "cancel any time, no fee". The $0.00 was the number
      typed in by hand, which was the actual problem.
- [ ] Rename the door labels from abstractions ("A purchase you pay once") to
      real examples ("A 12-month coffee subscription", "A clinic bill for $260")
- [x] Done when: someone who has never seen the repo can say what it does and who it
      is for without scrolling or clicking

## 3. Make the AI demo one click

`/read` is the only place a judge sees AI do what a script could not, and it is an
empty textarea behind a link.

- [x] Add 3–4 sample documents to `lib/catalog/` (a phone contract, a gym
      membership, a payment plan, and one deliberately ambiguous document where the
      reading is refused) — `lib/catalog/examples.ts`; the ambiguous one is a fee
      schedule, which takes the deterministic refusal rather than a model failure
- [x] Add buttons above the textarea: "Try a phone contract", "Try a gym
      membership" — clicking fills the box and submits, no typing
- [x] Cache `/api/read` by text and warm the samples at start-up, reusing the pattern
      already used for exit terms (`lib/commitment/published-exit.ts`,
      `lib/commitment/warm.ts`) — the model takes ~47 s cold
- [x] Lead with what the model did and what the server rejected: sentences quoted,
      spans thrown away, and the sentence behind each figure
- [x] Done when: a judge clicks one button and sees three figures with their source
      sentences in about a second

## 4. Let people act on the number

The product tells you what leaving costs and then sends you to PayPal's website.

- [x] Add `POST /v1/billing/subscriptions/{id}/cancel` in `lib/paypal/subscriptions.ts`
- [x] Add a route under `app/api/paypal/subscriptions/[id]/cancel/route.ts`
- [x] Add a "Cancel at PayPal" button beside the cost-to-leave figure on the receipt,
      with a confirmation step and a plain statement of what PayPal actually did
- [x] Make `CANCELLED` a settled receipt state first (IPD 23 revision) — otherwise the
      act replaces the shopper's record with "nothing has been taken"
- [ ] **Live-check the success path** once §1's buyer approval is done: open the
      receipt for the approved subscription, press cancel twice, and confirm the
      screen says PayPal cancelled it — then reload and confirm the record still
      shows what was paid, with a dated cancelled statement
- [x] Done when: a subscription can be cancelled from this product, and the receipt
      says it was — the video's best beat is "it told me leaving was free, and then
      it let me leave" *(built and tested; the live success path is the line above)*

## 5. Make the controls reach every screen

An accessibility product that offers its reading aids on two of eight screens is
claiming a category while shipping a feature.

- [x] Move the text size into the frame, so it is in the same place everywhere —
      `components/TextSizeControl.tsx`, rendered by `Shell`
- [x] Make the scale actually work: apply it to the document element, which every
      `rem` in `globals.css` follows (the old rule set a container font-size that
      no rem descendant could see, and on `/read` matched no selector at all)
- [x] Split `DisplayControls`: the pacing checkbox belongs with the figures, the
      text size with the frame
- [x] Give read-aloud the same place on every screen that shows figures — inside
      `CommitmentView` (entry, consent, bill, `/read`) and `CommitmentRecord`
      (receipt), always under the figures
- [x] Stop `ReadAloud` returning `null` where the browser cannot speak: it says so
- [x] **Decided, not forgotten:** the shop and the product screen carry the text
      size but **no read-aloud** — they show prose and no figures, so there is
      nothing for that control to speak that a screen reader does not already
      read. Recorded in IPD 24's Built section, and the answer if a reviewer reads
      "no screen opts out silently" as *every* screen. Adding it would mean
      composing spoken copy for a product list, which is not what the control is
      for.
- [ ] **Look at it** at "Largest" on a phone-width window, on the bill: the figures
      must still be legible and the page must not scroll sideways
- [x] Done when: the bill has a working text size and read-aloud

## 6. Open questions

Questions raised during review and deliberately not answered, because changing a
figure without deciding what it means is how a screen starts lying.

- [ ] **Is the mattress origination fee inside the twelve payments or beside
      them?** The seller writes: *"12 payments of $105.00, plus a $60.00
      origination fee."* The screen shows **across the term $1,320.00** and
      **charged today $105.00**, which reconcile one way: 12 × $105.00 =
      $1,260.00, plus the $60.00 fee = $1,320.00. But $1,260.00 is also exactly
      $1,200.00 (the cash price, `itemPrice`) + $60.00, so there is a second
      reading in which the fee is *already inside* the instalments and
      `acrossTerm` counts it twice. The seller's "plus" supports the first
      reading and the numbers support the second; nothing on the page settles it.
      **Deciding it needs** a decision doc, not an edit: which reading the
      catalogue encodes (`installment.fee` semantics), and what `acrossTerm`
      means for a financed plan in general. Until then the screen shows the
      arithmetic it can defend — the instalments it was given, plus the fee it
      was told about — and `lib/commitment/compute.ts` is unchanged.

- [ ] **Does the financed purchase actually finance anything?** The screen promises
      twelve payments, but the order path sends one `CAPTURE` order for today's
      instalment (`app/api/paypal/orders/route.ts:32` only rejects `recurring`). So
      PayPal collects payment one and nothing schedules payments two to twelve. A
      judge who notices will read the twelve-payment figure as staging. Decide whether
      that is an honestly-labelled demonstration, or whether the plan should be created
      at PayPal as a subscription with twelve cycles. This is a decision doc, not an
      edit — it changes what "across the term" is backed by.

## 7. Review findings — judge pass (2026-11-10)

A context-free reviewer scored the entry **as a judge**, with no access to
`context.md` or any decision doc. Estimated **15/25** (`Tech 4 · Design 3.5 ·
Impact 3.5 · Innovation 3 · Presentation 1`). It created a real invoice,
subscription and two orders through the app's own routes, so the integration
findings below are from a live run, not a read.

### 7a. Submission blockers

- [ ] **Add `LICENSE` (MIT) at the repo root**, `"license": "MIT"` in
      `package.json`, and a License section in `README.md`. ~15 min. Rules require an
      open-source licence detectable in the repo's About section.
- [ ] **Publish the repo and set a remote.** `git remote -v` is empty here — no
      public repo exists yet, so the licence has nowhere to be detected.
- [ ] **Put sandbox test credentials in `README.md`** — a buyer email/password that
      can complete an approval, or exact steps to obtain one.
      `docs/judge-brief.html:126` claims they are there; they are not. Without a buyer
      login a judge cannot reach the settled receipt or the cancel button at all.
- [ ] **Screenshots.** `public/` holds only Next's default SVGs — there is no image
      of the product anywhere. Capture: the entry, the receipt with cancel, the
      `/read` result, and "Largest" text. ~1 h.
- [ ] **Video.** Already listed under "After these"; the judge put Presentation at
      **1/5** solely because it does not exist, making it the highest-value item left.

### 7b. Demo-feel defects (the ones costing Design points)

- [ ] **The consent screen is not cached.** `app/api/commitment/[orderId]/route.ts:33-36`
      calls the model for wording on every load; measured **6–12 s on repeat visits**,
      while the exit reading beside it is cached
      (`lib/commitment/published-exit.ts`). Cache `extractTerms` the same way. ~2–3 h.
      This is the product's central moment.
- [ ] **The product page shows no figures.** `components/ProductScreen.tsx` is a copy
      block and a button, so a buyer must click before seeing anything the product is
      for. Render the triad on `app/product/[slug]/page.tsx`. ~3–4 h.
- [ ] **The headphones entry types a `$0.00` exit.** `lib/catalog/products.ts:24`
      hardcodes `exit: { kind: "none" }` while the copy says only "Free returns within
      30 days". Coffee was deliberately made `unknown` for exactly this reason
      (`:40-42`). Either read the sentence or make it `unknown`. ~30 min.

### 7c. Claims that do not survive inspection

- [x] `README.md:89-91` — "the whole system works with no model at all … keeps every
      computed figure". False: cost-to-leave disappears for every `unknown` exit
      (coffee, mattress, both bills). Two of three figures survive, not all.
      **Fixed 2026-11-10:** says which figures survive and that `/read` has no
      model-free reading.
- [x] `docs/judge-brief.html:119` — the same claim, in a stronger form. **Fixed
      2026-11-10**, same wording as above.
- [x] `README.md:117` — "the app never creates them". True only of the three
      `PAYPAL_PRODUCT_*` ids; `ensurePlan` creates a product and a plan on first run
      (`lib/paypal/subscriptions.ts:72-84`). **Fixed 2026-11-10** in `README.md` and
      `env.example`.
- [x] `docs/judge-brief.html:131` — "Screenshots and the demo video live in the
      submission itself". Neither exists. **Fixed 2026-11-10:** says they accompany
      the submission, and that the README carries setup while credentials come with
      the submission.
- [x] `README.md:84` — "all three exercised in the sandbox" is true of the create
      calls only; the cancel **success** path and the receipt record were never run.
      Say which half was verified. **Fixed 2026-11-10:** the cancel request is
      described as checked on its error path only.

### 7d. The judge's own order, if only two days remain

1. Video (~5 h) · 2. `LICENSE` (15 min) · 3. Credentials + an `ACTIVE` subscription id
(1–2 h) · 4. Cache the consent wording (2–3 h) · 5. Figures on the product page
(3–4 h) · 6. Correct the claims (1 h) · 7. Screenshots (1 h).

## 8. The realness problem (2026-11-10, from the user)

> "Nothing is real in the product, everything feels like it was built for demo."

That is accurate, and it is structural, not cosmetic. The product tells the truth
about *where a number came from* while the world it reads from was written by us.
Four layers, worst first:

1. **The world.** `lib/catalog/products.ts` holds three products and
   `lib/catalog/bills.ts` two bills, all authored in code. No merchant has a name
   shown as a merchant, a face, or an image; the shop is three slugs. The only input
   the author did not write is a document a visitor pastes into `/read`.
2. **The front door.** `app/page.tsx:99-163` explains the product's provenance for
   three paragraphs before the visitor has done anything. A product shows you your
   money; it does not narrate its own honesty.
3. **The product page.** `components/ProductScreen.tsx:20-35` is a name, one
   sentence, and a button — no price, no figures, no merchant. It is a mockup of a
   page standing where the product should be.
4. **The commitment.** The mattress claims twelve payments, but
   `app/api/paypal/orders/route.ts:32` sends a single `CAPTURE` order for today's
   instalment and nothing schedules the other eleven. The commitment being explained
   is not the commitment PayPal holds.

- [ ] **Strip the self-explanation from the entry.** One sentence naming the product
      and its readers; provenance belongs in the line under the figures, where it
      already is. File: `app/page.tsx:99-163`.
- [x] ~~Show the three figures on the product page~~ — **superseded: the page is
      deleted** (see 8a).
- [x] ~~Give the sample merchant an identity~~ — **reversed by the user's direction:
      no marketplace, so no merchant to dress.**
- [ ] **Stop calling the mattress "12 payments"** — only applies if one test seller
      keeps a financed sample for the payment demo.

### 8a. Direction chosen (2026-11-10, revised the same day)

**A hybrid: the shop stays, and it is real.** The catalogue comes from **Channel3**,
a hackathon sponsor, so every product, price, image and merchant is real and the
visitor pastes nothing. The product remains a lens for disabled readers and anyone
who finds money language hard.

**Why this is available and why it fits** (verified 2026-11-10):

- Keys for all participants, free, no card, **20,000 credits** — stated on the
  Devpost sponsor page for Channel3.
- `POST https://api.trychannel3.com/v1/search`, header `x-api-key`; returns
  `products[]` with `title`, `description`, `images[]`, and `offers[]` — each offer
  carrying `domain`, `url`, `price { price, compare_at_price, currency }` and
  `availability`.
- **The offers are the honest form of "does this expense make sense":** the same
  product at several real retailers, several real prices. No advice, no profile —
  "this listing is $89.99; the same product is $72.00 at another retailer" is a fact.
- It has **no term or exit data**, so the document reader still owns commitments. A
  retail listing's cost to leave is a merchant policy, not product data; it reads
  *Not stated* unless the description says something the reader can quote.

Screens:

- **`/`** — search real products; the document input stays as the second door.
- **`/shop`** — Channel3 results: real images, prices, merchants. No invented grid.
- **`/product/[id]`** — one real product: the triad, and a "same product elsewhere"
  panel with the real price range and the lowest offer.
- **`/bill/[id]`, `/receipt/[id]`** — unchanged.
- **`lib/catalog/products.ts`** — the invented coffee, headphones and mattress leave
  the catalogue path. The subscription/cancel demo keeps **one test plan** at PayPal,
  labelled as a test seller.

Integrity question — **settled** (was: what does the buy button do on a real listing?):

- A labelled PayPal **sandbox** checkout at the listed price. The button says "Check this
  purchase", the screen says the demo neither sells nor ships the product and that payments run
  in PayPal's sandbox, and the retailer links open the shop's own page. The offer being checked is
  named on the screen ("the cheapest in-stock offer: $179.95 at bhphotovideo.com"), so nothing
  implies we are the seller.

Actionables:

- [x] **Key in `.env.local` as `CHANNEL3_API_KEY=…`** — done 2026-11-10; the search and product
      endpoints both answered 200 against the live API.
- [x] **`lib/market/channel3.ts`** (2026-11-10) — `searchMarket(query)` and
      `readMarketProduct(slug)`, a five-minute cache, `DETAIL_READ_DEADLINE_MS` on the read, no
      vendor SDK. Defensive parsing: an offer without an https link or a USD price that cannot be
      stated to the cent is dropped, never rounded. `cheapestInStock` chooses what a purchase would
      use; `marketTerms` turns that offer into one-time terms with shipping, tax and exit stated as
      absent.
- [x] **`/shop` and `/product/ch3-…`** built from real data, server-rendered (2026-11-10).
      `/shop` is a GET search form with a default query and suggestion links; a failure reads as
      "no key configured" or "could not be reached", never an empty shelf.
- [x] **"Other retailers" panel** — the product page lists every in-stock offer with its price,
      the "was" price where the retailer gives one, and the spread between lowest and highest. The
      shop card says the same in one line.
- [x] **Say what the listing does not contain** — the cost-to-leave figure carries "Channel3 does
      not carry cancellation or return terms for this listing", and shipping/tax rows are omitted
      rather than shown as $0.00 (2026-11-10).
- [x] **README and judge brief** updated to the live catalogue (2026-11-10); Channel3 is named as
      the catalogue the shop reads.
- [x] **Sponsor requirement met** — the shop searches and compares real offers across retailers.
- [x] **`resolveProduct` reads a market slug from the live catalogue only** (2026-11-10) — it never
      falls through to the demo file, and both the consent screen and the order route resolve the
      same slug the same way, so the figure shown and the amount charged come from one read.
- [ ] **Unverified:** the subscription/cancel demo still uses the invented coffee entry; the
      financed mattress is untouched. Channel3 carries neither terms nor a schedule, so these stay
      repository entries until the demo says so plainly.
- [ ] **Shipping and tax for a market purchase** are zero in the terms because the offer does not
      state them. The screen omits the rows (a zero row would claim the seller charges nothing).
      The nullable-tax model is the honest fix and is still open (§9).

The "what this means" panel (unchanged in principle):

- [ ] Term in plain words, monthly equivalent, financing premium against cash, exit as
      a share of the total, auto-renew stated or its absence, cost per use once the
      visitor says how often.
- [ ] **"Compared to what?"** — for a retail listing this is the other offers (real);
      for a document it is a second commitment or a monthly amount the visitor already
      pays.
- [ ] **No score, no "worth it", no recommendation.** The panel arranges the facts so
      the person judges.

Time: Channel3 client + shop + product 5–6 h · offers panel 2 h · panel 2 h · video 5 h.
**Cut line: if the real shop is not live by the end of Nov 11, ship the document-first
lens and spend Nov 12 on the video.**

## 9. Review findings — organizer/sponsor pass (2026-11-10)

A second context-free reviewer, auditing rules and meaningful use. It independently
found the §7a blockers and created live PayPal objects on all three families while
checking (`Orders`, `Subscriptions`, `Invoicing`), so "deep use" is verified, not
asserted. Only new findings are listed here.

- [ ] **The first three minutes after a restart are broken.** `lib/commitment/warm.ts`
      reads four seller texts **sequentially** at boot, each allowed up to 45 s, while
      `MODEL_READ_DEADLINE_MS = 3_000` (`lib/deadline.ts:26`) gives up on the page. So
      `/`, `/bill/…` and `/receipt/…` can render "could not be read" for up to ~3 min
      on a fresh server — which is the first thing a judge sees after a deploy or a
      restart. Measured cold round-trip: **42.8 s**.
- [ ] **The document door has no server-side deadline.** `app/api/read/route.ts` leans
      on 45 s × 3 attempts (`lib/ai/client.ts:16-19, 63-69`); a custom paste returned in
      **over 120 s**. Give it a budget and an honest in-progress answer. The built-in
      examples are warm (0.03 s), so only a stranger's text is exposed.
- [x] **README:103 says "six required" env vars.** Wrong — `PAYPAL_BASE_URL` has a
      default (`lib/paypal/client.ts:17`) and `AI_API_KEY` is optional; four are
      required, the rest optional. **Fixed 2026-11-10:** "nine variables — four
      required, five optional", with `PAYPAL_BASE_URL` and `AI_API_KEY` marked optional.
- [ ] **Fresh-clone test**, the check the rules actually ask for: `npm ci`,
      `env.example` → `.env.local`, `npm run dev`, click all four doors, complete one
      sandbox purchase, open the receipt, cancel. ~1 h.
- [ ] **Sponsor prize: skip — recorded decision, not an omission.** AG Grid, Bryntum and
      Channel3 each contradict a product decision (one-figure-at-a-time, the one-line
      schedule, the intentionally local catalogue); APIMatic would generate an artefact
      the app never uses. The four hours belong to the list above.
- [ ] **Deadline arithmetic.** Nov 12, **5:00 PM EST = Nov 13, 3:30 AM IST**. `CLAUDE.md`
      says 3:00 PM EST, so the safe target is **Nov 12, 3:00 PM EST (1:30 AM IST)** —
      two hours of buffer before the Devpost page must be finished.

## 10. Review findings — target-user pass (2026-11-10)

Third context-free reviewer: no docs, no code until after the judgment, used the app
as an adult with dyscalculia and ADHD. Verdict: **"a thoughtful prototype"** — the
document reader is the most product-like surface in the app; every buying path has a
seam. Only new findings are listed.

**What it praised, for the video:** the entry's seller-sentence-beside-figures, the
fee-schedule refusal ("the amounts as written, no total computed"), and read-aloud
actually working.

### 10a. Numbers that are invented, not read

- [ ] **Tax is typed, not read.** `lib/catalog/products.ts:23` `tax: money(401)`;
      `:36` and `:54` `money(0)`; `lib/document/read.ts:124,163` sets `zeroMoney()` on
      every pasted document. Rendered: "Tax $4.01", "Sales tax $0.00", "Tax $0.00" —
      beside seller copy that never mentions tax. **$0.00 reads as a fact.** With the
      Channel3 catalogue this becomes structural: an offer's shipping and tax are
      absent, so they must read *Not stated*.
      **2026-11-10 — partly fixed:** `CommitmentView` no longer prints a zero part, so
      "Sales tax $0.00" / "Tax $0.00" are gone. Still open: the typed `$4.01` on the
      headphones, and the nullable-tax model change that Channel3 needs.
- [x] **"Nothing here was typed in by hand" is false** — `app/page.tsx:32`, printed
      directly under a figure whose tax was typed. **Fixed 2026-11-10:** the sentence
      now points at the source line instead of claiming nothing was authored.
- [ ] **The clinic bill is manufactured on click and presented as received.**
      `components/BillDoor.tsx:31-44` creates a PayPal invoice when the visitor clicks;
      the home page calls it "A bill you were sent"; the bill page says "the date
      Northside Clinic set on the bill" (`app/bill/[invoiceId]/page.tsx:133`) while
      the app set it (`lib/paypal/invoices.ts:68,81`). **No example disclosure on the
      bill page** — unlike `/read`, which discloses properly.
      **2026-11-10 — partly fixed:** the bill page now says the bill is an example
      created in PayPal's sandbox, and the due date is attributed to PayPal's copy of
      the invoice rather than to the biller. Still open: the home page's "A bill you
      were sent", and saying on the door that clicking creates it.
- [ ] **The model's summary can contradict the figures below it.**
      `lib/ai/extract-terms.ts:69-73` writes free prose with no cache and no
      consistency check; a live response said "free shipping" while the breakdown
      charged **$6.95**. Label it as a summary, and reject a summary that contradicts
      the terms.
- [x] **"Nothing further is charged" is printed to documents that state a term.**
      `lib/document/read.ts` + `lib/commitment/schedule.ts:13`: the reviewer's own
      energy bill said "12-month agreement" and the screen said there was no term to
      run out — a confident, wrong reassurance about the exact thing they came for.
      **Fixed 2026-11-10:** when the document states a payment count or a period but
      no amount per payment, the schedule now says the total is shown as a single
      charge instead of "nothing further is charged" (`document-read.test.ts`).

### 10b. Paths that stall or dead-end

- [x] **The bill page denies the bill it just created.** `lib/deadline.ts:14` gives
      PayPal 2 s; on a second load the page said "PayPal could not show this bill",
      showed no payer link, and offered no retry. Raise to ~8 s, retry once, keep the
      known due date, and always offer the payer link when PayPal has given one.
      **Fixed 2026-11-10:** `DETAIL_READ_DEADLINE_MS = 8_000` for order, subscription
      and invoice reads (2 s kept for reads that decorate a render), and the failure
      branch now offers "Try reading PayPal's copy again". Still open: keep the known
      due date / payer link on failure.
- [ ] **Consent wording cache** — already §7b; this reviewer measured **7–20 s** and
      said they would have hit Back.
- [ ] **The dev "N" badge overlaps "Read this aloud" at 390 px.** Record the demo from
      `next build && next start`, not `npm run dev`.

### 10c. Copy that overclaims

- [x] `app/read/page.tsx:127` — "Every figure shows the sentence it came from."
      Computed figures show arithmetic, not a sentence. Say "the sentence or the
      arithmetic." **Fixed 2026-11-10.**
- [x] `components/ConsentScreen.tsx:304-308` — the sandbox disclosure is the densest
      sentence on the page. Rewrite in plain words; say separately what is real and
      what is an example. **Fixed 2026-11-10:** "This shop is an example, and payments
      run in PayPal's sandbox, so no real money moves."
- [x] `README.md` overclaims in three more places: "Every figure names the source it
      was read from"; "The model may only quote" (the summary is free prose); "Orders
      API v2 creates and captures … financed purchases." **Fixed 2026-11-10** — the
      README now says each figure carries its sentence *or* its arithmetic, that the
      model's one prose output is a guarded summary, and that only the first payment of
      the financed example is charged.

### 10d. The reviewer's one cut

**The financed mattress.** It promises 12 payments, shows $1,320.00, and sends a
single $105.00 order with no schedule for the other eleven. "The one flow I cannot
make honest in two days, and shipping it is worse than not having it." Cross-ref §6
and §8a.

## After these

- [ ] One full day on the video and the Devpost page. Without it the engineering is
      not seen.
- [ ] Deploy to a public URL so a judge can click without cloning or needing keys.
