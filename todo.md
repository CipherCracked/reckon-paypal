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
- [ ] **Look at it** at "Largest" on a phone-width window, on the bill: the figures
      must still be legible and the page must not scroll sideways
- [x] Done when: the bill has a working text size and read-aloud

## After these

- [ ] One full day on the video and the Devpost page. Without it the engineering is
      not seen.
- [ ] Deploy to a public URL so a judge can click without cloning or needing keys.
