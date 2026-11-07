# IPD 17 — Frame Without Modes

**Status:** Adopted (2026-11-07) — not yet built
**Date:** 2026-11-07
**Answers:** Problem tree Q5 of `../intro.md` — *what must survive the restructure, and where does "looking finished" conflict with decisions already made?*
**Amends:** IPD 5 (`../../accessible-commerce-companion/ipds/beneficiary-scope.md`) and IPD 10 (`../../accessible-commerce-companion/ipds/adaptation.md`) by drawing the line between structure and adaptation.
**Supersedes:** nothing. IPD 7's figure order and IPD 13's schedule line stand.

---

## Problem to solve

The changes the rest of this tree asks for — a service header, a back link, a demoted door list, a second rank of links, a footer that names the service — all add items to screens that earlier decisions deliberately kept spare. Three commitments are in the way:

- **No modes, no declared profiles** (IPD 5): one rendering for every reader, nothing asked or inferred.
- **Reader-owned adaptation only** (IPD 10): text size, one figure at a time, read-aloud — chosen, never inferred.
- **Fewer, ordered items** (IPD 7, IPD 13): the figures were reordered by decision weight and the schedule was added as a fourth *thing to look at*, against a design that had already limited what appears.

Without a stated line, every addition can be defended as "products have headers" or attacked as "that is a mode". Both are wrong, and the next five days are not a good time to discover the boundary by argument.

## Options

### Option 1 — No chrome; keep the single column

Structure stays out of the product so the decision area is untouched. *How it feels:* calm and undirected — the reader cannot leave the room they are in.

### Option 2 — **Universal structure, reader-owned adaptation, nothing in between**

The frame — service name, back link, footer — is identical for every reader and offers no choice. It sits outside the decision area and changes nothing about the content. Adaptation stays exactly as IPD 10 left it: three controls the reader owns.

*How it feels:* the same product for everyone, with the same doors, and the reader decides only how the content is paced.

### Option 3 — Rich chrome with navigation options and a settings menu

A navigation bar, a settings control, display options beyond the current three. *How it feels:* a full application — and the first mode in everything but name.

### Option 4 — Layout that adapts to the reader

Infer density, text size or pacing from behaviour, scroll, or an expressed preference at entry. *How it feels:* personalised — and it classifies a person without asking, which IPD 5 refused twice.

## Reasoning

The distinction that resolves the conflict is **what changes the content versus what locates the reader**. A back link and a service name are the same for every visitor, so they cannot classify anyone; they answer *where am I* without touching *what am I reading*. A control that changes the rendering to suit a presumed reader is a mode, whether it is called one or not.

This also fixes where the frame may sit. The decision area has an order chosen by decision weight; putting a link row inside it would compete with the figures and undo the ordering. The frame is outside the reading task, visually quiet, and skipped by the skip link — so a reader who wants only the figures reaches them first, and a reader who is lost can find the way out.

The conflict with "fewer items" is real and is accepted rather than argued away: the frame does add items before the content. What it does not do is add them *to the decision*. The ordering survives; the page acquires a border.

Imagery gets the same treatment. The fastest way to look like a product is photography, and the fastest way to hurt this audience is a picture competing with a figure. Type, spacing and one accent carry the hierarchy; decorative imagery, if any, is hidden from assistive technology and never load-bearing.

## Decision

**Option 2.**

1. **Structure is universal.** The header, back link and footer are identical for every reader and offer no choice.
2. **Adaptation stays reader-owned** and unchanged: text size, one figure at a time, read-aloud. No new controls, no inferred settings.
3. **The frame adds nothing inside the decision area.** Links, status and navigation live outside the block that carries the figures and the schedule.
4. **The frame is skippable and declared.** Skip link first, then landmarks; the content is reachable without passing through navigation.
5. **The four ways in may be demoted, never hidden.** Each still states its shape in the shopper's words.
6. **No imagery beside a figure.** Decorative imagery is `aria-hidden` and never carries meaning.
7. **Copy never explains the design.** No "designed for neurodivergent shoppers"; IPD 5's prohibition stands.

## Tradeoffs

- **More items before the content**, which is exactly what the rendering decisions ordered against. The skip link and reading order are the mitigation, not a removal of the cost.
- **A universal frame cannot suit every reading pace.** A reader who wants nothing but the figures pays one skip-link activation for it.
- **"Structure is not adaptation" is a line that must be held in review**, not a property the code enforces. Every future addition has to be argued against it.

## Notes

- This does not reopen IPD 7's ordering or IPD 13's schedule line; it protects them from the frame.
- The test is one question, applied to any addition: *does this change what a reader sees, or only where they are?* The first is a mode; the second is structure.
- If a future feature needs to change the rendering for a named group, it goes back to IPD 5 rather than being smuggled in as a display option.
