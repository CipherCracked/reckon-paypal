# IPD 50 — Every Failure Has a Sentence, and the Link Is the Way Through When the Script Cannot Load

**Status:** Decided (2026-11-12)
**Date:** 2026-11-12
**Answers:** Problem tree Q4 of `../intro.md` — *what is stated when the payment does not happen, and what may be claimed about how it did?*
**Serves:** IPD 47, which moved the control to a third party's script; IPD 26, which keeps *could not look* from becoming *you have none*; the sentences already written for a declined capture and a cancelled approval.

---

## Problem to solve

The screen's current payment states were written for a flow the product controlled: idle, paying, approve, paid, pending, cancelled, failed — each with a sentence, and each careful about the difference between *PayPal approved* and *money moved*. A third-party button adds states the product has never had a sentence for:

- **The script is still loading.** The screen has figures on it and no way to pay yet.
- **The script could not load.** Blocked by a network filter, by an extension, by a bad connection, or by the SDK's own endpoint being down. The button will never appear.
- **The shopper closes PayPal's window.** They changed their mind at PayPal rather than in the product.
- **The button itself errors.** The SDK reports an error that is not a decline: a network failure mid-flow, a malformed response.
- **The object was created and approval did not follow.** For a subscription that means an `APPROVAL_PENDING` agreement exists at PayPal and no money has moved; for a one-time purchase, an order exists and no capture happened.

Each of those needs a sentence, and one of them needs a way out. Under IPD 47 the old link is gone from the screen — so if the script never loads, the shopper has no way to pay at all, and a third party's outage becomes this product's dead end on the screen that asks for money.

The temptation is to keep the link on the screen permanently, so the way out always exists. IPD 47 rejected that as two controls for one act. The question here is narrower: **when may the link come back, and what does the screen say in each state it can be in?**

## Options

### Option 1 — **A sentence for every state, and the link returns only when the script cannot load**

While the script loads, the slot says so in the product's words — *Preparing PayPal's button* — with the figures still above it. If the script reports failure, the slot is replaced by the existing link and the sentence that goes with it: *PayPal's button could not be loaded here, so the approval can be opened at PayPal's own page.* On a decline, a closed window, or an SDK error, the sentence is the product's and the link stays away; the shopper may press the same button again, because the object is created per press.

*How it feels:* the screen is always true. It says what it is waiting for, and if PayPal's script never arrives it says so plainly and offers the only remaining way to pay — the flow that existed before this item. Everyone else sees one control and never learns the fallback exists.

### Option 2 — The link is always on screen, beneath the button

PayPal's button, and under it the old link, at all times.

*How it feels:* the way out is always there and the screen always offers two ways to do one thing. A shopper who has been taught that this product does not leave them guessing has to guess, at the money screen, which of two controls to press.

### Option 3 — No fallback; a shopper without the script cannot pay

The button or nothing.

*How it feels:* a blocked script, a corporate network or a bad hour at PayPal's CDN is a shop that cannot be bought from, with no explanation and no alternative. The product would be handing a third party a veto over the only revenue path it has.

### Option 4 — The link returns on any error, including a decline

Cancelled, declined, failed and unloadable all produce the same link.

*How it feels:* a shopper who changed their mind is offered the same page they just declined, in a different shape — which reads as the product not having listened. It also states the same sentence for a decision and for an outage, the distinction IPD 26 exists to keep.

### Option 5 — Load the script at the top of the page so there is no loading state

The provider wraps the page; the button is present from the first paint.

*How it feels:* the shopper pays less attention to a button appearing — and every visit to the consent screen now loads a third-party script before it can show the figures the shopper came for, whether or not they intend to pay. The screen's first job is to be read.

## Reasoning

The deciding factor is **whether the fallback is a fact about the script or a choice about the shopper**. Option 2 and Option 4 both hand the link to people it does not belong to. The link exists for one reason: the SDK did not load, so the control that replaced it does not exist. That is a statement about PayPal's script, in the same family as *the catalogue could not be read just now* — and it should appear when that is true and never otherwise. Option 3 refuses to have the conversation at all, and leaving a third party able to make the shop unbuyable is a larger failure than a second control appearing in a rare case.

The second factor is **what each sentence may claim**. None of these states means money moved: a closed window means no approval, an SDK error means no completed approval, an `APPROVAL_PENDING` subscription means money has not moved and will not until PayPal's schedule acts. The existing sentences already make that distinction at capture (`COMPLETED`, `PENDING`, `ALREADY_CAPTURED`); the new states inherit the same discipline, and the new copy is not allowed to be more certain than PayPal is.

The third is **when the script loads**. Option 5 puts a third-party request in front of the figures on every visit, including visits that never reach the button — the screen whose first job is to be read would first be a page waiting on PayPal. Option 1 loads the button's script as the button's business, after the figures are on screen, and says so while it waits.

Option 4 is the one that looks kindest and is the least honest: a decline is a decision, an outage is not, and the two must not share a sentence.

## Tradeoffs

- **Two payment paths live on.** The link path and the in-page path both exist, both must keep working, and the return/capture handling they share is now load-bearing for a rarer case than before. The code cost is real, and the alternative was a dead end.
- **A slow script looks like a button that has not arrived.** *Preparing PayPal's button* is truthful and, on a bad connection, it is a sentence the shopper reads for several seconds on the screen where they are trying to pay. The one-time and subscription sentences above it are already written; this is one more.
- **A shopper may press the fallback link while the script is merely slow.** That is not a failure, but it splits the demo: two shoppers on two connections reach PayPal by different paths.
- **An error mid-flow can leave an object behind.** An `APPROVAL_PENDING` subscription or an uncaptured order is inert — no money moves — but it exists in the merchant's ledger, and the screen cannot delete it. The sentence says nothing has been charged, which is true, and does not pretend the object was never made.
- **The fallback path is the one with the least verification behind it after the build.** It is today's tested path, but it will be reached through new code, so it needs its own pass in the live check.

## Notes

- The states are the SDK's loading status plus the product's own payment states, and they are rendered in one place: the component that owns PayPal's button. The sentences and their conditions are listed here so the component has nothing to invent.
- *Preparing PayPal's button* is a state, not a spinner. Nothing on this screen has ever animated, and the product has an explicit position that a wait is said in words.
- On the fallback, the existing `approve` state is unchanged: the link, the notice, the return to `?approved=1`, the capture, and the receipt. Nothing in that path is rewritten by this item.
- The live check has to include the fallback deliberately — block `paypal.com` in the browser and confirm the screen says what it should and the link still takes a shopper to a working approval.
- No new claim about money appears in any of these sentences. Every one of them is a statement about a control or about PayPal's reply, which is where the existing copy stops too.
