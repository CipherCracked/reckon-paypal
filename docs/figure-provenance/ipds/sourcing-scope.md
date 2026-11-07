# IPD 20 — How Much Sources From PayPal

**Status:** Implementing (2026-11-08) — rules 1 and 2 live on the consent path; rule 3 holds; the gate has not been reached
**Date:** 2026-11-08
**Answers:** Problem tree Q4 of `../intro.md` — *is sourcing from PayPal worth the fragility it introduces?*
**Depends on:** ITD 17 (a figure declares its source) and IPD 18 (the screen says which).

---

## Problem to solve

Research established that seven of the eight fields behind the figures can be read from real PayPal objects and the eighth cannot ([research.md](../research.md)). Capability is not the constraint. Three things are:

1. **The sandbox currently refuses credentials.** Every live call returns `AUTHENTICATION_FAILURE`. Nothing has been verified against PayPal since the field mapping was read off the schema.
2. **Judges are not required to run the project.** They may judge on text, images and video alone, so a provenance chain that exists only at runtime is invisible.
3. **Sandbox state has to exist before judging and can be reset.** A catalogue created in a sandbox is a dependency on a third party's storage, five days from a deadline.

The temptation is to read the research as "make the catalogue real". It does not say that. It says the catalogue *can* be real, and that the one field that cannot never will.

There is also a balance to keep. Stage 1 asks whether PayPal is meaningfully used. The invoice door creates and sends a real invoice; the receipt refuses to render unless PayPal confirms the payment; the purchase and subscription doors create real orders. PayPal is already structural rather than decorative. Adding a sourced catalogue strengthens the claim; it does not create it.

## Options

### Option 1 — **The seller's file is the fallback, not the seller**

The catalogue is read from PayPal when PayPal answers: products from Catalog Products, price and term from each product's billing plans, amounts from the order or invoice. When PayPal cannot be reached, or when an object has not been created, the figures are computed from the published terms in `lib/catalog/` — and every screen says which of the two it did.

*How it feels:* the same screens, with a sentence that changes when the source does. A shopper never sees an error; a judge sees a product whose claim survives its own outage.

### Option 2 — Seed the catalogue at PayPal and list the shop from it

A one-shot script creates the three products and their plans in the sandbox; the shop lists what PayPal returns; the file is deleted once the objects exist.

*How it feels:* a real storefront. The claim is unqualified because the catalogue is real — until a sandbox reset, at which point there are three doors to nowhere and a video that no longer matches.

### Option 3 — Fix the claim only

Delete the false line, write the honest one, change nothing else. Everything stays computed from the file.

*How it feels:* honest and unchanged. The product tells the truth about itself and gains nothing.

## Reasoning

The decision turns on what a judge can check. Options 1 and 2 produce the same sentence when everything is working — the difference appears only when something fails, and option 2 fails by *not rendering*, which is the one outcome a submitted demo cannot afford.

Option 2 is not wrong on capability, and it is the stronger submission in a world where the sandbox answers. In this world it is a bet that a third party's storage is stable for five days across a deadline, taken without a single successful call to verify the mapping. The field mapping itself is schema-read and untested; building on it before a single live call succeeds would stack an unverified assumption under an irreversible dependency.

Option 1 makes the same research usable without that bet. It is also the only option that is *testable today*: with credentials broken, its fallback path is the only path that runs, and a screen that says "computed from the terms shown here" is a demonstration that the design degrades honestly. When credentials work, the same code takes the other branch and the sentence changes — and that change is itself the demonstration.

Option 3 under-uses the research. The product would still compute every figure from a file while the research shows most of them could be read, which makes the honest sentence a confession rather than a design.

The shape of option 1 is already how the rest of the product behaves. The bill page renders from PayPal's invoice and falls back to the biller's published terms with a notice when PayPal is unreachable. The receipt refuses to render unless PayPal confirms settlement. The document door degrades to candidate amounts rather than guessing. A catalogue that reads PayPal first and says so when it cannot is the same rule applied to the one surface that does not follow it.

## Decision

**Option 1.** Four rules:

1. **PayPal first, file second, and say which.** A figure is derived from PayPal when our arithmetic used numbers read from a named object in the same request; otherwise it is computed from the published terms and the provenance line says so (ITD 17, IPD 18).
2. **The fallback is not a failure state.** When PayPal is unreachable the screen works, states the source, and offers the same figures — it does not show an error where a number belongs.
3. **The catalogue is never seeded automatically.** Creating objects at PayPal is a deliberate, one-shot act, so a judge opening the project on a fresh sandbox sees the fallback path working rather than an empty shop.
4. **The exit figure is always the seller's.** No option here changes that; it is IPD 19's.

A gate, in the project's existing style: **if the sandbox answers a live call by the end of 2026-11-09, seeding the three products and plans becomes worth doing and this decision is revisited with evidence. If it does not, this decision stands and the submission rests on the invoice, order and receipt paths**, which are already real.

## Tradeoffs

- **The claim stays qualified.** "Computed from the terms shown here" is weaker than "read from PayPal" and reads as a caveat in a demo.
- **Two code paths through the catalogue** are two ways for a screen to be wrong, and the fallback is the path a judge is most likely to see.
- **The gate leaves the submission's shape undecided until a date three days out**, which is uncomfortable and is what the broken credentials impose.

## Notes

- The shop is the weakest surface for this change: a catalog product has no price, so a listing built from PayPal needs a plan read per product, and the shop is the one door the product is deliberately trying not to be. Open question 1 in `../intro.md` asks whether it should exist at all; this decision does not answer it.
- The financing product's origination fee has no clean PayPal home — a plan's `setup_fee` is close but is not an instalment-schedule fee. If the catalogue is sourced, that product either maps onto `setup_fee` or stays computed from its terms, and says which.
- Channel3 was considered for the shop and set aside: it supplies no term data, and it puts a second price authority in a product that claims one. See [research.md](../research.md).
