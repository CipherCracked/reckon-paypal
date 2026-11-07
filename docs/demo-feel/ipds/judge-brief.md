# IPD 16 — The Judge Brief

**Status:** Adopted (2026-11-07) — not yet built
**Date:** 2026-11-07
**Answers:** Problem tree Q1 of `../intro.md` — *what is a judge actually judging in three minutes, when they may never run it?*
**Amends:** `../intro.md`'s assumption that the explanation belongs inside the product, and IPD 14's disclosure line. The four facts are unchanged; where they are carried changes.
**Supersedes:** the earlier draft of this IPD, which put the same four facts on a route inside the app.

---

## Problem to solve

The rules are explicit that judges **are not required to run the project** and may judge solely on the text, images and video. Presentation and Design are two of five equally weighted criteria, and Design asks for *"a complete, coherent product experience"*, not a proof of concept.

The product's answer to that today is the README and the video. Both are packaging: they sit outside the app and are not part of the experience. Inside the app there is nothing a reader can consult — no about, no method, no statement of limits. The credibility research names this twice: up-front disclosure is one of the four factors people weigh, and an isolated site with no outbound links and no sense of an organisation reads as evasive.

A judge deciding in three minutes needs four facts in one place: what the check does, where every number comes from, what the product refuses to do, and what is not real. Three of those are already decided and documented; none of them is visible anywhere a judge will look.

The first draft of this IPD put them on a route inside the app. That is the wrong vehicle, and the reason is structural rather than stylistic: **the audience for these four facts arrives from Devpost, not from the app.**

## Options

### Option 1 — Leave it to the README and the video

The product stays silent about itself; the submission copy carries the explanation. *How it feels:* a working screen that will not say what it is — and a judge who never opens the repo reads only a video.

### Option 2 — **A standalone brief, outside the product**

One self-contained page that lives beside the submission rather than inside it: linked from the Devpost description and from the top of the README, opened directly as a file or served statically. Same four facts, same voice, same one minute — but it travels wherever the judge is, and it can carry the screenshots.

*How it feels:* the team answers the careful reader in plain language, and the product is left to be a product.

### Option 3 — A route inside the app, linked from the footer

The original draft: a ninth route stating the four facts, reachable from every screen. *How it feels:* a shop with a printed apology taped to the counter — the right words, in a place the reader has to already be standing.

### Option 4 — A full methodology document

A long, printable account of the evidence, the model, the guard and the decisions. *How it feels:* a research appendix bolted to a shopping tool — thorough, and unread in three minutes.

## Reasoning

The submission rules settle the placement question before design does. A judge who is not required to run the project may never reach a footer link. The README and the Devpost page are where they actually are, and a brief those two can link is reachable without the app running at all — from a phone, from a download, from a cached page.

Putting the brief inside the app also asks the product to do something it has spent four IPDs avoiding: talk about itself. The product's surfaces are deliberately few and its voice is deliberately narrow — one sentence and three figures. A ninth route whose job is to explain the other eight widens that surface and changes the product's tone from stating to justifying. The two audiences are genuinely different: the shopper needs a commitment stated, the judge needs the method defended.

A separate page also carries what an in-app route could not. The strongest evidence for a judge who will not run anything is an image of the thing running: the entry with the figures worked, the consent screen with its arithmetic, the record refusing an unsettled payment. A standalone HTML page can hold those next to the claim they support, with captions, in the same file.

The four facts themselves are unchanged, and so is the limit on them: what it does, where the numbers come from, what it refuses, and what is not real. The last is the one most projects omit, and the one that makes the other three believable.

## Decision

**Option 2.**

One page, no more than a minute to read, outside the product, in four sections:

1. **What this does** — the same sentence the entry opens with, and nothing more.
2. **Where the numbers come from** — the catalogue or PayPal for an order, invoice or subscription; the shopper's own text for a document, with every span verified as a literal substring; the guard that drops any figure the code did not derive.
3. **What it will not do** — no advice, no verdict, no profile, no account, no storage; an unpublished term is stated as not stated, never estimated.
4. **What is not real** — payments run in PayPal's sandbox; the catalogue is an example; no user testing has been done, so the product claims legibility, not measured outcomes.

**Placement and form:**

- **Self-contained HTML.** One file, no build step, no external dependencies, readable with JavaScript disabled and when opened from disk. It is the one artefact that has to survive being emailed.
- **Linked from the Devpost description and the top of the README**, and named in the video's description. Not linked from the app.
- **Kept in the repository**, beside the decision records it summarises, so it versions with the code it describes.
- **Its images are captures of the running build**, never mockups, and each is captioned with what the reader should notice.

**What stays in the product:** exactly one factual disclosure, at the point of payment — that payments run in PayPal's sandbox and the catalogue is an example. The product states it once, where money is involved; the brief explains it. The header names the service; the footer carries the service name and the licence line.

## Tradeoffs

- **Two artefacts, one claim.** The brief can drift from the build while the build keeps changing. The mitigation is that it quotes the sentences the app actually uses and cites figures the catalogue actually computes, and that it is re-read against the build before submission — not that it is generated.
- **The brief is unreachable from the app**, so a judge who lands in the app and wants the explanation must go back to Devpost. That is the correct direction of travel: they arrived from there.
- **A hand-maintained HTML file has no tests.** Nothing fails when it goes stale. This is the price of keeping it small enough to open offline.
- **"What is not real" makes the work smaller on purpose.** A judge may read the sandbox disclosure as a limitation; the alternative is a judge discovering it themselves.

## Notes

- The brief is not a substitute for the README's setup instructions, which the rules require separately, nor for the video, which must show the project working.
- It should be written in the same voice as the consent screen — plain statements, no adjectives — or it becomes the marketing page this IPD rejects.
- If the video opens on the brief for ten seconds, it establishes the claim before showing the mechanism; that is a presentation decision, not a product one.
- The screenshot set is a dependency: the two screens that must exist first are the entry (ITD 16) and the frame (ITD 13), because those are the two the brief's images will show.
