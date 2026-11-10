# IPD 26 — Empty, and Unreadable

**Status:** Decided (2026-11-11), implementation in progress
**Date:** 2026-11-11
**Answers:** Problem tree Q4 of `../intro.md` — *what may the page say when it finds nothing, or cannot look?*
**Serves:** ITD 23, which decides what a scan returns when it gives up.

---

## Problem to solve

Every screen in this product has one rule it will not break: **an absence is stated as an absence, never filled and never smoothed.** A seller who published no exit fee gets *"Not stated"*, not `$0.00`. A document that does not say how many payments there are gets a blanked total and the reason, not an estimate.

A signed-in page has three ways to end with nothing on it, and they are not the same fact:

1. **We looked and found none.** This PayPal account has no subscriptions at this store. That is a finding.
2. **We could not look.** The identity integration is disabled, PayPal is unreachable, the merchant key is missing, or the scan hit its bound. That is a failure, and it says nothing about the person.
3. **They are not signed in.** There is no question yet.

Merging 1 and 2 is the same error as printing `$0.00` for an unpublished fee: the screen would report an emptiness the evidence does not support, on the one page whose purpose is to tell a person what they hold.

## Options

### Option 1 — **Three states, three sentences, never merged**

*Found none:* "This store holds no subscriptions under your PayPal account." Said as a finding, with the fact that only subscriptions are visible here.

*Could not look:* "We could not check what this store holds for you" plus which of the causes applies — identity not enabled, PayPal did not answer, or the scan stopped before the end — and a way to try again. Never the word "none".

*Not signed in:* the sign-in button and one line saying what signing in will and will not show.

### Option 2 — One sentence for 1 and 2: "Nothing found"

*How it feels:* uniform, short, and wrong in the direction that costs the person the most. Someone with an active subscription, shown "nothing found" during a PayPal outage, concludes they have no subscription — or that the product is broken. Both are recoverable; the first may not be noticed.

### Option 3 — An empty list with a refresh control

*How it feels:* a table with no rows. It does not claim "none" in words, but an empty table is read as one, and the refresh control invites the person to retry a failure we have not named.

### Option 4 — Hide the page until it can be certain

Do not offer the entry point until the integration is proven working.

*How it feels:* nothing at all. Honest, and it removes the one way back that this work exists to provide.

## Reasoning

The deciding factor is **what the person does next**. "None" tells someone their subscriptions are over or were never made — a conclusion they may act on by stopping to worry, or by assuming the product is right when it is not. "We could not check" tells them to look elsewhere or try again. Only one of those sentences can be safely wrong, and it is the second.

The second deciding factor is that this product has already made this decision twice, and both times the same way: the exit figure has three states rather than two (IPD 19), and a document whose total cannot be supported is blanked with the reason rather than estimated (`lib/document/read.ts`). A signed-in page that collapsed "none" and "unknown" would be the first screen in the product to break the rule — and it would break it on the page that most needs to be trusted, because the person cannot check the answer anywhere else in the app.

A partial scan is a **third** form of "could not look", not a form of "none". ITD 23 bounds the scan (pages, time, concurrency); when a bound is hit, the page lists what it found and states that it stopped, in the same way the reader shows its discarded spans and counts them. What it must never do is present a bounded scan as a complete one.

## Tradeoffs

- Three states mean three pieces of copy, three branches and three tests on a page with one day to build — the least glamorous option and the only one that cannot mislead.
- "We could not check" is a worse demo moment than a full list. It is also the state a judge is most likely to see if the sandbox integration is not enabled, which makes its copy the most important on the page.
- Saying "only subscriptions are visible here" on an empty page spends attention on a limit rather than an answer; not saying it lets the page imply a completeness it does not have.
