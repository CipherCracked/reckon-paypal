# Todo

## 1. Verify the subscription flow by hand

The subscription return path was fixed on 2026-11-09 (`application_context` with
`return_url` / `cancel_url`, and the consent page now routes a returned
`subscription_id` to `/receipt/{id}`). Tests cover the wiring; no live approval has
been done yet, because that needs a PayPal sandbox **buyer** login.

**Driven end to end with a browser on 2026-11-11.** It found two things.

- [x] The entry point is `/product/ch3-YyLUjLT` (or any of the other three curated
      ids) — the coffee subscription named below was deleted when the live listings
      landed. **Check this commitment** → consent screen → **Approve subscription
      with PayPal** reaches PayPal.
- [x] **Defect, fixed 2026-11-11.** The first run failed at PayPal with
      `INVALID_STRING_MAX_LENGTH`: the route sent the seller's copy as the catalog
      product description (cap 256; BARK six-month is 338, Detox Box 442). A listing
      now sends no description, and `ensurePlan` clamps with the cut marked. Covered
      by three tests in `tests/subscriptions.test.ts`.
- [x] **Blocked: the first sandbox buyer supplied is an India account.** PayPal
      refused it with `UNSUPPORTED_PAYEE_CURRENCY` — "this seller doesn't accept
      payments in your currency" — because the merchant charges USD. **Resolved
      2026-11-11** with a US personal account (`sb-br9fh53843654@…`, in the README);
      its settings page reads `(GMT-05:00) Eastern Time (New York)`.
- [x] With a US buyer: approved on 2026-11-11 and landed on
      `/receipt/I-GPD3KPT15D79` — this app's record, not PayPal's confirmation page.
      *Next charge 11 December 2026 — $24.99 · Across the term $149.94 · Cost to
      leave Not stated · Charged today $24.99*, which is 6 × $24.99 of arithmetic
      the screen did over PayPal's plan.
- [x] With a live subscription: **Cancel this subscription** pressed on two
      sandbox subscriptions — see §4.

If it fails, the first thing to check is the request body sent to
`POST /v1/billing/subscriptions` — it must carry `application_context.return_url`.

---

## 1a. The way in, and the look (IPD 27, ITD 24 — 2026-11-11)
Raised by the user after seeing the live run: the sign-in was a sentence at the
foot of the entry, and the product looked like the browser's default page.

- [x] **The way in moved to the frame.** The header carries one control beside the
      text-size control on every screen — *Sign in* when signed out, *Your
      commitments* when signed in — and renders it only where signing in can work
      (`identityConfigured() && signInConfigured()`). The root layout parses the
      session cookie, so the label is right at first paint rather than flipping
      once a client catches up.
- [x] **The account page became a destination, not a detour.** "Back to the ways
      in" removed; signed out it opens with what signing in reads, shows and keeps
      and then one button; signed in it opens with the account, a live *Sign out*
      in the page bar, and the rows. The home page's buried *"Already agreed to
      something here?"* link is gone — one placement, not two.
- [x] **The look is a ledger.** Atkinson Hyperlegible for text (drawn by the Braille
      Institute for low vision, which is the audience), IBM Plex Mono with
      `tabular-nums` for every amount, near-black ink on paper, one deep-green
      accent used only for actions and the live state, `4px`/`2px` edges instead of
      pills. Both faces are self-hosted at build by `next/font`; no runtime request
      to a font host.
- [x] **The entry reads as a pair.** The seller's words sit in their own panel with
      the sentence that explains them, and the next step ("Check this commitment")
      is under it; the figures keep the card opposite. Three doors in one row.
- [x] Verified in a browser at 1280 and 390 wide, light and dark: no horizontal
      overflow, figures in the mono face on the entry, the product screen,
      `/account` and the receipt. Suite 436 → 439 (three frame tests).
- [x] **A sign-in now starts on the address PayPal has registered.** The live
      failure was `invalid client_id or redirect_uri`: the browser was on
      `localhost:3001`, the app asked PayPal to return to
      `localhost:3001/auth/paypal/callback`, and the dashboard had only accepted
      `127.0.0.1`. `signInOrigin` (`lib/origin.ts`) answers with the registered
      spelling and `signInHop` sends a `localhost` visitor there before the flow
      starts — same port, or it refuses to hop at all, so a misconfigured origin
      cannot become a redirect loop. `PAYPAL_RETURN_ORIGIN` overrides it for a
      deployment. Verified by curl: `localhost:3001/auth/paypal/start` →
      `127.0.0.1:3001/auth/paypal/start` → PayPal with
      `redirect_uri=http%3A%2F%2F127.0.0.1%3A3001%2Fauth%2Fpaypal%2Fcallback`.
      Suite 439 → 445.
- [ ] The header wraps to a second line between roughly 620px and 780px, where the
      service name and both controls no longer fit on one. It stays right-aligned
      and readable; it is not elegant.
- [ ] Receipt still has no "Lost this link? Sign in" line (§13).

### The coherence audit (2026-11-11)

The user rejected "no login wall" and said the disjointness was wider than
sign-in. A read-only audit agent went over every route. Its verdict, in short:
the wall is not the fix, but they are right that the product has no spine.
**All six were built the same day — IPD 28 (`docs/joined-up-product/ipds/where-the-record-lives.md`) and ITD 25 (`.../itds/one-page-one-set-of-figures.md`), suite 445 → 449, verified by screenshot at 1280 and 390 and by a real sign-in on the live `:3001`.**

- [x] **One home in two states.** `/` signed out = the worked commitment, then a
      sign-in card, then search. `/` signed in = your commitments, then search,
      with one line back to the worked example. `/account` becomes the sign-in
      screen only and redirects signed-in visitors to `/`. (`components/RecordHome.tsx`; `app/page.tsx#Home` awaits the branch so the whole tree comes back from the page.)
- [x] **One `Page` primitive.** `.page` + back link + `.page-header` is copy-pasted
      into every route, which is why header rhythm and back-link wording differ.
      (`components/Page.tsx`, used by `/`, `/account`, `/shop`, `/read`, product, consent, bill, receipt.)
- [x] **One `Figures` primitive.** The same three figures are rendered three ways
      (`CommitmentView`, `CommitmentRecord`, `account/page.tsx`); the receipt's grid
      also buries "Next charge" as a fourth tile. (`components/FigureGrid.tsx`, full and compact; the next charge is now a standing line, not a tile.)
- [x] **The record list cannot open the record.** No row on `/account` links to
      `/receipt/{id}`. The receipt is also a dead end: its only exits are `/read`
      and `/shop`. (`components/CommitmentRow.tsx` links *Open the record*; `components/ExitNav.tsx` puts three ways on at the end of every record.)
- [x] **The frame has no navigation.** `/shop` and `/read` are reachable only by a
      body link on `/`; on a phone the header is ~187px of text-size chips. (`Shell` nav = Shop + Read a document; the text-size control is a disclosure; the account control is the action — `/auth/paypal/start` signed out, a POST sign-out signed in — which fixes the reported dead control on `/account`.)
- [x] **Cut the "other ways money is asked of you" tour** and the invented
      headphones door; demote the bill to a line. Search is the real way in. (The bill is now a line on `/read`; its two tests moved to `tests/read-page.test.tsx`.)

**Still open from this pass:** the receipt with no live subscription was checked only on a cancelled `I-GPD3KPT15D79` — an **active** one is still the user's to approve before the video. `/account` keeps the frame's sign-in beside the card's, deliberately: both work, one is the frame's affordance.

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
- [x] **Live-check the success path** — done 2026-11-11 on `I-GPD3KPT15D79`: the
      warning named the agreement, the second press cancelled it at PayPal, and the
      screen said *"PayPal says this subscription is cancelled. It will take no
      further payments for it."* A reload shows what was paid, the dated cancelled
      statement, and *Next charge: None*.
      **Two defects the live run found, both fixed the same day:** the record still
      said *Next charge 11 December 2026* three lines under "no further payments",
      because the figures had been read before the cancel (the component now asks
      the server to read them again, on PayPal's answer only); and a cancelled
      record still offered *Add the next charge to your calendar* for a date PayPal
      will never charge (the link now follows the same rule as the figure).
      Re-verified live on `I-FF7143BHYSD3`: after the cancel, without a reload, the
      figure became *None — PayPal reports this subscription as cancelled* and the
      calendar link disappeared.
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

- [x] **Is the mattress origination fee inside the twelve payments or beside
      them?** The seller writes: *"12 payments of $105.00, plus a $60.00
      origination fee."* The screen showed **across the term $1,320.00** and
      **charged today $105.00**. **Settled 2026-11-10 by deciding what PayPal
      charges**: the fee is the plan's `setup_fee`, taken once at activation on
      top of the first instalment, so it is beside the twelve payments — in
      today's charge ($165.00) and in the term total exactly once ($1,320.00).
      The catalogue encodes it as `terms.openingFee`; the itemisation has a
      "Fee taken once" row so the parts still sum to the figure above them.
      Reasoning and rejection of the alternatives: ITD 2 in
      `docs/accessible-commerce-companion/itds/paypal-integration.md`.

- [x] **Does the financed purchase actually finance anything?** It did not: the
      order path sent one `CAPTURE` order for today's instalment, so nothing
      scheduled payments two to twelve. **Fixed 2026-11-10** — a financed
      purchase is now a PayPal billing plan (twelve `REGULAR` cycles at the
      instalment amount plus a `setup_fee`), the order route refuses anything
      that is not paid once, and the receipt reads the schedule back from
      PayPal. Verified live in the sandbox: plan `P-3E837483AP118242UNLZRRNQ`,
      12 × $105.00 monthly, `setup_fee` $60.00. Decision: ITD 2,
      `docs/accessible-commerce-companion/itds/paypal-integration.md`.

**Two things the plan deliberately does not do (raised 2026-11-10).**

- [ ] **Ending an instalment plan is not offered.** The receipt shows a cancel
      button for a repeating subscription but not for a financed one, because
      what ending it mid-term costs the payer is stated nowhere and the screen
      does not invent it. **Deliberate gap, not an oversight** — but it is the
      asymmetry a shopper would notice ("I can stop the coffee, I cannot stop the
      mattress"). Fixing it means either stating what PayPal does when a 12-cycle
      plan is cancelled (a fact we can check in the sandbox), or offering the
      button and reporting PayPal's answer as we do for a subscription.
      Cross-ref §6a and ITD 2's TRADEOFFS.

- [ ] **Full activation of the financed plan is unverified.** The plan exists and
      reads back correctly (12 cycles, `setup_fee`, monthly), but no payment has
      been taken from it: the shopper never approves at PayPal, so the $165.00
      charged today has never actually left the sandbox account, and the receipt
      has never shown a settled instalment. **Needs the sandbox buyer click** —
      the same blocker as §1, §4 and the cancel success path. User-owned.

## 6a. Honest instead of fixed (2026-11-10)

The pattern the user named: when the product cannot show something, it adds a
sentence explaining why — which is truthful and still leaves the shopper with
nothing. Each item below is an absence that is **ours**, not the source's.

- [x] **Cost to leave on a real listing said "Not stated".** Every product in the
      live shop carried an empty third figure plus *"Channel3 does not carry
      cancellation or return terms for this listing"* — a sentence about the data
      vendor, in a shopper's face. The figure was never actually unknown: a listing
      is paid once, so there is no continuing agreement to leave, which is what the
      demo product of the same shape has always shown ($0.00). `marketTerms` now
      returns `exit: { kind: "none" }` and the note answers the figure — *"Paid
      once, so there is nothing to cancel. A return is a different question, and
      this listing does not state its terms."* **Fixed 2026-11-10**; verified on
      `/api/commitment/pending?slug=ch3-jOFatvj` (exit `0`, both totals still floors).

- [x] **"What happens if a payment is missed is not stated on this screen."** For
      the demo catalogue this was no longer true: we create the plan, so
      `payment_preferences` says it. `CommitmentTerms` now carries
      `failure: { suspendAfter }`, `termsFromPlan` reads it back off
      `payment_preferences.payment_failure_threshold`, both catalogue entries state
      it, and the schedule prints *"If a payment does not go through, PayPal
      suspends the plan after one failed payment."* The number is one constant
      (`lib/commitment/plan-policy.ts`) sent to PayPal and stated on screen, so the
      promise and the plan cannot drift. A plan that carries no threshold still
      says *"not stated in the terms"* — the absence now belongs to the source, not
      to the screen. **Fixed 2026-11-10.** Open sub-question: PayPal's *retry*
      behaviour (whether it re-attempts before suspending) is still unverified —
      both research tools were unavailable — so the sentence states the threshold
      and claims nothing beyond it.

- [x] **Ending a financed plan is not offered while ending a subscription is.**
      The receipt now offers the cancel for both, through the same route, with
      PayPal's answer reported the same way. What changed is the words and one
      sentence: the record calls the agreement a *payment plan*, and the
      confirmation says *"This stops the schedule at PayPal; it does not settle
      what you owe the seller, so ask them about that."* **Fixed 2026-11-10.**
      Still needs the sandbox click to see a real plan cancelled (§1).

- [ ] **The market product page narrates its own plumbing.** *"the catalogue's
      figure, not this page's"* · *"If that offer leaves the catalogue, this page
      says so rather than charging a price nobody is offering"* · *"the price
      Channel3 lists at …"*. One disclosure is required (the sandbox moves no
      money); the rest explain the implementation to the shopper. Carry into the
      UI pass.

- [ ] **Check whether "we could not write a plain-language summary" is still
      reachable.** The summary is derived from the terms now, so the degraded
      notice may be a branch no one can reach — which would make it a sentence
      about a failure that cannot happen.

**Structural, and staying:** the sandbox/example disclosure, "we could not reach
PayPal" and "we cannot tell whether that went through" (reports of a real failure,
not apologies), `/read`'s no-model fallback, and "Not stated" for a **term**
commitment whose seller published nothing (the mattress's exit, the coffee's
repeating charges).

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
- [x] **Put sandbox test credentials in `README.md`** — **done 2026-11-11**: the
      README carries a US buyer login that has itself approved and cancelled a
      subscription, why the account must be US, and a record URL a judge can open
      without approving anything. `docs/judge-brief.html:126` is now true.
- [ ] **Screenshots.** `public/` holds only Next's default SVGs — there is no image
      of the product anywhere. Capture: the entry, the receipt with cancel, the
      `/read` result, and "Largest" text. ~1 h.
- [ ] **Video.** Already listed under "After these"; the judge put Presentation at
      **1/5** solely because it does not exist, making it the highest-value item left.

### 7b. Demo-feel defects (the ones costing Design points)

- [x] **The consent screen is not cached.** `app/api/commitment/[orderId]/route.ts:33-36`
      calls the model for wording on every load; measured **6–12 s on repeat visits**,
      while the exit reading beside it is cached
      (`lib/commitment/published-exit.ts`). Cache `extractTerms` the same way. ~2–3 h.
      **Fixed 2026-11-10, by deleting the call rather than caching it:** the model was
      writing a summary to decorate figures the route had already computed, and the
      derived schedule is the plain-language sentence. Measured **11.1 s → 0.23 s**
      (demo) and **7.5 s → 1.78 s** (market, the live-catalogue fetch). The route now
      names its own three parts, so the provenance table stops changing between loads.
- [x] **The product page shows no figures.** `components/ProductScreen.tsx` is a copy
      block and a button, so a buyer must click before seeing anything the product is
      for. Render the triad on `app/product/[slug]/page.tsx`. ~3–4 h.
      **Fixed 2026-11-10:** the page renders the full `CommitmentView` (three figures,
      breakdown, schedule, exit note, source line) above the button.
- [ ] **The headphones entry types a `$0.00` exit.** `lib/catalog/products.ts:24`
      hardcodes `exit: { kind: "none" }` while the copy says only "Free returns within
      30 days". Coffee was deliberately made `unknown` for exactly this reason
      (`:40-42`). Either read the sentence or make it `unknown`. ~30 min.
      *Still open — and "Free returns within 30 days" is a returns window, not an exit
      fee, so the fix is `unknown` plus a read, not a smaller number.*

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

### 7e. Blind UI/UX audit (2026-11-10, second pass)

A context-free agent screened the running app at 1280×1000 and 390×844, clicked
every reachable flow, and wrote 18 findings plus a "protect this" list. The
recurring theme is the same as §6a: the product narrates its own plumbing where a
good product answers the question. Its top four are kept here in its order.

- [x] **`/read` crashed on three of its four example documents.** `Cannot read
      properties of undefined (reading 'minor')` in `CommitmentView`, from a cached
      reading made by an earlier build that had no `breakdown.fee`. **Fixed
      2026-11-10**, two ways: the cache key carries an `ANSWER_VERSION` (a cache on
      `globalThis` outlives a recompile, so an old-shaped answer was still being
      served), and the view reads an absent fee as no fee instead of crashing the
      one screen a shopper cannot reload past.
- [x] **`/read` could hang for two and a half minutes.** The model client's own
      socket timeout was the only bound: a dead endpoint held the button on
      *"Reading…"* for 156 s and then fell back. **Fixed 2026-11-10** with
      `MODEL_ANSWER_DEADLINE_MS` (60 s) in the route; a timed-out attempt is not
      cached, and the fallback is the amounts the page can find without the model.
      The endpoint was unreachable during the audit — see §9.
- [ ] **"No, show me the breakdown" does nothing.** The person who says the figure
      does not match their expectation — the user this product exists for — gets
      silence. The handler moves focus and scrolls to a heading; neither is visible
      on that screen. ~30 min, and it is the worst kind of defect.
- [ ] **Approving is a two-stage handshake with near-identical labels.** The first
      press greys out, then a second outlined link appears that is the real
      approval. One control, one label. ~1 h.
- [ ] **No navigation.** `/shop` and `/read` are reachable only from three body
      links 1,500 px down the home page; every interior page's only exit is *"Back
      to the ways in"*, a phrase used nowhere else, pointing at `/`. ~2 h.
- [ ] **The three-figure frame is semantically wrong on a bill.** "Cost to leave /
      Not stated" and "Charged today" on an invoice with a future due date. Honesty
      is the thesis; a figure that answers a question the document does not ask
      damages it more than a gap would.
- [ ] **Load states are a word, and sometimes a lie.** *"Reading…"* with no
      spinner or progress; the status line points at the box below it while sitting
      above it.
- [ ] Smaller: figure cards repeat the amount on the arithmetic line ("$12.00" over
      "$12.00"); the shop has no empty state; every route shares one `<title>`;
      read-aloud has no playing state; three different "back" voices.

**Protect (its words):** the identical three-figure frame across five screens,
"Not stated" instead of $0.00, the "what the seller wrote / what this asks of you"
pair, the real focus ring and persisted text size, "Show one figure at a time",
and the restraint — no gradients, no shadows, no fake urgency.

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
   is not the commitment PayPal holds. **Fixed 2026-11-10** — the order route now
   refuses any shape that is not paid once, and a financed purchase is created as a
   billing plan of twelve cycles (ITD 2, `todo.md` §6).

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
- [x] **The subscription path no longer uses the invented coffee entry** — as of
      2026-11-11 it runs on a real BARK listing, approved and cancelled live against
      the sandbox (§1, §4). Channel3 carries no terms, so the four curated listings are
      the source, and the screens name it.
- [ ] **The financed mattress is untouched** and still a repository entry. No live
      listing states instalments and a fee, so it stays until one does — or until the
      demo says so plainly.
- [ ] **Shipping and tax for a market purchase** are zero in the terms because the offer does not
      state them. The screen omits the rows (a zero row would claim the seller charges nothing).
      The nullable-tax model is the honest fix and is still open (§9).
- [ ] **Add a shape for a commitment paid once and delivered over time.** Deferred
      2026-11-11 by the user ("we will get back to this"). This is the single biggest
      gap in the subscription path, and it blocks the shop rather than the code.

      **The gap.** `CommitmentTerms` has three shapes — `one_time`, `recurring`,
      `financed` — and none of them means *"one charge, then N deliveries"*.
      `subscriptionTerms` can only build `recurring`, and `computeCommitment`
      multiplies the amount by the count, so every prepaid listing is read as N
      separate charges at the lump-sum price.

      **Why it matters.** Prepaid is the common shape, not the odd one. BARK's own
      6- and 12-month plans are charged upfront in reality — the current map is
      already leaning on the merchant not saying so. Four proposed listings failed
      on exactly this: `6zX4gv1` says *"billed once … for three months"* ($137.85
      read as 3 × $137.85), `GvSGZw5` offers *"prepaid 6-month and 12-month
      options"*, `JbTNXi4` says *"pre-paid 12-month commitment"* (while its title
      says 6 Month), and Bosch's 12-month software plan is $1,260 as one annual
      charge. Without this shape those products can only be skipped.

      **The related data defect.** An offer's `price` carries no unit: it is
      per-delivery for BARK ($19.99–$50 a box) and a term total for prepaid and
      software plans, and no Channel3 field says which. So adding the shape is
      necessary but not sufficient — a listing still needs `{ charges: 1, covers:
      { count, period } }` curated by hand, the same way `LISTED_TERMS` works now.

      **What it would touch.** `lib/commitment/types.ts` (a fourth shape, or a
      `chargeOnce` term on `recurring`); `compute.ts` (`today` = the whole amount,
      `acrossTerm` = the same amount, `perPeriod` = null, not a division);
      `schedule.ts` and `present.ts` (a sentence that does not say "N payments");
      `lib/paypal/plan-policy.ts` / `ensurePlan` (PayPal has no plan for this — it
      is one Orders capture, and the *delivery* schedule is not something PayPal
      holds, so the page must not imply it does); `lib/market/subscriptions.ts`
      (the curated entry needs the new field); the consent screen's shape branch;
      `README.md`, `env.example` and the IPD/ITD that carry the shape list.

      **Done when:** a prepaid listing renders "Charged today $137.85 · Across the
      term $137.85 · one charge covers 3 months", the schedule says three deliveries
      and one payment, the order path charges the lump sum once, and `6zX4gv1` and
      `GvSGZw5` can be curated without a false figure.
- [ ] **Say on a shop card when a result opens the subscription screen.** Only four
      ids resolve as subscriptions (`lib/market/subscriptions.ts`); every other
      result is a one-time purchase, and `/shop` gives no sign which is which, so a
      visitor finds the subscription path only by guessing a product or using the
      home page's worked example.

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
- [x] **The document door has no server-side deadline.** `app/api/read/route.ts` leans
      on 45 s × 3 attempts (`lib/ai/client.ts:16-19, 63-69`); a custom paste returned in
      **over 120 s**. Give it a budget and an honest in-progress answer. The built-in
      examples are warm (0.03 s), so only a stranger's text is exposed.
      **Fixed 2026-11-10:** `MODEL_ANSWER_DEADLINE_MS` (60 s) bounds the route, a
      timed-out attempt is not cached, and the fallback states what it could not
      interpret. Re-measured during the §7e audit at **156 s → the budget**, though see
      the outage note below.
- [x] **The model endpoint was unreachable on 2026-11-10.** Two consecutive reads of a
      live document returned `ModelError: The model endpoint could not be reached.` and
      fell back to candidate mode after 137–156 s. Nothing in the product is wrong —
      this is the `AI_*` credentials or the provider's quota, owned by the user. The
      reader still works without it (it shows the amounts and says it did not interpret
      them), but the flagship AI claim is not demonstrated until this is restored.
      **Check before recording the video.**
      **Diagnosed and fixed 2026-11-10.** The credentials were never the problem: the key
      is valid with $4.99 of its $5 weekly allowance left, and it answers a plain request
      in 0.8 s. The model itself was the problem — `nvidia/nemotron-3.5-lightning:free`
      takes **123.6 s** to answer a real reading (six spans, all correct) versus the
      route's 60 s budget, so the page gave up every time and reported the timeout. The
      same reading measured through three models on the same key: gpt-4o-mini **2.6 s**,
      gemini-2.5-flash **3.6 s**, the free Nemotron **123.6 s**. `AI_MODEL` now names
      `openai/gpt-4o-mini`, and a live `/api/read` returns `mode: read`, `rejected: 0`,
      figures $783.00 / $180.00 / $47.00 in 7 s. Restarting the server is not enough on
      its own — `TaskStop` leaves the `next-server` child holding port 3001, so a second
      start exits with `EADDRINUSE` while the old process keeps serving the old env.
      **Open:** `MODEL_READ_DEADLINE_MS` is 60 s while the client allows 45 s × 3
      attempts; with a slow model the page gives up before the client does. One attempt
      and no retry for a page that is waiting would make the failure honest.
      **Root cause, measured 2026-11-10:** the free model is a *reasoning* model. On the
      app's real request it streams its first token in 1.7 s (so the provider's "<500 ms
      latency" claim is about TTFT and is not false) but spends **4,941 thinking tokens**
      to produce a 122-token answer — **68.6 s** total, 95% of its output invisible.
      gpt-4o-mini on the identical request: 1.2 s first token, **3.1 s** total, **0**
      reasoning tokens. Thinking scales with the prompt (short prompt → 1,821 tokens;
      trivial question → 977), so the eight-field system prompt is the worst case, and
      the task is copying ("never compute anything"), so reasoning cannot help it. The
      app does not stream, so a fast first token is invisible to it. **Vision is
      irrelevant** — pasted text only, every tool-schema field is a string, nothing in
      `lib/ai/` builds an image part. Rule for any future model swap: measure
      `usage.completion_tokens_details.reasoning_tokens` and *total* time, never TTFT;
      on a paid reasoning model this one reading would bill ~5,000 output tokens.
- [x] **Reasoning is now a setting, and off unless asked for** (2026-11-10, user's call).
      `AI_REASONING_EFFORT` = `default | none | minimal | low | medium | high`.
      **Unset means `none`** → `{"enabled": false}`; a graded value sends `{"effort": …}`;
      `default` sends no field at all. Sending `reasoning` by default means the ordinary
      request is no longer literally the plain format — accepted deliberately (the failure
      it prevents happened twice; the failure it risks is one env var away via `default`).
      `.env.local` sets nothing and relies on the default; `.env.example` documents it.
      A value it does not recognise **throws**, naming the accepted ones, so a typo
      cannot masquerade as a slow model. Verified live through `npm run check-model`
      **with the variable absent**: the free model answers in **1.60 s** (was 123.6 s on a
      real reading); `AI_REASONING_EFFORT=very-high` fails with *"It must be one of:
      default, none, minimal, low, medium, high."* **Caveat measured, not assumed:**
      `effort: "low"` is accepted and **silently ignored** by that model (still 1,183
      thinking tokens, 20 s), so only `none` is a claim that holds. `check-model` now
      prints the thinking setting and the answer time. Recorded as Revision (6) of
      `itds/ai-approach.md`.
- [x] **`env.example` still listed two dead product ids** (`PAYPAL_PRODUCT_COFFEE_SUBSCRIPTION`,
      `PAYPAL_PRODUCT_MATTRESS`) after the Channel3 switch left only the headphones in
      `paypalProductIdFor`. Fixed 2026-11-10.
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
      **2026-11-10 (later) — the model change is done, and it went further than the
      row.** `CommitmentTerms.shipping` and `.tax` are now `Money | null`: `null` means
      *the source did not state it*, `money(0)` means *stated as nothing*. A translation
      carries `unstated[]`; the two totals become `floor: true`, the screen prints "At
      least $179.95", the arithmetic line names what is missing, and the breakdown gives
      an unstated part its own "Not stated" row. `marketTerms` passes `null` for both,
      so a real listing's schedule no longer says "Nothing further is charged". Still
      open: the demo catalogue's typed `$4.01` and the document path's `zeroMoney()`,
      both of which now have a true way to say "not stated" and have not been moved to
      it.
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
- [x] **Consent wording cache** — already §7b; this reviewer measured **7–20 s** and
      said they would have hit Back. **Fixed 2026-11-10** by deleting the model call
      from that route rather than caching it (see §7b).
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
      README now says each figure carries its sentence *or* its arithmetic, and that the
      model's one prose output is a guarded summary. **Superseded 2026-11-10:** the
      README also said only the first payment of the financed example is charged, which
      is no longer true — a financed purchase is a twelve-cycle PayPal plan now (ITD 2).

### 10d. The reviewer's one cut

**The financed mattress.** It promises 12 payments, shows $1,320.00, and sends a
single $105.00 order with no schedule for the other eleven. "The one flow I cannot
make honest in two days, and shipping it is worse than not having it." Cross-ref §6
and §8a. **Answered 2026-11-10, by making it honest rather than cutting it:** a
financed purchase is now a PayPal billing plan — twelve monthly cycles at $105.00
with the $60.00 fee as its `setup_fee` — so the twelve-payment figure is a schedule
PayPal holds, and the receipt reads it back from there. See §6 and ITD 2.

## After these

- [ ] One full day on the video and the Devpost page. Without it the engineering is
      not seen.
- [ ] Deploy to a public URL so a judge can click without cloning or needing keys.

## 11. The Playwright visual audit (2026-11-10)

A context-free agent drove the running app with Playwright (installed Chrome, not the
bundled browser) and reported what a stranger sees, screen by screen. Fixed the same
day:

- [x] **The consent screen waited 11–12 s** before showing figures. Fixed in §7b —
      the model is gone from that route, not cached on it. Re-measured 0.23 s / 1.78 s.
- [x] **The shop claimed matches it had not made.** The result line said "N results
      for *query*" whatever the catalogue actually returned. It now counts the results
      that use the reader's words and says what a near miss is ("Nothing the catalogue
      returned uses "zzzqqq". It matches on more than spelling, so these are its
      nearest results — not a promise that they match."). Cards say "N retailers in
      these results" and the spread. Two tests added.
- [x] **The recognition check showed a bare number under a bigger one.** It now names
      its figure and states the term total: "Today's charge / $12.00 / This is today's
      charge. Across the term the page says $144.00."
- [x] **A one-time payment's two tiles were the same figure with no way to tell them
      apart.** Now "1 payment of $179.95, plus shipping and sales tax not stated".
- [x] **The home page repeated the seller's sentence** as a "summary" in the column
      beside it, making the plain version identical to the version it explains.
- [x] **"Nobody published what it costs to leave"** was printed beneath an absent exit
      figure on the consent screen and the market product. Unsupportable for a
      catalogue with no such field — the figure's own note already gives the reason.
      `describeSources` is called with `absent: null` there.
- [x] **The schedule sentence pointed at the wrong place** ("the figures above" on a
      line that prints above them) and called every commitment "this listing", which
      is false for a pasted document. Now position- and context-neutral, with a test.
- [x] **The loading hint claimed the page was reading the seller's words** on the
      market path, where nothing is read. Now says what happens and that nothing is
      charged.
- [x] **`/read` gave no feedback** on the long path: it now says how many quotations
      were taken, and scrolls the answer into view before focusing it.
- [x] **The phone header split the text-size chips across rows.** All three now share
      one row; checkbox enlarged to 20 px; inline links given a 44 px touch target.

Judged out of scope, stated rather than silently dropped:

- [ ] **The unreachable `degraded` state.** `GET /api/commitment/{orderId}` returns
      `degraded: false` unconditionally and `summary: ""`, so the "we could not write a
      summary" notice and the check-hiding branch can never render. Removing the field
      touches six files and deletes a test; it is dead code, not a false claim, so it
      waits until after the video.
- [ ] **`lib/ai/extract-terms.ts` is unused by the app.** Kept deliberately: two suites
      import it to assert the model is **not** called on the consent path, which is the
      regression guard against putting it back.
- [ ] **The typed `$4.01` tax and `zeroMoney()` in the demo path** (§6) — untouched;
      the demo catalogue is a demonstration seller and the figures still add up.

---

## 12. UI/UX review + the login question (2026-11-11, two agents)

Two reviewers were dispatched onto the running app (same model, read-only). Neither
finding below is fixed yet — the first is the exception.

- [x] **The reader printed a cost to leave the document did not state.** Found in the
      same review: `/read`'s own phone-contract example showed **Cost to leave $0.00**
      sourced to *"You are agreeing to 24 months of service"* while the next sentence
      states a **$180.00** early termination fee, and the fee-schedule example (the one
      written to be **refused**) was read as `$30.00 charged today` from one
      *"$15.00, charged once"* card. The span was verified; the label on it was not.
      Fixed in `lib/document/read.ts` with two content checks and a reversed
      precedence (a stated fee outranks a free-exit sentence), 4 tests, suite
      **413 → 417**; both re-read live. See `context.md` for the detail.

Open, unapproved, in the order they cost points:

- [ ] **`/receipt/{id}` needs `?slug=` to render.** Without it the page says *"This
      record is for a purchase this store does not recognise."* for an order PayPal
      has just settled — a judge who types the id they were given, or comes back from a
      bookmark, sees a refusal. This is the login question's real answer: no accounts;
      make the record self-sufficient from the PayPal id alone (the PayPal read already
      carries the amount, the date and the next charge). ~1–2 h.
- [ ] **Say what the link is.** One line on the receipt: *this link is your record — it
      is not stored here, so keep it.* ~30 min, and it makes the "nothing is stored"
      claim something a person can see rather than something they must believe.
- [ ] **Consent screen has no heading naming the product.** The h1 is the question;
      the thing being bought appears only in the body copy.
- [ ] **Receipt's 3+1 figure grid orphans the last tile** at desktop width.
- [ ] **Phone: the page header is 187 px tall** before any figure.
- [ ] **Control borders are 1.42:1** against their background (needs ~3:1 for a
      non-text boundary); the figures' own contrast passes.
- [ ] **`/shop` with no match** says nothing on the page — the notice lives below the
      fold.
- [ ] **A missing route renders Next's own 404.**
- [ ] **"Ctrl+P or ⌘P"** is shown to Windows users (`CommitmentRecord.tsx:225`).
- [ ] **The reader's example grid** and the sandbox disclaimer's placement.

**The login decision, recorded:** do not add accounts. A half-built auth seam on the
payment path contradicts "nothing is stored" on the one screen a judge is most likely
to inspect, email login fails for a judge with no account, and the record already
survives without one — PayPal holds it. The two items at the top of this section are
what "login" was actually standing in for.

---

## 13. "What this store holds for you" (2026-11-11)

Built after the user asked why not add login, and pushed back on "not enough time" as
the reason. The answer that survived the research: PayPal can tell us *who* someone
is and cannot tell us *what they bought*, so the only honest login is one that reads
the store's own records live. Decomposition and four decisions:
`docs/signed-in-commitments/`.

- [x] Problem decomposition + IPD 25–26, ITD 22–23.
- [x] `/account`: sign in with PayPal → this store's subscriptions under that payer,
      three figures each, rebuilt on every visit. No database; the session is a
      signed `httpOnly` cookie (2 h, `SESSION_SECRET`).
- [x] `GET /v1/billing/subscriptions` scan with `subscriber.payer_id` matching,
      bounded to 5 pages / 5 concurrent reads / 8 s, and the bound is *stated* when hit.
- [x] "Looked and found none" vs "could not look" kept apart — the page never says
      "none" on a failure.
- [x] *Log in with PayPal* enabled on the sandbox app, return URL
      `http://127.0.0.1:3001/auth/paypal/callback`. `localhost` was the address the
      dashboard refused to save; PayPal also treats the two as different apps.
- [x] **Sign-in driven end to end in a real browser (Playwright), 2026-11-11** —
      `/account` → PayPal → buyer → consent → back on `/account` with a live session.
      It found two defects, both fixed: **(1)** Next rewrites `127.0.0.1` to
      `localhost` when it builds a redirect, and a cookie set on one host is never
      sent to the other, so the sign-in landed *signed out* — `lib/origin.ts` now
      takes the Host header (`APP_ORIGIN` overrides); **(2)** `openid` alone returns
      an **opaque subject URL**, not the payer id, so the scan found both sandbox
      subscriptions, matched neither, and the page said "you have none" — a false
      statement. `readProfile` now refuses a subject URL, and the page says it
      cannot tell which account instead (IPD 26's rule applied to identity).
- [x] Privacy/user-agreement URLs and the **Email** + **PayPal account ID (payer
      ID)** ticks are on — the app now accepts both scopes at authorize (before:
      *invalid scope*), and the token reports them granted.
- [x] Removed the buyer's old grant so PayPal would ask again: the consent screen
      did appear and was approved (*Agree and Connect*).
- [x] **RESOLVED 2026-11-11 — it was PayPal's propagation delay, exactly as the panel
      said.** After the three-hour window the same browser run lists both sandbox
      subscriptions on `/account`: *"Read from PayPal just now, for
      sb-br9fh53843654@personal.example.com"*, then two rows of *6 payments of $24.99,
      one a month … cancelled*, each with **Across the term $149.94 · 6 × $24.99**,
      **Cost to leave Not stated**, **Charged today $24.99**. The email coming back
      proves both ticked attributes are live. Before propagation, the same code
      returned only `user_id`/`sub` (`…/identity/user/M3Pa4…`) from all four userinfo
      shapes — that is now a *seen-and-explained* state, not an open question.
- [x] **App settings confirmed correct from the dashboard itself** (user's screenshots,
      2026-11-11): return URL `http://127.0.0.1:3001/auth/paypal/callback`, **Email**
      ticked, **PayPal account ID (payer ID)** ticked, privacy + user-agreement URLs
      `https://example.com`. Nothing is missing on our side of the configuration.
- [x] Retried after the window and it worked. Probe kept at
      `C:/Users/USER/AppData/Local/Temp/signin-probe.mjs` (headless Chrome,
      `channel: "chrome"`, buyer sign-in, consent click, reports the returned page) —
      **the fastest way to re-check the whole sign-in**, and the thing to run again
      after any change to the app's Log in with PayPal settings or `SESSION_SECRET`.
      The development server must be up on **:3001** first; the probe starts at
      `http://127.0.0.1:3001/account`, and that host is the one registered at PayPal.
- [x] **The way out works too (same probe run, 2026-11-11)** — *Sign out* on the
      signed-in page returns to `/account` with the sign-in offered again, so the
      session cookie is genuinely gone rather than merely hidden.
- [ ] Approve one **active** subscription before the video: both records in the
      sandbox are `CANCELLED`, so the page currently demonstrates only that state.
- [ ] Entry point: the home page links to it; the receipt does not yet ("Lost this
      link? Sign in" is a one-line addition).

## 14. Finished feel (IPD 29, ITD 26–28 — 2026-11-11)

After the user watched the joined-up build: *"we write too much… This is ruining the
product from getting a finished feel. And this removes focus from our USP."* The
problem was volume, not structure — every decision had added its own sentence and none
had removed one. Decomposition and four decisions: `docs/finished-feel/`.

- [x] **One qualification, one place.** *Sandbox store: no real money moves and nothing
      you do is stored* is the only standing caveat, at the foot of every page
      (`Page.tsx`). The `Shell` footer (*Built with PayPal for the 2026 AI Hackathon*)
      is deleted, as are both sandbox paragraphs and the pay-link note on the bill, the
      three *Nothing is invented to fill the gap* lines on `/product`, and the sign-in
      card's hint. ~19 sentences → 1 line + short clauses.
- [x] **Findings kept, not cut.** *Not stated*, the failed-scan line, *Keep this page —
      it is the only copy*, *None of these is a total*, *check the amount with them*,
      *this is today's charge, not the total across the term* — the rule is in ITD 28.
- [x] **A hierarchy in the figures.** Term total in its own band at
      `clamp(2.25rem…3.5rem)`; the other two two-up beneath. The quoted figure and its
      quote wear the same 3px `--accent` rule, driven by `data-quoted` from
      `FigureGrid`, so the trace is visible before the words are read.
- [x] **Layout answers to the card.** `.commitment` is a size container
      (`@container (max-width: 30rem)`); on a phone the entry pair shows the figures
      before the seller's words (flex `order`, DOM unchanged).
- [x] Tests rewritten to the new behaviour, and two pin the caveat's *position* — once
      on `/`, absent from the consent component. Suite **449 → 450**, tsc clean, lint
      clean but the two pre-existing warnings.
- [x] Verified by screenshot at 1440 and 390, light and dark, no horizontal overflow;
      the big figure is above the fold on `/`, on a `/read` result and on the receipt.
- [ ] **The video.** Still the biggest unfilled scoring item.
- [ ] One receipt-level way back for a lost link — the sign-in lives in the frame
      (`Shell`) only; §13's last item is still open.

## 15. The front door as a landing page (IPD 30 — 2026-11-12)

*"Our home page does not feel like a proper landing page."* A blind review (an agent
given the product, the audience and the situation, and no code, docs or screenshots)
was asked what the treatment should be, and everything below was judged against it.
Decomposition + decision: `docs/landing-page/`.

- [x] **The page takes its own frame's edge.** `/` widens to 64rem (`.page-wide`,
      the `wide` prop on `components/Page.tsx`); receipts and bills keep `--measure`,
      because a document has a column. `h1` at `--text-hero`, held to 20ch.
- [x] **Two ranks under the headline.** The promise at body size, the audience at
      `--text-sm` — one is what the product does, the other is who it is for.
- [x] **One surface.** The seller's panel loses its fill, border and padding and sits
      on the paper; the figure card is the only raised object, with a 2px ink top rule
      like a receipt's total line.
- [x] **One ledger.** The three figures share a column with hairlines, label left,
      amount right-aligned in mono at display size, the first figure larger,
      `Not stated` at the size and weight of an amount. Container query removed.
- [x] **The trace, finally drawn on `/`.** `termQuote` travels from `LISTED_TERMS`
      through `resolveProduct` to the `acrossTerm` figure; `components/QuotedText.tsx`
      marks that span in the seller's paragraph and `.commitment-quote` puts the same
      `--mark` wash under the figure. No new words, and the example listing unchanged.
- [x] **Doors span the page.** `auto-fit` fitted three tracks at 1024px and the label
      spanning every track kept the empty one, so the two doors stopped two thirds
      across; now two named columns above 44rem, one below.
- [x] Tried and reverted: stretching the seller's column to the card's height and
      putting the CTA at its foot. It moved the primary action a page away from the
      reading it follows from. The void is the cheaper defect and is documented.
- [x] 5 new tests (`tests/quoted-text.test.tsx` ×4, one in `home.test.tsx` pinning the
      mark and the quote as a pair). Suite **450 → 455**, tsc clean, **lint clean**
      (the two old unused-variable warnings fixed).
- [x] Verified by screenshot at 1440, 1024 and 390, light and dark: no horizontal
      overflow, no console errors, `h1` 44px against figure 56px at 1440 and 32
      against 40.5 at 390 — the figure leads at both.
- [ ] **The video.** Unchanged and still the biggest unfilled scoring item; it has to
      be recorded signed out so this page, not the record, is what is seen first.
- [ ] The header's wrap between 620px and 780px (§1a) — worse now that the page is
      wider, still untouched.

## 16. Made visible — the AI's work on the screen (IPD 31, 32, ITD 29 — 2026-11-12)

Raised by the owner — *"so AI coverage is pretty weak here? I think the task was
basically integrate AI with PayPal?"* — and answered twice: by a blind churn (no code,
no docs) and by a blind judge scoring the product against the rubric. Both agreed the
AI is load-bearing and that nothing on a screen **shows** it. Judge's blunt version:
*"Today it scores zero, because nothing is submitted."* Decomposition:
`docs/ai-made-visible/`.

- [x] **IPD 31 — say what is not there.** The three absences stayed distinct in the
      code and were rendered as one grey footnote in four different wordings. The
      words now live once, in `lib/commitment/absence.ts`, and `FigureGrid` renders
      them as `.commitment-state`: body size, ink, left-aligned under the amount, in
      the place where a figure with a number shows its arithmetic. `relationshipSentence`
      and the whole `.entry-relationship` rule are deleted — the front door lost a
      paragraph and gained no words.
- [x] `EXIT_SILENT_NOTE` / `EXIT_UNREADABLE_NOTE` re-export the shared sentences, so
      every screen that reports an absence says the same line; `commitment-route`'s
      test mock was updated to the constant it now passes through.
- [x] 4 new tests (`tests/commitment-view.test.tsx` pins the state's class and words;
      three in `tests/published-exit.test.ts` pin the two sentences being different,
      shared, and chosen by outcome). Suite **455 → 459**, tsc clean, lint clean.
- [x] Verified on `/` and `/product/ch3-YyLUjLT` at 1440 and 390, light and dark: the
      live BARK listing reads *Cost to leave — Not stated — The seller's words don't
      say what leaving costs.*, no overflow, no console errors.
- [x] **ITD 29 — carry the refused span.** `lib/document/refused.ts`: up to 3 spans,
      300 characters each, partitioned by identity so one of two identical spans can
      be the refused one, clipped with an ellipsis. `answer.ts` puts them on the
      reading as an **optional** field; `verifyQuotations` untouched.
- [x] **IPD 32 — the checking is shown.** `components/ReadingCheck.tsx` is the only
      renderer of a refused span (plain text, no `<q>`, no mark, never parsed). The
      counts paragraph is gone; a closed line sits under the card — *"Read 5
      sentences from your document. Checked against it word for word."* — and its
      body is not built until it is opened, so closed really is one line.
- [x] 7 new tests (6 in `tests/document-refused.test.ts`, plus one in
      `tests/read-page.test.tsx` proving the refused sentence is on screen and never
      dressed as a quotation); the two tests that pinned the old paragraph now pin
      the disclosure. Suite **459 → 466**, tsc clean, lint clean.
- [x] Verified on `/read` at 1440 and 390, light and dark: closed line one sentence,
      body absent until opened, three items under *The sentence behind each figure*,
      no overflow, no console errors.
- [ ] **A refused span cannot be produced on demand.** Six documents posted to
      `/api/read` — two misspellings, typographic apostrophes, an ambiguous fee —
      and the model copied every span verbatim (`rejected: 0` each time). The
      panel's most convincing state therefore has no live demonstration yet. If the
      video is to show the model being caught, it needs a document the model
      actually misreads; drafting one is the open work here.
- [ ] **The video.** Unchanged, still the biggest unfilled item, still has to be
      recorded signed out. The judge's order: publish the repo, record the video,
      make the AI legible, one person's impact quote. Cut test counts and process
      docs from the submission narrative.

## 17. Sponsor prizes (blind review — 2026-11-12)

A **blind** reviewer was asked which sponsor technology could be integrated
meaningfully: given the product in plain prose and the known sponsor list (AG Grid,
Bryntum, Channel3, APIMatic), and told to open no file in the repository, so that
what already exists could not anchor it. Its filter — *can this vendor's output
enter the evidence chain, a verbatim span plus a number our code derived?* — is the
right one, and three of the four fail it. Its full memo is quoted where it decided
something below.

- [x] **AG Grid — skip. Decided 2026-11-12.** *"Skip AG Grid. It's a nicer version of
      a screen you already have, and it costs most of a night."* The reviewer's
      proposal was a ledger of every commitment the signed-in account holds, with a
      panel behind each row showing the seller's sentence — which is
      `components/RecordHome.tsx` with accessible table semantics bolted on. 4–6
      hours for the version worth having (its own estimate; 2 hours buys a grid that
      reads as decoration), against a screen that already exists. Its best line is
      kept here for the video: *"sorting by what it costs to leave is a ranking, and
      a ranking is advice"* — that is the product's rule, and it needs no library to
      state.
- [x] **Does Channel3 already count? Yes — checked against the rules, 2026-11-12.**
      The reviewer was blind and assumed it was not integrated. It is:
      `lib/market/channel3.ts` and `lib/market/subscriptions.ts` read every shop
      listing and plan live, and every market figure on screen is derived from what
      Channel3 returned. The rules make the bar explicit: *"Best Use of Channel3 —
      $1,500 USD, 1 winner — All Eligible Submissions that use **any Channel3
      tools**"* (`paypalaihackathon.devpost.com/rules`, §8). Any Channel3 tool, one
      winner, and it stacks: the rules allow *"one (1) Grand Prize and one (1)
      Sponsor Prize OR one (1) Honorable Mention Prize and one (1) Sponsor Prize"*
      per project. So this is **not a build** — it is one line on the submission
      form plus a sentence of copy. What it does cost is that the Channel3 call has
      to work in front of a judge, which is the same defect as the 500 below.
- [x] **Is there a speech/voice prize? No — checked against the rules, 2026-11-12.**
      The complete sponsor-prize list is AG Grid, APIMatic, Bryntum, Channel3 and
      Render. There is no TTS, speech or audio prize, and no judge-visible prize
      that a new voice engine could win. The reviewer's idea — *reading the quoted
      sentence aloud is exactly the need of a dyslexic reader* — is still right, and
      it is already built: `components/ReadAloud.tsx` speaks the figures and the
      schedule on every screen that shows them. **Nothing to build.** It stays in
      the video as a feature, not as a prize entry.
- [ ] **Render is the only sponsor prize left that is not a build of new product.**
      $1,000 / $750 / $500 in Render credits (not cash), three winners, for
      submissions that use any Render tool. The repo still has no public remote and
      the submission needs a running URL — so deploying to Render is work already
      owed, and the prize is a side effect of doing it. Credits, not cash; weigh it
      against the same hours.
- [ ] **The Channel3 sponsor entry depends on a defect.** The 500-on-cold-key below
      (judge, from code only) is the one thing that would make *"uses Channel3"* false
      at the moment a judge opens the front door. Fixing it is a prerequisite to
      claiming the prize, not a separate task.
- [x] **Bryntum — skip.** To place charges on a calendar you must infer dates from
      "billed annually" and "per seat per month" — the class of inference this
      product exists to refuse — and one commitment is one bar on an axis.
- [x] **APIMatic — skip, and the best idea nobody should build.** Publishing the
      reading endpoint with a response schema that has **no numeric field** would
      make the safety rule the contract itself. It is also a developer portal, which
      is invisible in a three-minute video.
- [x] The reviewer could not reach the event page: **its search CLI answered with a
      402 billing error.** Not ours — the main session's Tavily key answers
      `"auth_mode": "keyed"` and read the rules page directly on 2026-11-12, so the
      402 was that agent's own key or its sandbox, and the Devpost copy can be
      researched from here.

## 18. Judge, from code only (2026-11-12)

A blind review given the repository and nothing else — no docs, no video script, no
brief — asked to judge the product as a whole and return a verdict, not a checklist.
It read 55 files. Its own summary of what it found, kept close to verbatim because
the wording is the finding:

- *"The code is a real, working 'translate the commitment before you agree'
  product, not a mock: PayPal is exercised across five API families, and the AI does
  one genuinely load-bearing job (finding the sentence that states what leaving
  costs) plus the document reader. The AI is narrower than the pitch implies — it
  never produces a number, only chooses spans — and the two headline integrations
  barely touch each other in the default configuration."*
- **Stage-1 gate — "meaningfully uses both PayPal and AI": pass, with a caveat.**
  PayPal is unambiguous. AI is load-bearing for one of three figures and for the
  only real interpretation of arbitrary text. Caveat: *"A judge ticking boxes will
  pass it. A judge asking 'show me PayPal data going through the model' may not."*
- **Its single highest-leverage line:** *"Most hackathon LLM apps ask you to trust
  the model; this one shows you where it was wrong. That is the thing worth putting
  in front of the judges, and it is already built."*
- **Where it scores badly:** reach — a term total only exists for four hand-listed
  subscription ids, two fictional bills and pasted text, which is *"a long way from
  'any commitment'"*; the "both APIs" story depends on configuration; and *"the
  front door is one missing third-party key away from a 500, which in a live demo is
  fatal."*

Defects it named, in the order it would fix them:

- [x] **`/` no longer 500s — fixed and verified live, 2026-11-12.** `app/page.tsx`
      awaited `resolveProduct("ch3-YyLUjLT")` with no try, so a missing key, a
      non-OK reply or a fired deadline rendered Next's error page — and the fallback
      notice written for exactly that failure could never appear. **Fixed:**
      `lib/catalog/resolve.ts` gained `resolveProductOutcome`, which keeps the three
      states the rest of the product already distinguishes (IPD 26) — `found`,
      `absent` (the catalogue returned `null`, i.e. 404 for an id it no longer
      carries) and `unreadable` (anything thrown from the read, logged with its
      reason). `resolveProduct` itself is unchanged; the other five call sites were
      moved to `resolveProductOutcome` the same day (below). The front door now says **which** nothing it is — *"is no longer in the
      catalogue"* versus *"could not be read just now"* — and the two doors below it
      stay. `app/error.tsx` added as the backstop for the reads nobody has found
      yet: no stack, no `error.message`, a retry and a link to the front door.
      **Verified live on :3001, all three states:** key present → 200 with the
      worked listing (and the price had moved from $24.99 to $19.99, which is the
      point of reading it); the slug pointed at a delisted id → 200 with the
      *no longer in the catalogue* sentence; the catalogue host rewritten to an
      unresolvable name → **200** with the *could not be read* sentence and
      `[catalogue] could not read ch3-YyLUjLT: fetch failed` in the server log; a
      temporary route that throws → the boundary's heading, lede and both actions,
      with the frame and the footnote intact. Suite **466 → 472** (three resolver
      cases including the abort/timeout one, two front-door cases, plus the existing
      set), tsc and lint clean. Both temporary edits were reverted and `git diff`
      checked: `lib/market/channel3.ts` is byte-identical to `HEAD`.
- [x] **Fixed 2026-11-12 — the same unguarded read was on five other routes** —
      `/receipt/[orderId]`, the calendar route, the commitment route and both PayPal
      create routes. All five now use `resolveProductOutcome`, each with its own true
      answer: **503** *"the catalogue could not be read just now"* (with "nothing has
      been charged") where the route has to refuse, **404** only for a product that
      is genuinely absent. The receipt page is the interesting one: the record is the
      one screen a shopper keeps, so it still renders and states which absence it
      is — no listing supplied, listing gone, or catalogue unreadable (three
      constants, selected by `lookup.kind`). Tests in five suites, including a new
      `tests/receipt-page.test.tsx` that drives the page with the catalogue throwing.
- [x] **Fixed 2026-11-12 — the consent route had no model deadline.** `readExit`
      now wraps `resolveExitTerm` in `withBudget(…, MODEL_READ_DEADLINE_MS, …)` with
      `retries: 0`, answering `unreadable` with its note when the budget fires. A
      fake-timer test drives a reading that never resolves to a 200 with the
      honest note rather than a hang.
- [x] **Fixed 2026-11-12 — `warm.ts` did not warm the front door's listing.** It
      now reads each `LISTED_TERMS` id live (`ch3-<id>`) and feeds those
      descriptions to `readPublishedExit` **before** the file's, since in a
      sequential warm-up order decides what is ready first and YyLUjLT is the front
      door. A catalogue that does not answer is swallowed, so the file's texts are
      still warmed. Three tests in `tests/warm.test.ts`; the existing "one at a
      time" test now waits for the catalogue reads that precede the first model
      call, its guarantee unchanged.
- [x] **Fixed 2026-11-12 — "Nothing you paste is stored" was not what the code
      does.** The hint now says *"The reading is kept in memory for ten minutes so
      the same words are not sent twice. Nothing is written to a database."* — the
      reading cache's actual lifetime and bound. A test in `tests/read-page.test.tsx`
      pins both halves (the lifetime stated, the absolute claim gone).
- [ ] **The sibling sentence has the same shape.** The frame still says *"Sandbox
      store: no real money moves and nothing you do is stored."* Nothing is
      persisted, but the same ten-minute reading cache sits behind "nothing … is
      stored". Fixing it is a wording decision in `components/Page.tsx` plus
      `tests/home.test.tsx`, and it is the store-wide claim rather than the reader's
      own, so it deserves its own pass rather than a rushed rephrase on deadline day.
- [x] **Fixed 2026-11-12 — the amount-mismatch failure was flattened.**
      `lib/paypal/orders.ts` still throws with the exact numbers; the orders and
      subscriptions routes now log that error the way the invoices route does, so
      `"PayPal returned $58.95, but $59.00 was requested."` reaches the log instead
      of being indistinguishable from bad credentials behind a bare 502. Tests pin
      the log for both the mismatch and a PayPal 422.
- [ ] Cheaper, later: dead AI code (`lib/ai/extract-terms.ts` and the
      `assertNoMoney` gate have no live caller, though a header comment claims every
      model string crosses it); the unreachable `financed` and `degraded` states;
      unauthenticated writes to the merchant sandbox account; and the up-to-200-call
      account page.

## 19. The substance problem (owner, 2026-11-12)

The owner: *"I am not feeling the proud feeling when I look at the product. I feel
our AI integration and channel3 integration is shoddy. Our shop looks amateur and
paypal is not used meaningfully."* The verification chain is genuinely strong; the
weakness is **reach and surface**. Every point below is from code and from the live
catalogue, not from impression.

### What is actually there

- **AI does one small job.** Every AI path is the same call —
  `record_quotations`, which copies spans that the server then checks literally
  (`lib/ai/read-document.ts:53`, `lib/document/read.ts:117`). Nothing else reasons
  with a model. It runs on `nvidia/nemotron-3.5-lightning:free` with reasoning off
  (hence the 40 s cold readings and all the cache/deadline machinery), and
  `lib/ai/extract-terms.ts` is a dead second AI path with tests still attached.
  The best work — refusing a span the document does not contain — is a collapsed
  disclosure on `/read` only, and cannot be triggered on demand for a demo.
- **Channel3 is a search box with a hardcoded ceiling.** `searchMarket` and
  `readMarketProduct` only. Unused and documented: `/v1/browse` + categories,
  price/brand/website/availability filters, variants, similar products,
  **`/v1/lookup` (any product URL → product)**, and **price history**
  (`/v0/price-tracking/history/{id}`) plus price-change webhooks. Worse than
  unused, the recurring analysis is gated on four ids (`lib/market/subscriptions.ts:27`,
  `lib/catalog/resolve.ts:111`, `app/product/[slug]/page.tsx:68`). **Checked live
  2026-11-12:** `POST /v1/search {"query":"monthly subscription box"}` returned six
  real subscription listings in its first six results — a $199 Beauty Box and a $55
  Mystery Box among them. The app calls four of those six one-time purchases that
  say *"Paid once, so there is nothing to cancel"* (`lib/market/channel3.ts:83`).
- **PayPal is broad but stateless.** Orders v2 create/capture, Subscriptions v1
  with plans and catalog products, Invoicing v2, Log in with PayPal. Missing: **no
  webhooks** (nothing ever arrives from PayPal — a failed payment or a cancellation
  is found only on the next page load), **no transaction history**
  (`/v1/reporting/transactions` unused, so the record can never say what has been
  taken so far), **no JS SDK** (`@paypal/react-paypal-js` unused — the shopper gets
  a bare approve-URL redirect), and the capture response's payer/funding detail is
  discarded. The AI never reasons over anything PayPal holds; it reads seller copy
  that may happen to be stored at PayPal.

### Why it reads amateur — the five tells

1. The shop's answer is trivial for nearly all of its own stock: one-time purchase →
   "nothing to cancel". The screen the search leads into is where the product is
   least interesting.
2. The shop is a single-column list of 96px thumbnails inside the 46rem reading
   column (`app/shop/page.tsx:72`, no `wide`), defaulting to `"headphones"` (`:17`):
   no categories, no filters, no reason to browse.
3. The vendor is explained to the shopper: *"It matches on more than spelling…"*
   (`app/shop/page.tsx:40`), *"the catalogue's figure, not this page's"*
   (`components/MarketProduct.tsx:60`), *"Prices, images and retailer links come from
   Channel3"* (`:165`). Three apologies for the data layer.
4. No screen shows AI doing something a person could not have coded. The figures are
   arithmetic; the model produced one hidden input; the front door shows no AI at all.
5. PayPal appears as a redirect and a POST — no PayPal UI, no live state, no history.

### Recommendations, in the order they buy the most

- [ ] **R1 — Read the term from any listing, not four ids.** Add `termLength` and
      `period` quotation fields to the reader's schema; the model returns a span, the
      verifier checks it literally (`verifyQuotations`), and a new parser reads
      "6 month" / "12-month" / "3 Month" from the *verified* span. A listing with no
      term statement stays one-time and keeps saying so. `LISTED_TERMS` becomes a
      regression fixture and a tie-breaker, not the gate. **Why:** kills the ceiling,
      makes the AI load-bearing on the flagship question, and turns the whole
      catalogue into the product. **Effort ~1 day, low risk** — same pipeline, one
      new field. Tests: the four curated listings still resolve, plus two
      catalogue-found subscriptions that were never curated, plus one listing whose
      term sentence has been rewritten (must stay one-time).
- [ ] **R2 — Make PayPal the authority on what has actually happened.** Read
      `/v1/reporting/transactions` (or the subscription's transactions) and state
      *Taken so far · 3 of 6 · $74.97*, computed from PayPal's records rather than
      by arithmetic over the plan. Then one model sentence over those facts, with a
      guard that every numeral it writes exists in the verified set. **Why:** the
      only place PayPal and the model genuinely meet — PayPal owns the facts, the
      model owns the language, the server owns the check. **Effort ~1 day, medium
      risk:** verify sandbox transaction lag before building the record around it.
- [ ] **R3 — Make the shop a shop.** `/v1/browse` + categories; a **subscriptions
      shelf** (the search that surfaced six live subscriptions is the shelf's
      data); price/brand/website filters; card grid at `wide`; a real default with no
      arbitrary query; and delete the three vendor apologies in favour of one line —
      *prices read live from the retailer's own listing*. Add `/v1/lookup` so "check
      any product" accepts a pasted product URL. **Effort ~1 day, low risk.**
      **Started 2026-11-12: decomposition only — `docs/browsable-shop/intro.md`
      (five root questions, no decisions). The tree is the checkpoint.**
      **Decided 2026-11-12 — `docs/browsable-shop/`: IPD 33 (the shop opens on the
      catalogue's 16 root categories; search is the shortcut beneath), IPD 34
      (categories navigate, price is the only narrowing, "Show 30 more" until the
      catalogue's 150 ceiling, all state in the URL), IPD 35 (a card is a picture,
      brand, title and price; one sourcing line replaces three vendor sentences),
      IPD 36 (a pasted product link is a second field on the shop), ITD 30 (browse /
      categories / lookup in `channel3.ts`, paging + caching + named failures),
      ITD 31 (shelf and grid at `Page wide`), ITD 32 (a link is read back before it
      is followed). **Subscriptions shelf deferred to R1** — the shop cannot yet
      tell a subscription from a one-time purchase, and a shelf that guesses is the
      invented merchandising every other decision refuses.
      **Built 2026-11-12.** `lib/market/channel3.ts` gained `readCategories`,
      `browseMarket`, `searchMarket` paging and `lookupProduct` (with the price-band
      boundary and four caches); `components/CategoryShelf.tsx`, `PriceBands.tsx`,
      `MarketCard.tsx`, `MarketLinkLookup.tsx` and `lib/market/links.ts` are new;
      `app/shop/page.tsx` and its CSS are rewritten at `Page wide`. Live-verified
      against the real catalogue: 16 alphabetical shelf categories, `?category=…`
      browsing, a band that holds its price edge, `Show 30 more`, a pasted product
      URL redirecting `307` to its page, a pasted non-product page saying so. Suite
      484 → **543**, `tsc` and `lint` clean. Two findings are in the ITDs:
      `LOOKUP_DEADLINE_MS` is 20 s because 8 s reported measured 7–13.5 s answers as
      no answer at all (ITD 30, 32), and `app/shop/loading.tsx` was **refused** —
      a route-level Suspense boundary turned the redirect into a truncated 200,
      verified live (ITD 32). Screenshots at 1440 and 390, light and dark, caught
      two composition defects, both fixed and recorded in ITD 31 / IPD 33: a
      browsed department opened on a paragraph and two forms with the first tile
      below the fold (now ~710px, inside the first screen), and the page ran two
      rhythm systems so every boundary cost 64px.
- [ ] **The subscriptions shelf, deferred from R3 and waiting on R1.** IPD 33
      refuses it for a stated reason: the shop cannot tell a subscription from a
      one-time purchase until R1 can read a term out of any listing, so a
      "Subscriptions" shelf today would be a shelf of four curated ids wearing a
      category's name. **Do this first after R1 lands** — the catalogue already
      surfaces six subscriptions in one search, and the shelf is the screen that
      makes the product's own subject browsable.
- [ ] **R4 — In-page checkout with `@paypal/react-paypal-js`.** Create the order
      server-side as today, render PayPal's own button and amount, capture in
      `onApprove`, then land on the receipt. **Why:** judges recognise a real PayPal
      integration by its UI, and the redirect is the thing that reads as 2010.
      **Effort ~½ day, medium risk** (sandbox quirks).
- [ ] **R5 — Webhooks, filmed with the sandbox simulator.** A signature-verified
      `/api/paypal/webhooks`, keeping only `{subscription_id, event_type, at}` in a
      bounded in-memory map — the same lifetime class as the reading cache — and
      saying so, because the product's promise is that nothing is stored. Film
      `BILLING.SUBSCRIPTION.PAYMENT.FAILED` changing the record. **Effort ~4 h.**
- [ ] **R6 — Use a real model for the demo, and show the check.** `AI_MODEL` is
      config, not code. Pair it with the refusal panel being reachable on screen
      (the gap already recorded in §16) and one visible *read by the model, checked
      against the text* mark on the figure it produced. **Effort ~2 h.**
- [ ] **R7 — Let the document be asked a question.** "Can I cancel in month 3?" →
      an answer built only from a verified span, or *not stated*. **Why:** turns the
      AI from an extraction step into an interface, and the audience has follow-up
      questions. **Effort ~1 day, medium risk.**

**Not doing:** payouts, disputes, image search, a generic chat wrapper, or more
copy. None of them buy a judged criterion here.

**If only hours remain:** R1, then R6, then the cheap half of R3 (grid at full
width, no default query, delete the vendor copy, one shelf heading). That removes
the ceiling, the "cheap model" tell and the amateur look in that order. R2 is the
one to fight for if any time can be bought — it is the only item that makes
PayPal+AI one story rather than two adjacent integrations.
