# IPD 8 — Commitment Continuity

**Status:** Adopted (2026-11-07) — implemented: `/receipt/{id}` plus a next-charge `.ics` download, nothing stored
**Date:** 2026-11-07
**Answers:** Problem tree Q3 (rev. 3) — *What must the product do after payment for the promise made at consent to be kept?*
**Related:** IPD 7 (Rendering Model) decides what the shopper sees before paying; this decides what
they are left with afterwards.

---

## Problem to solve

The consent screen does its work in a single visit and then ends. The shopper approves at PayPal and
returns to a page that says payment is complete. After that, nothing.

That gap is where the measurable harm lives. The average consumer carries **12 subscriptions**, about
**42% have forgotten one is still running**, and roughly **$200 a year** leaks to "ghost"
subscriptions nobody is using. A companion that makes one moment clear and then forgets the person
entirely has addressed the smaller half of its problem.

But the product has bound itself to collect nothing about anyone (IPD 4). There is no account, no
email, no stored order. So the obvious remedies are closed:

- A reminder service needs an address and a reason to keep it.
- A history page needs a record of which commitments belong to whom.
- "We'll nudge you before it renews" is a promise we cannot make and — per the evidence — cannot
  even show would help: renewal-reminder studies **do not demonstrate** that reminders reduce harm.

What is left is the shopper's own memory and the artefacts they already use: a calendar, a printed
page, a link they saved. The question is whether we can load those honestly.

## Options

### Option 1 — Nothing (as built)

Capture succeeds, a note confirms it, the session ends. The commitment's continuation is whatever
the merchant and PayPal already provide.

### Option 2 — The shopper carries the commitment

At the end of a successful payment, the screen offers a **self-contained record**: the three figures,
the renewal date and amount, the seller's exit terms, and where to manage the commitment at PayPal.
Downloadable as a printable page and as a calendar entry keyed to the next charge.

### Option 3 — A record we hold, reachable by a signed link

The server stores the commitment under an unguessable link the shopper can bookmark.

### Option 4 — Opt-in reminders

The shopper supplies an email address, and we send a reminder before each renewal.

---

## Reasoning

**Option 4 is closed twice over.** It needs identity, which IPD 4 forbids, and the evidence does not
support the claim it would let us make. That a reminder *arrives* is not that a reminder *helps* —
behaviour with inattentive consumers is exactly the case where a nudge at the wrong moment is
furniture. Shipping it would be relying on an effect we could not defend.

**Option 3 is storage under a different name.** A link is a record. It requires a database, a
retention policy, a breach story, and — since we would hold order data about a person — a privacy
posture this product has deliberately avoided. For the harm it prevents, that is a large new
liability bought with borrowed credibility.

**Option 1 is honest but empty.** It is what the product does now, and it leaves the shopper with a
warm feeling and no object. The Q3 child question — *what carries the commitment between moments if
nothing may be stored about a person?* — has exactly one answer that survives both constraints: **the
shopper carries it, and we make carrying easy.**

**Why a calendar entry and a printed page, specifically.** They are the two continuity mechanisms
that already live on the shopper's device, need no account, survive us being gone, and work for a
reader who cannot reliably hold a date in memory. A calendar entry with an alarm is the reminder,
delivered by software the shopper already trusts and configured. It is not our reminder; it is theirs.

## Decision

**Option 2.** When a payment completes, the screen offers the shopper a record of what they have
committed to, containing:

1. **What was charged today** and the reference PayPal issued.
2. **The next charge** — date and amount, or "no further charge" for a one-time purchase.
3. **The total across the term**, as shown before payment.
4. **How to leave** — the seller's exit terms, or "not stated" if they published none.
5. **Where to manage it** — PayPal's own subscription management, which exists and is the real
   authority.

The record is offered in two forms: a printable page and a calendar entry (`.ics`) for the next
charge. Both are generated from data already in hand. **Nothing about the shopper is stored, kept or
sent anywhere.** The screen says so explicitly: we cannot follow up, and this record is what replaces
a follow-up.

## Tradeoffs

- **The renewal date must come from somewhere.** For a subscription we hold from PayPal's approval
  response; where it is unavailable, the record shows the interval ("every month from today") rather
  than a fabricated date. A wrong date is worse than a vague one.
- **A calendar entry is only as good as the shopper's habit of adding it.** We cannot measure whether
  it is used, so we cannot claim it changed an outcome. It is a means, not an evidence claim.
- **Two more things on a success screen** risks crowding the moment the shopper is least attentive.
  The record is offered, not pushed: one link each, secondary styling, below the confirmation.
- **The `.ics` format is a download, not an integration.** It will not update when the shopper
  changes their plan at PayPal. The record says what was true when it was made.

## Notes

- PayPal's post-purchase subscription management is the destination for "where to manage it", never
  a page of ours pretending to be it.
- The printable page is a layout of the consent screen's figures plus the renewal data — the same
  numbers, not a second computation.
- What this IPD does not decide: whether the shopper should be able to *see* the record again without
  having downloaded it. Any answer other than "no" reintroduces storage.

---

**Implemented — 2026-11-07.** After a completed payment the screen offers "Keep a record of this
payment", which opens `/receipt/{paypal-id}?slug=…`. That page asks PayPal what the order or
subscription actually is and refuses to render anything unless it is settled, so the record is a
statement by PayPal formatted by us rather than a claim of ours. It lists the next charge (or says
there is none), the term total, the exit cost, the reference, and the route to PayPal's own
subscription management. A recurring commitment additionally offers an `.ics` with a one-day alarm,
built from `next_billing_time` — the reminder the shopper configures on their own device, because we
cannot send one.
