# IPD 25 — The Signed-In Page

**Status:** Decided (2026-11-11), implementation in progress
**Date:** 2026-11-11
**Answers:** Problem tree Q1 of `../intro.md` — *what does signing in let a person see?*
**Serves:** ITD 22 (identity) and ITD 23 (discovery), which decide how the page knows whose they are.

---

## Problem to solve

A person approved a subscription here and lost the link. PayPal can cancel it, so their money is safe, but the explanation — the three figures, the arithmetic, the sentence the term came from — is gone with the tab. For an audience of adults with dyscalculia, ADHD and dyslexia, losing the tab is not an edge case; it is the ordinary Tuesday.

Signing in can bring them back to *a* page. The decision is what that page is for. It could be a list of payment ids, which is what PayPal's own screens give and what the audience cannot use. It could be a dashboard that grows preferences and saved documents until it is an account portal. It could be the product's own idea, one scale larger: a person's commitments, each carrying the three figures, read live.

There is a hard boundary under all of them. We only see what our merchant key can read, which is the subscriptions this store created. A signed-in page that implies "your PayPal subscriptions" would be claiming a view of the person's whole financial life that we do not have and never will.

## Options

### Option 1 — **Your commitments at this store, with the three figures, read live**

After signing in, the page lists every subscription this store holds under that PayPal account — active ones first — and each row carries the same three figures as every other screen: across the term, cost to leave, charged today. Cancelled subscriptions stay in the list, marked with the date they ended, because "I already cancelled that" is an answer a person may need. Each row links to its full record at `/receipt/{id}`.

*How it feels:* the person asks what they agreed to, and the answer is the same screen they saw before they agreed — three figures they can read — with their own commitments in it rather than a stranger's.

### Option 2 — A list of records without figures

The ids, the dates and the statuses, each linking to its receipt.

*How it feels:* a receipt drawer. It is truthful and cheap, and it hands back exactly the thing the audience came here unable to read: a row of identifiers.

### Option 3 — The most recent commitment only

One card: the last thing they agreed to here.

*How it feels:* tidy, and it answers the wrong question. A person who has forgotten what they signed up for usually has forgotten more than one.

### Option 4 — An account area: profile, preferences, saved documents

Identity as the centre, with commitments one section of it.

*How it feels:* like every other commerce site, which is the point of the product not being one. It also invites storing what the receipt screen promises we do not store.

## Reasoning

The product's unit is not a payment, it is a **commitment read as three figures with their arithmetic**. Every door ends in that screen, and the whole claim — checkable, sourced, absence stated — is a claim about that screen. Option 1 is not a new product; it is the same one applied to the set of commitments a person already holds. That is why it is the only option that makes the login worth its friction: it brings back the understanding, not the transaction.

Option 2 is the honest minimum and still the wrong shape. The page it replaces is a PayPal screen with our colours, and the audience this product exists for is exactly the audience that cannot act on an id.

Option 3 answers a question the product already answers better elsewhere, in the receipt link the person was given at the moment they approved. Its only new content is "and there was nothing else", which is false as a general claim and useless as a specific one.

Option 4 fails on the same ground as option 2 for a different reason: the thing the page would store is the thing the receipt screen tells people we do not store. A login is defensible only if it costs the person's privacy nothing but a cookie — which is ITD 22's problem, and the reason this option is rejected here is that the page, not the mechanism, would be doing the storing.

**Cancelled subscriptions stay.** Filtering them out would make the page say "you have nothing" to a person who has something, and it would erase the only evidence that a cancellation happened. The status is stated on the row; the record behind it already renders the cancelled state with *Next charge: None* and no cancel button.

## Tradeoffs

- The page shows **subscriptions only**. One-time purchases and bills cannot be enumerated through PayPal, so a complete history here is impossible — the page must say what it can see rather than leave the gap to be inferred.
- Each visit costs one listing call plus one read per subscription (ITD 23 bounds it), so the page is slower than a stored list, and it is only as complete as the bound allows.
- A person with several cancelled subscriptions sees a long list of things that are over, which is noise for most and reassurance for the ones who forgot they cancelled.
