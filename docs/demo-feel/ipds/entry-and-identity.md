# IPD 14 — Entry and Identity

**Status:** Adopted (2026-11-07) — not yet built; disclosure line revised the same day to move the explanation out of the product (IPD 16)
**Date:** 2026-11-07
**Answers:** Problem tree Q2 and Q3 of `../intro.md` — *which signals make it read as a demonstration*, and *what the first screen must establish*.
**Amends:** IPD 12 (`../../universal-commitment-companion/ipds/front-door.md`). The four-door capability stays; the four-equal-cards rendering does not.
**Supersedes:** nothing.

---

## Problem to solve

A person who has never seen this opens the home page and meets an eyebrow, a headline, four identical cards in one column, a line to the shop, and a footnote. The metadata a search result or link preview shows begins *"A demo store that…"*. Nothing on the screen says who is behind it, what happens after a click, or why the four cards belong to one product.

The cost is not ornament. Credibility research finds design quality and up-front disclosure among the factors people weigh, and that an isolated site — no siblings, no outbound link, no sense of an organisation — reads as evasive. The first aesthetic judgement forms in about 50 ms and colours everything after it. For a judge who will not run the product, this screen *is* the product.

Four equal tiles also say the wrong thing about breadth. A menu is what you show when the options are the product; here the product is what happens to one commitment, and the four ways in are evidence that it generalises.

## Options

### Option 1 — Keep four equal doors and restyle the cards

The screen keeps its shape and gets better spacing, a stronger headline, a footer. A visitor still chooses before learning what the product does. *How it feels:* a tidy prototype gallery — four things to try, none of them the point.

### Option 2 — **Statement, one commitment worked in full, the rest in a second rank**

One sentence says what the product does, and to what. Beneath it, one real commitment is shown already worked — its three figures and their arithmetic visible before any click — with a single action leading into the full journey. The other three ways in sit below as a quieter row of links, each labelled by what the shopper is being asked. The shop keeps one line.

*How it feels:* the product introduces itself by doing the thing, then offers the other shapes as proof it generalises.

### Option 3 — Storefront first, translation at payment

The home is the shop; the check appears when a shopper is about to pay. *How it feels:* an ordinary store with a surprise at checkout — and the bill and document paths become unreachable from the first screen.

### Option 4 — Guided tour

A short scripted walkthrough of each door, advancing on a button. *How it feels:* a product video rendered as a page; the shopper watches rather than uses.

## Reasoning

The first screenshot has to answer *what is this?* without a click. A menu of four doors answers *what are the options?* — a question a visitor can only ask once they already know what the product is.

Showing one commitment already worked is the difference between asserting the claim and demonstrating it. It also serves the person the product was built for: the figures are on screen before any decision, so a reader who cannot hold a quantity in mind sees the gap between the charge today and the cost across the term in one glance, rather than being asked to imagine it.

Demoting the other three keeps the breadth the previous tree bought without letting breadth become the first impression. The row still names every way in, so nothing is hidden; it stops presenting four equals as the product.

The identity change belongs to the same decision. The page calls itself a demonstration in its metadata, and the consent screen calls itself one in a footnote. Up-front disclosure is a credibility signal, but disclosure is not self-deprecation: a factual statement of status — sandbox payments, example products — belongs once, where a reader looks for it, not as a caption on every screen.

Where that once is has since been decided more sharply: in the product, the statement belongs at the point of payment, and the fuller account of what is real belongs outside the product entirely (IPD 16). A shopper needs to know what they are agreeing to when they pay; a judge needs the method defended, and they are rarely the same reader at the same moment.

## Decision

**Option 2.**

1. **One sentence first**, in the consent screen's voice, naming what the product does and to what.
2. **One commitment worked in full above the fold** — the subscription, because the gap between the charge and the term is the claim in one glance. Its figures and arithmetic are visible with no interaction and no model key.
3. **One primary action** from the worked example into the full journey.
4. **The other three ways in as a second-rank row**, each naming what the shopper is being asked (*a bill you were sent*, *a document you pasted*), not the system's name for it.
5. **The shop stays one line.** It is where a purchase is chosen, not the product.
6. **The service is named** in a persistent header. Its status is stated once inside the product — sandbox payments, example catalogue — on the consent screen, where money is involved. The explanation of what is and is not real belongs to the judge brief outside the product (IPD 16); the footer holds the service name and the licence line only.

## Tradeoffs

- **Above-the-fold figures compete with the headline.** The worked example must not push the sentence out of view on a phone.
- **One worked example privileges one shape.** A shopper who came for a bill meets a subscription first and must read the second rank to find their door.
- **Demoting the doors weakens a claim the last tree made explicit**: that the product handles four kinds of commitment equally. The second rank has to be legible enough to carry it.

## Notes

- The worked example's figures come from the catalogue and are computed at render time; the entry must say so rather than implying a PayPal order already exists (see ITD 16, and the attribution defect recorded in the audit).
- The video may follow a different door than the entry demonstrates — the bill is the stronger opening — provided both are inside the same frame.
- The consent screen is the only place in the product where the words "sandbox" and "example" need appear. The footer does not carry a status line: an apology repeated on every screen stops being disclosure and becomes the product's self-description.
