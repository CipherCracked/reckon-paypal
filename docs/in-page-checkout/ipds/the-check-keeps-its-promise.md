# IPD 49 — The Check Keeps Its Promise When the Button Cannot Be Aimed At

**Status:** Decided (2026-11-12)
**Date:** 2026-11-12
**Answers:** Problem tree Q3 of `../intro.md` — *what happens to this screen's own work when PayPal's interface is on it?*
**Serves:** IPD 47, which moved the decisive control out of the product's hands; the recognition check and its own contract — an optional check, never a gate; IPD 24, which made every screen answer to the reader's settings.

---

## Problem to solve

The recognition check asks the shopper to recognise a figure already on the screen — *Today's charge, $24.99. Does that match what you expected?* — and it is deliberately **not a gate**. Its own contract says skipping it leaves the payment path exactly as it was, and its code says why: a check that answers silence was replaced with an acknowledgement because *"a check that answers silence is worse than no check at all."*

Saying *yes* today does two things: it replaces the question with *Confirmed: $24.99 is the figure shown under "Today's charge"*, and it moves **focus** to the pay button, so a keyboard user's next press lands where the acknowledgement just pointed them.

With PayPal's button in that slot, the second half is no longer guaranteed. The button is rendered by the SDK, and whether its DOM is reachable — a wrapper, a shadow root, an iframe — is the SDK's business rather than ours. Focusing a control we do not own is not something the screen can promise, and a focus call that silently does nothing is the exact failure the check was fixed for.

So: what does *yes* lead to, when the thing it used to point at is a third party's, and would it be better to make the check a gate so that it points at something predictable?

## Options

### Option 1 — **"Yes" acknowledges in words and moves focus when it can; the acknowledgement is true either way**

The confirmation sentence stays exactly as it is — it is a statement about the figures, not about focus. After it renders, the screen attempts to move focus to the container that holds PayPal's button; if the container is focusable and the move succeeds, the keyboard user's next Tab starts where the button is. If it does not, the sentence is still true, the button is still the next thing in the reading order, and nothing claims otherwise.

*How it feels:* the shopper answers the check and reads a sentence confirming what they saw. A keyboard user usually finds the next Tab lands on PayPal's button; occasionally it does not, and the only difference is one keypress — not a wrong sentence, and not a control that silently did nothing.

### Option 2 — The check becomes the gate: the button is disabled until "Yes"

The shopper must answer before they can pay.

*How it feels:* a screen this product built to be gentle acquires a toll, and the audience it is for is the audience a toll costs most. It also reverses a contract two decisions old, and it makes *skip* — which today leaves the path unchanged — impossible to honour: the button would sit disabled under a question the shopper chose not to answer.

### Option 3 — Remove the check from this screen

The PayPal button is recognisable enough; the check goes.

*How it feels:* the shopper sees the figures, the summary, and a button. The one moment where this product asks the shopper to *check the number before it is taken* disappears at the moment it matters most — leaving the product's strongest comprehension cue on the screens where nothing is being bought.

### Option 4 — "Yes" scrolls the button into view instead of focusing it

The button is scrolled to, and focus stays on the check.

*How it feels:* a visual move for a keyboard user who does not see it, and no change at all for a screen-reader user. It is the weaker version of Option 1: it spends the acknowledgement on an animation rather than on the fact that the figures agree.

### Option 5 — "Yes" does nothing beyond the acknowledgement

The check goes back to acknowledging only, and focus is never moved.

*How it feels:* the sentence is honest and the keyboard path is one Tab longer for everyone. This is what the screen falls back to whenever Option 1's focus move fails — the difference between the two is only whether the attempt exists.

## Reasoning

The deciding factor is **what the check is for**. It was built to make a shopper confirm a figure, not to control a payment. Its fix for silence was a sentence — *Confirmed: $24.99 is the figure shown under "Today's charge"* — and that sentence is true whether or not anything is focused. Option 1 keeps the check's contract intact and treats focus as a courtesy that may or may not be available; Option 2 changes what the check *is* in order to make the control predictable, which is buying the wrong thing.

The second factor is **what the product may claim**. The screen cannot say *the next press will be PayPal's button* if it cannot move focus there. It can say what the figures are, and it can put the button in the reading order. Option 1 is the only one whose acknowledgement is exactly as true on a browser where the focus move fails as on one where it succeeds; Option 4 trades that truth for a scroll.

Option 3 removes the product's best moment of comprehension from its most consequential screen, and Option 2 removes the shopper's ability to decline the question — both are reversals of decisions already made for reasons that have not changed. The third-party button changes where focus wants to go, not whether the check is worth having.

## Tradeoffs

- **On some browsers the keyboard path is one press longer.** The shopper confirms, and the next Tab starts at the button rather than being on it. For an audience that finds long paths expensive this is a real cost, paid only where the focus move does not take.
- **The focus attempt is a best guess at another library's DOM.** It is written against the SDK's rendering as it is today; a change in how the button is mounted could make it a silent no-op, and no test in a jsdom suite can see the difference.
- **The check still asks a question whose answer changes nothing about the payment.** That remains true and remains deliberate: it is a moment of comprehension, not a consent step, and this decision does not pretend otherwise.
- **The acknowledgement is longer than the question it replaces.** In front of a third-party button the sentence has to name the figure *and* say it is the one under a label, because the control itself no longer says what it charges.

## Notes

- Nothing in `components/RecognitionCheck.tsx` changes. The component already returns an acknowledgement and calls `onResult`; the screen decides what a match does. The decision is about the screen's use of that callback.
- The focus attempt targets the container the button is mounted in, not the SDK's internal control. A wrapper with `tabIndex={-1}` and a label is the honest target; whether the SDK's own button then takes the next Tab is the browser's reading order, not a claim.
- The live check for the demo: confirm the figure, press Tab once, and see where focus lands — recorded in the verification notes rather than asserted in a test.
- The check stays where it is on the screen: above the actions, below the figures. Its position is what lets the shopper read a figure and confirm it in the same glance.
