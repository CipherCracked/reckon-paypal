# IPD 27 — Where the Way In Lives

**Status:** Decided (2026-11-11), implementation in progress
**Date:** 2026-11-11
**Answers:** Problem tree Q6 of `../intro.md` — *where does the way back in sit in the product?*
**Serves:** IPD 25 (what the signed-in page shows); changes the frame described by ITD 13.

---

## Problem to solve

The way back in exists and works, and almost nobody would find it. It is a sentence at the bottom of the entry screen — *"Already agreed to something here?"* — after the worked commitment, the three other doors and the shop link. The account page it opens then greets a visitor with a link back to where they came from, as though the page were a detour rather than a destination.

That placement contradicts the reason the feature exists. IPD 25 built it for someone who lost a link because they closed a tab; a person in that position is looking for an account control in the header, because that is where every shop they use keeps one. The audience this product serves is also the audience least likely to read to the bottom of a page and notice a sentence that looks like a footnote.

There is a second, quieter defect. Someone who has signed in has no way to see that from the frame. The state is real for two hours and visible only on the one page that reads it, so a person cannot tell whether they are signed in anywhere else, and cannot sign out from anywhere else either.

The temptation is to over-correct: make the front door a sign-in wall, and let the person in before they see anything. That would undo IPD 14, which made the entry prove the product on one real commitment before asking the visitor for anything at all. A stranger should be able to see what the product does without proof of identity.

## Options

### Option 1 — **An account control in the frame, on every screen, naming the state**

The header carries one control beside the service name: *Sign in* when nobody is signed in, *Your commitments* when somebody is. It sits next to the text-size control, so it is in the same place on every screen, including screens built later, and the frame is where "who is this person" belongs — the same reason IPD 24 put the reader's text size there rather than on each page. The account page becomes a destination: the signed-out version is a focused card that says what signing in will show and what it will not keep, and the signed-in version opens with the account and a way out.

*How it feels:* a person looks at the top right of any screen, as they would in any shop, and finds the two things they expect there: their own settings and the way into their own record.

### Option 2 — A stronger link at the bottom of the entry

Keep the page as it is and make that sentence a button with its own heading.

*How it feels:* clearer than a footnote and still below the fold on a phone. It asks a person who has already lost one link to scroll to the bottom of a page they have not read.

### Option 3 — Sign in at the front door, before anything else

The home route shows a sign-in gate; the product's explanation moves behind it.

*How it feels:* an account wall in front of a free explanation, aimed at people who distrust billing language. It also makes a judge's first thirty seconds of the demo a login form rather than the product's claim.

### Option 4 — A separate /signin route, with the account page behind it

The conventional two-page shape: a marketing-shaped sign-in screen, then the dashboard.

*How it feels:* one extra hop and one extra screen to keep honest. This product has one destination and one state to explain; splitting them means two places that can disagree about what signing in does.

## Reasoning

The deciding factor is **where a person looks when they have lost something**. A shop keeps its account control in the frame, and a person who cannot find what they agreed to is not going to read the page to find a different arrangement — they will look at the top, twice, and conclude the site has no account. Option 1 is the only placement that survives that person's behaviour, and it is the same argument that put the text-size control in the frame: a control that appears on some screens teaches people to hunt for it.

The second deciding factor is **the state has to be visible where it is true**. A signed-in session that no screen admits to is a session the person cannot reason about: they cannot know whether closing the tab signed them out, and they cannot choose to sign out from a page that still shows their commitments. Naming the state in the frame is what makes the two-hour cookie a thing a person holds rather than a thing that happens to them.

Option 3 is rejected on IPD 14's ground, not on taste: the entry exists to show the product before it asks for anything, and the audience it serves has the least reason to trust a site that asks first. Option 4 is rejected because the page *is* the sign-in screen in one state and the record in the other, and two routes would make it possible for the frame to say one thing and the page another.

The sign-in still starts from the account page rather than from the header control directly. Text, not a hop: the control says *Sign in*, the page it opens says what signing in reads and what it keeps, and only then is there a button that leaves for PayPal. Handing someone straight to a third-party consent screen from a header link would ask for their PayPal account before the product has said one word about what it will do with it.

## Tradeoffs

- The frame now reads the session cookie on every screen, so no page can be rendered before that read. It is a signed-cookie parse, not a lookup, and the payment screens were already dynamic.
- Two words in the header — *Sign in* and *Your commitments* — now have to be true at once across eight routes, which means the frame's copy is a small claim of its own: *Sign in* may not appear on a deployment where signing in cannot work.
- The account page loses its back link. The frame is the navigation, and a back link inside a destination reads as an apology for being one.
