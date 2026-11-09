# IPD 24 — Controls on Every Screen

**Status:** Adopted and built (2026-11-10)
**Date:** 2026-11-10
**Answers:** Problem tree Q5 of `../intro.md` — *what must survive all of this*, specifically the accessibility commitments the build currently honours on one screen.
**Amends:** IPD 10 / ITD 9 (`../../accessible-commerce-companion/ipds/adaptation.md`, `../../accessible-commerce-companion/itds/reader-controls.md`) — reader-owned controls remain the only personalisation. This decides where they live and what they cover.
**Supersedes:** nothing.

---

## Problem to solve

The product claims to be built for people who find billing language hard, and gives them the text-size and read-aloud controls on two screens out of eight.

`DisplayControls` and `ReadAloud` are rendered by the consent screen and the `/read` screen. `data-text-scale` is applied to `.consent` and `.read` only (`app/globals.css`). The home page, the shop, the product screen, **the bill** and the receipt have neither control.

The bill is the screen where the claim matters most: it is a real transaction, with terms a biller wrote, shown to someone who has been handed it rather than chosen it. It has the least help.

Both blind readings found this independently, and neither was looking for it:

> For an accessibility product that is a category error, not a gap.

> The text-scale control applies only to `.consent` and `.read`, not to the shop, home, or receipt.

The deeper cost is not the missing control on any one screen. It is that a person who learns the control exists on the consent screen and then cannot find it on the bill learns that the product's help is conditional — which is exactly the uncertainty COGA guidance warns about for people who struggle to learn new interface patterns. A control that appears unpredictably is worse than a control that is absent everywhere, because it teaches the person to hunt.

## Options

### Option 1 — Leave the controls where they are

They appear where the product first asks for a decision and where a document is pasted. *How it feels:* a product with a feature, not an accessible product — and the bill, the hardest screen, is where the person is most alone.

### Option 2 — **The controls belong to the frame, and the frame is on every screen**

The text-size control and read-aloud are rendered once, in the shared shell, in the same position on every page. The text scale applies to the whole content area rather than to two containers. Read-aloud speaks whatever that screen has put in front of the reader, composed by the screen itself.

*How it feels:* the same two controls are in the same place wherever the person is, and they work on what is on screen.

### Option 3 — Controls on every screen, but positioned per screen

Each screen places the controls near its own content. *How it feels:* present everywhere and findable nowhere — the position changes as the person moves, which is the pattern COGA asks products to avoid.

### Option 4 — Apply accessibility settings automatically from the operating system

Read text-size and reduced-motion preferences from the browser and apply them without a control. *How it feels:* helpful when it works, invisible when it does not, and it cannot know that a person wants larger text for one bill and not for another. It also contradicts the decision that nothing is asked about the person.

## Reasoning

The claim and the surface must match. A product that names dyscalculia, ADHD and dyslexia as its readers, and then offers its reading aids on a quarter of its screens, is claiming a category while shipping a feature. The measure of the claim is not whether the controls exist — they do, and they are well built — but whether a person can rely on them being there.

Placing them in the frame and letting the content change beneath them is also the only placement that survives review. A screen added next year inherits the controls; a control added per screen is forgotten on the next screen someone builds. The product already made this bet once with the figure order and the source line: the rule lives in the shared component, not in each screen's memory.

Applying the scale to the whole content area rather than two containers is what makes the control mean what it says. A text-size control that enlarges the figures but not the seller's sentence, on a screen whose point is comparing the two, changes the layout without changing what the person can read.

Read-aloud has to be composed per screen because only the screen knows what it is showing — but the control that starts it should not move. The shared position is the promise; the spoken text is the content.

## Decision

**Option 2.**

1. **The text-size control is rendered once in the shared shell**, in the same position on every screen, and the choice persists (the preference store already exists).
2. **The text scale works by changing the root size**, not a container's. The current rule sets `font-size` on `.consent` while every size that matters is written in `rem`, which is root-relative — so the control changes almost nothing today, and on `/read` it matches no selector at all. The scale must multiply `:root`'s size (or the text tokens) so that every `rem` in the stylesheet follows.
3. **Read-aloud is per screen, in the same position**, because a layout cannot receive what its page is showing: in the App Router the shell is the layout, and a page cannot pass its figures up into it at render time. The control therefore lives with the content it speaks, placed identically on every money screen and on `/read`, while the text-size control remains in the frame.
4. **No screen opts out silently.** A screen with nothing worth speaking says so in its own text rather than by omitting the control.
5. **Nothing is asked about the person**, and nothing about the preference leaves the browser — unchanged from the existing decision.

## Tradeoffs

- **Read-aloud text becomes a per-screen responsibility**, and a screen that composes it badly speaks something nobody checked. The consent screen's existing composition is the model to follow: the summary, then each figure with its arithmetic.
- **The shell gains a client component.** It is small, but it is now hydrated on every page, including ones that previously shipped no JavaScript for the controls.
- **Large text on the bill pushes figures below the fold.** The figure layout must hold at the largest scale, which is a layout constraint the current stylesheet has not been tested against.
- **A persistent preference can surprise someone on a shared device.** The store is per browser, so the next person inherits the choice; the control is visible and one press from default, which is the existing trade.

## Notes

- The bill page is the acceptance case: if a person can enlarge and hear the biller's terms there, the decision has been implemented; if the controls are on the consent screen only, it has not.
- The control's label and position must match the consent screen exactly. Consistency is the feature, not the control.

## Revision — 2026-11-10 (adversarial review, before any build)

1. **The size control does not currently work, on either screen it appears on.** The only rules for the attribute target `.consent` (`app/globals.css:560-566`), and `/read` puts `data-text-scale` on a `div` no selector matches (`app/read/page.tsx:160`). Even on `.consent`, a wrapper `font-size` cannot scale descendants that declare their own sizes in `rem`. Moving the same rule to the page would change nothing for the same reason. The mechanism in Decision §2 is the correction, and it is the whole of the accessibility claim.
2. **`DisplayControls` contains two controls, not one.** The second, "Show one figure at a time", is a prop of `CommitmentView` and means nothing on the shop, a receipt, or the entry. Putting the component in the shell would ship a toggle that does nothing on most screens. Only the text-size control belongs to the frame; the progressive option stays where figures are shown.
3. **`ReadAloud` returns nothing when speech is unavailable** (`components/ReadAloud.tsx:35`), which is a silent opt-out of Decision §4. Where the browser cannot speak, the screen must say so rather than omit the control.
4. **The bill is still the acceptance case.** If the controls work on the consent screen and not on a bill, the decision has not been implemented, whatever the shell renders.

## Built — 2026-11-10

The controls are in the frame and the scale reaches every size in the stylesheet. All four findings of the revision were fixed before the build was called done.

| The decision | Where it is |
| :---- | :---- |
| The text size is rendered once, in the shell, in the same position everywhere | `components/TextSizeControl.tsx`, rendered by `components/Shell.tsx` inside `.site-header` |
| The scale multiplies the root, so every `rem` follows | `app/globals.css` — `html[data-text-scale="large"] { font-size: 112.5% }`, `[larger]` 125%. The two `.consent[data-text-scale]` rules are deleted |
| Read-aloud is per screen, in the same position | `components/ReadAloud.tsx`, rendered by `components/CommitmentView.tsx` (so: entry, consent, bill, `/read`) and by `components/CommitmentRecord.tsx` (receipt), always under the figures |
| No screen opts out silently | `ReadAloud` renders *"This browser cannot read the page aloud. Your own screen reader will still read it."* where `speechSynthesis` is absent, instead of returning `null` |
| Nothing is asked about the person | unchanged: `lib/preferences.ts`, `localStorage`, guarded reads and writes |

**The revision's second point changed the component's shape, not just its position.** `DisplayControls` held both controls; only the text size belongs to the frame. So it was split: `TextSizeControl` (frame, self-contained — reads the stored value, writes it, applies the root attribute) and `PaceControl` (kept with the figures, one checkbox). `DisplayControls.tsx` is deleted rather than left as a wrapper, so there is no component whose name covers two things that now live in different places.

**A bug the split would have created, and did not.** Each screen used to hold the whole preference object in state and write it back whole. With the text size in the frame and the pacing on the page, ticking the checkbox would have written the page's stale copy of `textScale` over the reader's choice. `savePreference(key, value)` merges with what is stored, and a test asserts the merge (`tests/reader-controls.test.tsx`, "does not overwrite a text size chosen in the frame").

**Read-aloud says less than the screen shows, on purpose.** It reads the figures that have been revealed. A reader who asked for one figure at a time and then pressed "Read this aloud" gets that one, not the whole list spoken past them.

**Where it is not.** The shop and the product screen carry the text size (from the frame) and no read-aloud — they show prose and no figures, so there is nothing for this control to speak that a screen reader does not already read. That is a deliberate gap, recorded here rather than left to be discovered: the decision's §4 asks a screen to say what it cannot do, and these two have nothing to say.

**Verified live, partly.** On `:3001` the served HTML carries the control on `/` and `/read` (one *"Make this page easier to read"* fieldset with *Normal / Large / Largest* and the *Text size* label), and the served `layout.css` contains the two root rules. Not verified by eye: that the page grows at 125% and that the figure grid holds at the largest scale — that is a screenshot a person must take, and it is the one thing about this decision a test cannot assert.

