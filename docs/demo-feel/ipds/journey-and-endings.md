# IPD 15 — Journey and Endings

**Status:** Adopted (2026-11-07) — not yet built
**Date:** 2026-11-07
**Answers:** Problem tree Q4 of `../intro.md` — *how does a person move through it, and where does the journey end?*
**Amends:** IPD 12 (`../../universal-commitment-companion/ipds/front-door.md`) and IPD 8 (`../../accessible-commerce-companion/ipds/commitment-continuity.md`): the record becomes the end of the journey, not an optional extra reached by luck.

---

## Problem to solve

The app has eight routes and one direction. From the home you can go forward; `/product`, `/consent`, `/bill` and `/receipt` offer no link anywhere else, `/shop` has no way back, and `/read` is the only screen with a way to start again. The consent screen is reached as `/consent/pending` — a URL that names an internal placeholder rather than a product.

The result is that each screen works and the visit has no shape. Nothing tells a person they are inside a process, how far they have come, or that there is an end. The research on cognitive accessibility is direct about this: user-action feedback helps people *"avoid leaving a task by reminding them that they are in a process, and where in the process they currently are"*, and GOV.UK treats a back link on every question page as required, not optional. Baymard's checkout work adds the constraint that going back must not lose what was entered.

The product's steps are also unusual: choose → see the commitment → approve at PayPal → return → record. The middle of that journey leaves the app entirely, which is why "where am I?" is a harder question here than on a store.

## Options

### Option 1 — Browser back only

No links; the browser's own controls are the navigation. *How it feels:* the app trusts the browser, and a judge in a video cannot see it.

### Option 2 — **A persistent frame, an explicit way back, one spine, one ending**

Every screen sits inside a frame that names the service. Every screen except the entry carries a back link that names its destination. All four doors join one canonical path. The record is the explicit end, and it offers the two ways out.

*How it feels:* you are somewhere, you can always leave the room you are in, and the visit finishes rather than stopping.

### Option 3 — Linear wizard with numbered progress

A numbered scale across the top, advancing per step. *How it feels:* a checkout with steps — except the number of steps changes with the shape of the commitment, so the scale is wrong for at least two of the four doors.

### Option 4 — Top navigation with tabs for the four doors

Tabs that switch between purchase, subscription, bill and document. *How it feels:* a dashboard with four tools — breadth as the product, which IPD 14 exists to undo.

## Reasoning

This is one decision made once, not a multi-step form. A numbered progress indicator promises a fixed sequence the product does not have: a purchase has fewer steps than a bill, and a document has no payment at all. A scale that changes length by product is a visible inconsistency in the one place the product claims consistency.

A back link is different: it is true on every screen, it costs nothing, and it answers the question the visit actually raises — *what if this is not what I wanted?* GOV.UK's guidance to label a back link with its destination applies here, because "Back" from a consent screen could mean the product, the shop, or the door list, and those are three different places. Naming the destination is the difference between a link and a guess.

The canonical path — entry → commitment → consent → PayPal → return → record — is the spine every door joins. The purchase, subscription and bill doors join it at payment; the document door joins it at the figures and leaves before payment. A product has one spine even when it has several entrances; without one, breadth reads as four prototypes sharing a stylesheet.

The ending matters as much as the entry. The record already exists, already refuses to render unless PayPal confirms the payment, and is already the only artefact that outlives the session. Making it the end of the journey turns a dead end into a conclusion, and gives the video a closing frame.

## Decision

**Option 2.**

1. **A persistent frame** names the service and holds the page; every screen renders inside it.
2. **A back link on every screen except the entry**, naming its destination — *Back to the subscription*, *Back to the shop* — not "Back".
3. **No progress indicator.** The consent screen is a single step; position is carried by the frame and the page heading.
4. **One canonical path**: entry → commitment → consent → PayPal approval → return → record. Every door joins it; the document door leaves it after the figures.
5. **The record is the end.** It offers two ways out — read another document, browse the shop — and never a third one back into PayPal.
6. **A cancelled PayPal return lands on the commitment**, with the message that nothing was charged, not on PayPal.

## Tradeoffs

- **The back link competes with the pay button** on the consent screen. It must sit outside the action area and read as navigation, not as an alternative action.
- **Naming destinations costs copy on every page**, and a wrong destination is worse than a generic "Back".
- **The frame takes vertical space on a phone**, exactly where the figures need it most; the skip link and reading order mitigate this rather than remove it.
- **One spine privileges the paid path.** The document door is complete without payment, and the journey must not imply it is unfinished because it has no PayPal step.

## Notes

- `router.back()` is not used anywhere: it can leave the app, and after the PayPal redirect it returns to a document that no longer exists. Back targets are explicit per page (ITD 13, ITD 14).
- The receipt route stays read-only and continues to refuse an unsettled payment; this IPD changes where it sits in the journey, not what it will render.
- Where the document door's "start again" sits today is the model for every ending in the product: an action, not a dead stop.
