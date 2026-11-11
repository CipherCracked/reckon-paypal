# IPD 29 — One Quiet Line

**Status:** Decided (2026-11-11), implemented
**Date:** 2026-11-11
**Answers:** Problem tree Q1 of `../intro.md` — *how much of a screen may be spent saying what the product is not?*
**Serves:** IPD 21 (the entry shows the work) and IPD 28 (one home in two states); trims copy added by IPD 18, IPD 20, IPD 25, IPD 27 and ITD 22.

---

## Problem to solve

Every screen in this product was decided on its own, and each decision added a sentence explaining itself to the person reading the screen. The player who paid with a sandbox account reads, on the bill alone, that the store is a sandbox, that the payment was not real money, and that a link is an invitation rather than an action. The consent screen adds that the check fits any checkout, not just this one, and then says the sandbox thing again. The front door says nothing has been charged, then adds that no figure was invented to fill a gap — three times across `/product`. The footer of every page says the product was built for a hackathon.

Individually each sentence is true and was put there for a reason. Together they are the loudest thing on the page, and they are the *only* thing on the page that is about the product's limits rather than its work. The owner watching the demo named the effect precisely: *"This is ruining the product from getting a finished feel. And this removes focus from our USP."*

The product's USP is that every figure is traceable to the seller's own sentence. That claim was being made in a paragraph beside the figures, on one screen, and not at all on the others.

## Options

### Option 1 — **One line in the frame, and each screen keeps only what it found**

The facts that are true of the whole store — it is a sandbox, no money moves, nothing is stored — become one sentence at the foot of every page, in the frame that renders every page: *Sandbox store: no real money moves and nothing you do is stored.*

Everything else is judged on one test: **is this a standing fact about the store, or something this screen found?** Standing facts go. Findings stay, in the shortest form that keeps them findings — *Not stated*, *We could not check what this store holds for you*, *Keep this page — it is the only copy*, *check the amount with them*. The reason a figure says nothing about leaving survives, as a clause under the seller's words, because it is an answer about *this* listing rather than a disclaimer about the store.

The frame also loses its footer entirely. A product name and a hackathon are not information the person came for, and a status sentence in the frame became furniture nobody read.

*How it feels:* a person opens the shop and reads the product. The price, the term, the three figures, the seller's sentence, and one quiet line at the bottom saying nothing here is real money. Nine pages in, they have read that line once — and they have read the product nine times.

### Option 2 — Keep every sentence, edit each one shorter

Go screen by screen and compress the copies: *Sandbox — nothing charged.*

*How it feels:* shorter, and still the same nine apologies. The volume is not the sentence's length; it is that the store says *what it is not* nine times, so the compression buys a few lines and leaves the shape of the page alone. It also re-decides the same fact nine times, which is how the sentences drifted apart to begin with.

### Option 3 — Say nothing about the sandbox at all

Treat it as a build detail that no visitor needs.

*How it feels:* clean, and a lie by omission. Someone approves a subscription at PayPal's real-looking checkout, and this store's job is to tell them exactly what they are agreeing to — including that the money is not real. A judge testing the product needs the same sentence, and a person who is told nothing has no way to know a $24.99 charge is a rehearsal.

### Option 4 — A banner across the top of every page

One line, above the header, on a tinted band: this is a sandbox.

*How it feels:* like entering a test environment rather than a shop. The first thing on the page is a caveat, every visit, and the product's best asset — the figures — starts below the fold on a phone. It answers *make sure they know* by making it the headline.

## Reasoning

The deciding factor is **whom the sentence is about**. A qualification about the whole store is a fact about the store, and the frame is where facts about the store belong; a qualification about *this listing's* silence is a finding, and belongs beside the silence it explains. Once the copy is sorted on that test, there is exactly one standing fact and exactly one place for it, and the nine screens stop each holding a slightly different version of it.

The second deciding factor is **what a visitor can distinguish**. A person with three minutes reads the density of a page, not its reasoning. They cannot tell that the tax on a figure was omitted because the listing did not state one — but they can tell that a page about three numbers is mostly a page about what the numbers are not. The sentences that carry actual information (an absence, a failure, an irreversible action) are the ones that survive, because removing those would make the product quieter and wrong.

That distinction is what separates Option 1 from Option 3. Option 3 is the version of this decision that looks finished and stops being trustworthy, and the product exists to be trustworthy at exactly the moment it says something inconvenient. Keeping the caveat in the frame costs one line; dropping it costs the claim that the figures can be checked.

Option 2 is rejected because it fixes the prose and not the pattern: the next feature will add its own sentence, because the structure that invites one is unchanged. Option 4 is rejected because it moves the caveat from the foot of eight pages to the head of all of them, which is a louder version of the problem rather than its removal.

## Tradeoffs

- The caveat is now on **every** page, including the receipt — a person filing a record away gets a line about money that never moved. It is one muted line at the foot, and it is true of the artifact.
- A screen that renders outside the frame to test itself does not carry the line, so the suite has to assert where it *is* (once, at the foot) rather than where it is not. The consent test now asserts the sentence is absent from the component precisely so it cannot come back as a second copy.
- Some screens got noticeably shorter than the amount of work behind them; the bill lost both of its sandbox paragraphs and now explains itself with the figures alone.
- One phrase that was doing real work — *nothing has been charged* — stays on the entry, because it is about what the screen just did rather than about the store. That is the one place the rule needed adjudicating, and the test rule in ITD 28 is what makes it hold.
