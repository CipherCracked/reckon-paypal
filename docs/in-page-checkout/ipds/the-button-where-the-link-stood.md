# IPD 47 — The Button Stands Where the Link Stood

**Status:** Decided (2026-11-12)
**Date:** 2026-11-12
**Answers:** Problem tree Q1 of `../intro.md` — *what does the shopper's path become, and where does the record come from?*
**Serves:** the owner's queue item R4; IPD 15, which made the receipt the end of the journey; IPD 28, which removed the second control that did what the first one did; IPD 29, which took friction out of this screen rather than adding it.

---

## Problem to solve

The consent screen explains a commitment and then hands the shopper a link. Pressing the primary button creates the order or the subscription and then **disables itself**: the only way on is a `button-secondary` link inside a notice, and pressing that leaves the site for `paypal.com/checkoutnow`. A one-time purchase therefore costs three presses and a departure, and a subscription two — for a decision the page had just spent a screen explaining.

This screen's whole argument is that the decision is made **here**: the figures, the plain-language summary, the optional recognition check, the pacing control and the read-aloud all exist to make one act legible. Then the act itself happens on another company's page, behind a link that looks like any other outbound link.

So the question is not whether to shorten the path — the audit's premise is that a link is not recognisable as PayPal and a button is — but **what takes the link's place, and where it stands.** A control from a third party is being placed on the one screen where the product's control over its own argument matters most, so the placement is the decision.

## Options

### Option 1 — **PayPal's own button occupies the slot the primary button occupies**

The `consent-actions` slot holds one control: PayPal's button. Pressing it creates the object and opens PayPal's approval over this screen in the same act. When the shopper approves, they are returned to this page and it moves them on to the receipt. Nothing else on the screen changes — the figures, the check and the sentences above the button stay exactly where they are.

*How it feels:* the shopper reads the commitment, presses the thing that says PayPal, approves at PayPal, and lands on the record. One press where there were two, and no moment where the page is explaining how to leave it. The button that takes the money is the same object the shopper has pressed on a thousand other sites.

### Option 2 — The primary button stays; PayPal's button appears in its place after the press

The shopper presses *Pay now*, the object is created, and the button is replaced by PayPal's button.

*How it feels:* today's path with a better-looking second step. The shopper still presses twice, and the first press still does nothing they can see except change the control under their cursor — the friction this item exists to remove is intact, and the screen has two buttons in sequence that do the same job.

### Option 3 — A second screen, opened by the button

Pressing the primary button opens a screen that contains only the commitment summary and PayPal's button.

*How it feels:* the decision and the act are now two screens, and the longer one — the figures, the breakdown, the check — is the one the shopper leaves. Everything this screen does to make the commitment legible ends one screen before the commitment is taken. It is also a third press.

### Option 4 — Both controls, side by side

PayPal's button, and beneath it the existing link: *or approve at PayPal's own page*.

*How it feels:* two ways to do one thing, with nothing on the screen to tell the shopper which to choose. This is the defect IPD 28 found on the account page — two sign-in buttons, one of which did nothing — reintroduced at the moment money moves. The fallback has to exist (IPD 50) but it must not be a choice offered to everyone.

### Option 5 — Not built; the redirect stays

The link remains as it is.

*How it feels:* the path is honest and the integration is not recognisable. The shopper leaves the product at the moment of commitment, and the screen where money moves is the one screen without any of this product's work on it. This was a legitimate outcome of the decomposition and it is rejected on the product's own terms, not only the judge's: the audience this product exists for is the audience least served by being handed off.

## Reasoning

The deciding factor is **what the product's argument is about**. Every decision in this tree before this one — the figures, their sources, the plain words, the recognition check — treats the consent screen as *the place where a decision is made well*. Option 3 contradicts that by putting the decision and the act on different screens. Option 2 keeps the path that makes the argument worth little: the screen explains, then the shopper is told how to leave. Option 1 is the only one where the thing the screen built toward is the thing on the screen.

The second factor is **one control, one meaning**. Option 4 offers two controls for one act, and the product has already paid to learn that lesson: IPD 28 removed a second sign-in button because a second control that does the same thing reads as a control that does something else. The fallback belongs to the case where the script cannot load, and it is stated there (IPD 50), not displayed as an alternative.

The third is **what the shopper keeps**. The receipt is the end of the journey (IPD 15), and in the in-page path the product never leaves its own origin until the receipt — so the record is reached from this screen rather than from PayPal's confirmation page. That is one return path to verify instead of two.

Option 5 is rejected with the cost written down rather than argued away: on this screen, the third-party control is the *point* — a recognisable act is what the audit asked for, and the product's own words have already done their work by the time the button is pressed.

## Tradeoffs

- **The screen loses control of its decisive control.** PayPal renders the button, so its size, wording and state are not ours to pace or size. The text-size control above it will not resize it. On the one screen asked to answer to the reader, the most consequential element does not.
- **A third-party script joins the money screen.** It is the repo's first, and it is on the page that asks for money — a new origin, a new failure mode, and a page that is now slower to become payable. IPD 50 owns what the screen does about that; it does not make the cost disappear.
- **The button's label is PayPal's.** *Pay now* and *Approve subscription with PayPal* are our sentences and they say what the act is. PayPal's button says *PayPal* and, by default for a subscription, *subscribe*. The sentence above the button has to carry the meaning that the label used to.
- **A shopper who wanted our words gets theirs.** Someone who needed the screen's plain language to understand the commitment still meets a third party's interface at the end of it. The figures and the sentences above it are the compensation, and they are above rather than beside the button.

## Notes

- The slot is `consent-actions`; nothing else on the consent screen moves. The figures, the breakdown, the recognition check, the pacing control and the read-aloud keep their positions.
- One-time purchases use PayPal's one-time button; repeating and financed terms use its subscription button (IPD 48). Both are the same visual object to the shopper, which is why what they *do* has to be said in words above them.
- The object is created on the press, not on the render: no order and no subscription exists until the shopper asks for one. ITD 39 pins that boundary.
- The existing `/api/paypal/orders` and `/api/paypal/subscriptions` routes stay. Neither is replaced; both are called from the button.
- The `?approved=1` return path remains working, because the fallback link (IPD 50) still uses it. Retiring it would break the only path a shopper has when the script cannot load.
