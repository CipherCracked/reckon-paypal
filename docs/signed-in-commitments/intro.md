# Signed-In Commitments — Problem Decomposition

**Status:** Decomposed (2026-11-11); decisions 25–26 and 22–23 written the same day, implementation in progress
**Date:** 2026-11-11
**Question this document exists to answer:** *A person agreed to something here and has lost the link — what may we show them, and what are we allowed to know?*
**Context:** PayPal AI Hackathon 2026 · solo · submissions close **2026-11-12, 5:00 PM EST** (one day)
**Builds on:** `../accessible-commerce-companion/` (the doors, the receipt), `../figure-provenance/` (every figure has a source or an absence). The money model, the figure order, the guard and the provenance rules survive unchanged.

---

## Why this tree

The product has no identity and never has. A shopper opens `/shop`, checks a commitment, approves it at PayPal, and lands on `/receipt/{id}` — a page keyed by PayPal's own id, which works because the id is in the link we handed them. Nothing is stored: not the order, not the shopper, not the session. That is a deliberate claim, and it is on the one screen a person keeps.

It has a cost, and the cost falls hardest on the audience the product is for. A shopper with ADHD who approves a subscription and closes the tab has no way back in. The receipt exists, but only at a URL they no longer have. PayPal's own **Automatic payments** page can cancel the agreement (the receipt links to it), so the money is not lost — but the *explanation* is: the three figures, the arithmetic, the sentence the term came from. The thing this product makes is not the payment; it is the understanding, and the understanding is not recoverable.

So the question is whether a person can ask "what have I agreed to here?" and get an answer.

### What the evidence says (probed 2026-11-11, not assumed)

| Question | Answer | How it was established |
|---|---|---|
| Does the shop take real money? | Yes — Orders v2 capture, Subscriptions v1 approve/cancel, Invoicing v2 send | Live runs recorded in `context.md` |
| Does PayPal offer a login? | Yes — the Identity API ("Log in with PayPal"), live in sandbox | `developer.paypal.com/log-in/build` |
| Is it enabled on this app? | **No.** The connect endpoint returns *"Looks like this action is not supported (invalid client_id or redirect_uri)"* | Connect URL followed with the sandbox client id |
| Does it give us the payer's records? | **No.** It gives a `payer_id` and a verified email, nothing else | Identity API scope list |
| Can PayPal list a payer's orders? | **No.** Orders v2 has seven endpoints; none lists | Orders v2 reference |
| Can PayPal list a payer's subscriptions? | **Only by scanning.** `GET /v1/billing/subscriptions` is *"all subscriptions for merchant account"* — filters are `plan_ids`, `statuses`, dates. It returns `{id, status}` only | Called live: 2 subscriptions returned |
| Is the payer on the record? | Yes, on the per-id read: `subscriber.payer_id: D5CKAUQ8V7ADL` for the sandbox buyer | `GET /v1/billing/subscriptions/I-GPD3KPT15D79` |
| What does the sandbox hold today? | Two subscriptions, both `CANCELLED` | The same call |

The asymmetry is the whole problem. **Identity is cheap and records are expensive.** PayPal will tell us who someone is in one call and give us no way to ask what they bought; the only route from a person to their commitments is to enumerate everything the merchant holds and read each one until the payer ids match.

---

## Problem Statement

We can let a person prove who they are. We cannot ask PayPal what they agreed to. Between those two facts sits a design decision that is really a claim decision: what the page says, what it leaves out, and whether the "nothing is stored" promise survives it.

Three tensions have to be settled together:

| The product wants | What the platform allows |
|---|---|
| "Here is everything you have agreed to here" | Only subscriptions this merchant created — one-time purchases and bills cannot be enumerated at all |
| "Nothing is stored" | A sign-in that is not remembered makes the person sign in again on every visit |
| "This is your record" | The record only exists while the merchant's API key can read it; there is no personal copy |

None of the rows is a defect. They cannot all be answered the same way, and choosing is the work.

---

## Goals

1. A person who signed in at PayPal can see the subscriptions this store holds for them, read live at the moment they ask.
2. Each one shows the same three figures as everywhere else, computed by the same code, with the same provenance rules.
3. Nothing about the person is stored on our side beyond what keeps them signed in for the visit.
4. Nothing on the payment path changes. Checkout stays a guest checkout.
5. Every absence is stated as an absence — including the ones this page can never fill.

## Non-goals

- Accounts, passwords, email verification, profiles, preferences.
- Listing one-time purchases or bills. PayPal cannot enumerate a payer's orders, and the page must not imply it can.
- Gating a purchase behind sign-in.
- Showing the person's commitments at *other* merchants. We can only see what our own key can read, which is a fact about being a merchant, and saying otherwise would be false.
- Replacing the receipt. A receipt link stays the record a person keeps; this is the way back to it.

## Constraints

- **The Identity API must be enabled on the sandbox app** (dashboard, not code) with a registered return URL. Until then the flow cannot complete.
- Listing is merchant-scoped and paginated at 20 per page, with no payer filter; each subscription needs its own read to learn whose it is.
- The sandbox currently holds **two subscriptions, both cancelled**, so an empty-looking page is the honest default until another is approved.
- One day remains; the video is a Stage-1 gate and comes first in the order, not in importance.

## Assumptions

- Judges will watch a video rather than run the app (`paypal-hackathon` skill), so this feature must read clearly in one screen and one sentence.
- The sandbox buyer in the README is the account a judge or the operator will sign in with.
- A cancelled subscription is still a thing a person may want to see, because "I already cancelled that" is an answer.

---

## Problem Tree

```text
├── Q1. What does signing in let a person see?
│   ├── Only the subscriptions this store created — is that stated, or implied?
│   ├── Cancelled ones: shown as records, or hidden because they are over?
│   └── The three figures on this page, or a list that links to each record?

├── Q2. Where does identity come from, and what does it hold?
│   ├── Log in with PayPal, or an identity of our own (email, password)?
│   ├── What travels in the cookie, for how long, and what does it authorise?
│   └── Does anything on the payment path change? (Checkout is a guest checkout.)

├── Q3. How are a person's records found without storing them?
│   ├── Enumerate the merchant's subscriptions and match each payer on its own read.
│   ├── How far does that scan go before it gives up — pages, time, concurrency?
│   └── What if a payer id and an email disagree about who this is?

├── Q4. What may the page say when it finds nothing, or cannot look?
│   ├── "You have none here" and "we could not check" are different sentences.
│   ├── Login not enabled, PayPal down, deadline exceeded: which of them does the page admit?
│   └── Is an empty list ever a finding?

└── Q5. What happens to the claim that nothing is stored?
    ├── A cookie is state. Does the receipt's copy have to change, and to what?
    ├── README, judge brief and demo script each repeat the claim.
    └── Is "we keep a cookie, not a record" stronger or weaker than "we keep nothing"?
```

---

## Decisions

| # | Question | Document |
|---|---|---|
| IPD 25 | Q1 — what the signed-in page shows | [`ipds/signed-in-page.md`](ipds/signed-in-page.md) |
| IPD 26 | Q4 — what it says when it finds nothing or cannot look | [`ipds/empty-and-unreadable.md`](ipds/empty-and-unreadable.md) |
| ITD 22 | Q2, Q5 — identity and what is kept | [`itds/identity-and-session.md`](itds/identity-and-session.md) |
| ITD 23 | Q3 — finding a person's records without storing them | [`itds/discovery-without-storage.md`](itds/discovery-without-storage.md) |

---

## Open questions

- **Enabling the integration is manual.** The exact dashboard path needs confirming on this app: whether "Log in with PayPal" appears for a sandbox app created for Orders/Subscriptions, and whether `localhost` return URLs are accepted in sandbox. Until it is enabled, everything below is built but unproven.
- **`user_id` vs `payer_id`.** The userinfo response's `user_id` is documented as the payer id; that needs one live check against `subscriber.payer_id` on a record we know (`D5CKAUQ8V7ADL`) before the matching rule is trusted.
- **Sandbox data is thin.** Both existing subscriptions are cancelled. An active one has to be approved before the video, or the page demonstrates only the cancelled state.
- **One-time purchases are invisible here.** Should the page say so outright, or is that a footnote that spends attention the page cannot spare?
