# IPD 28 — Where the Record Lives

**Status:** Decided (2026-11-11), implementation in progress
**Date:** 2026-11-11
**Answers:** Problem tree Q1, Q2 and Q4 of `../intro.md` — *where does a person's own record live, how do they move between the parts, and what does the product stop doing?*
**Serves:** IPD 27 (the way in sits in the frame); supersedes one paragraph of it.

---

## Problem to solve

The owner made the argument every shop makes: *"does Amazon not have login and people just select the thing they want to buy and pay?"* They are right about the page they are thinking of, and the product is wrong in a way that produces that feeling without requiring the wall.

Amazon gates **Your Orders**, not browsing. This product gates the equivalent — `/account` — and still reads as disjoint, because the gated thing is not where a person would look for it, and the ungated thing does not lead there. The entry asks a returning shopper to read an explanation of a commitment they have already made before showing them the commitment. Meanwhile the header's *Sign in* control, on the one screen where signing in happens, links to the page it is on: a filled button that does nothing.

The request underneath the complaint is coherence: one front door, one place where your own business lives, and a way between the parts. The request on the surface — a wall before the main page — would spend the product's best asset (a stranger seeing the transformation without an account) on its flakiest subsystem (a sandbox identity integration that needs three hours of dashboard propagation to work at all).

## Options

### Option 1 — **One home in two states**

`/` is the home, and what it says depends on who is asking. Signed out it is the proof: the seller's words beside the three figures, then a card that says what signing in reads and keeps, with the button, then the search. Signed in it is the record: the person's commitments first, then the search, and one line back to the worked example so the proof is one click away rather than the first thing to scroll past.

`/account` becomes the sign-in screen in one state and a redirect in the other: signed in, it sends the person to `/`, where their record now is.

The header carries navigation — *Your commitments*, *Shop*, *Read a document* — and the account control names the state. Signed out, the account control starts the sign-in rather than opening a page about it, because the explanation now lives on the front door where it belongs; the account page keeps that explanation for anyone who arrives there directly or is sent back with a reason.

*How it feels:* a returning shopper opens the site and their own commitments are the first thing on it, with a search box under them and the shop one click away. A newcomer opens the same address and sees the product work before anything is asked of them.

### Option 2 — A wall at the front door

`/` requires a sign-in; the explanation moves behind it, as the owner suggested.

*How it feels:* a stranger meets PayPal's sandbox consent screen before knowing what the product does — on a deployment where *Log in with PayPal* is not switched on, before anything at all. It also puts "we keep a session for two hours" in the same breath as the product's best sentence: *nothing about this purchase is stored on this site.*

### Option 3 — Leave the entry alone and add navigation

Keep `/` exactly as it is, add the nav to the frame, and let the account page stay the destination.

*How it feels:* better connected, and the same first screen: a stranger still meets a taxonomy of commitment shapes before anything they can do. The owner's complaint is not only that the parts were unreachable — it is that the first thing on the page is a list of features.

### Option 4 — Two products: a marketing home and a signed-in app

`/` explains; `/app` is the record; signing in lands on `/app`.

*How it feels:* like two products with one brand. It doubles the frame's job — each area would need its own answer to "where is the shop from here" — and this domain has one kind of page.

## Reasoning

The deciding factor is **what the front door is for**, and it is not one thing. It is an explanation for someone who has never been here, and a way back for someone who has. Every option that picks one of those is a wall on one side or a tour on the other; Option 1 is the only one that reads the request rather than choosing between its two halves. It gives the owner exactly what a wall gives — a returning shopper lands on their own record — without charging a newcomer an identity for an explanation, and without spending the video's first thirty seconds on a redirect.

The second deciding factor is **where the evidence is**. A person's commitments are a claim about them, so they belong behind identity; the product working is a claim about the product, so it belongs in front of one. That is precisely Amazon's split, and it is the split the audit arrived at independently: the gate is on the record, and the record should be the home.

Option 3 is rejected because the taxonomy of commitment shapes is a feature list where a task belongs — the owner's own objection was to things that do not connect, and a list of *other ways money is asked of you* connects to nothing a person came to do. What replaces it is the two things a person actually does here: see what they have already agreed to, and check something new.

**One thing this decision changes about IPD 27.** That document said the header control would stay a link to `/account` so the page could explain what signing in does before sending anyone to PayPal. Live, that made the one control a person looks for into a button that does nothing on the screen where it matters, and the owner found it in a minute. With the explanation now on the front door, the control can be the action: signed out it points at `/auth/paypal/start`, signed in it points at `/`. The explanation is not lost; it is one page up, where the person is.

## Tradeoffs

- `/` has two states to keep true, and the frame's two words now have to be right on a page that changes meaning. The label is derived from the same cookie the page reads, so they cannot disagree.
- A signed-in visitor sees two cancelled subscriptions as their first screen. That is honest and it is a poor opening, so the record view keeps a line pointing at the worked example, and the empty and unreadable states read as the account page's do.
- The account page loses its signed-in branch. Any bookmark to it now redirects, which is one hop for a person who kept the URL.
- The header grows a nav row. On a phone it must not grow taller, so the text-size control collapses behind a disclosure — it stays in the same place on every screen, which is what IPD 24 asked for, but it stops owning the first line.
- The bill stops being a peer door. It is demoted to a line under the document reader, which is a smaller entrance for the only Invoicing surface in the product.
