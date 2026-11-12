# IPD 33 — The Shop Opens on a Shelf

**Status:** Decided (2026-11-12)
**Date:** 2026-11-12
**Answers:** Problem tree Q1 of `../intro.md` — *what is the shop for, and what does the first screenful show when nobody has searched?*
**Serves:** the owner's R3 (*make the shop a shop*); IPD 28 (one home in two states), which made the shop a destination in the frame's own navigation.

---

## Problem to solve

A person opens the shop and is asked a question they may not be able to answer: *what are you looking for?* The field is already filled with **headphones** — a product chosen by nobody, answering nothing — and under it sits a list of twelve headphones the catalogue returned for that word. The page never says what it is for. It says *Search real products*, and then it does.

For a person who arrives knowing the product, that is adequate. For a person who arrives knowing only a worry — *my subscription renews next month and I do not know what it will cost me* — the page offers one action: type a product name they do not have. There is no shelf, no department, no way to look. Sixteen top-level categories and their trees are one endpoint away and the page shows none of them.

The shop is also the screen a stranger uses to decide whether this product is real. Its first screenful currently proves the opposite: a placeholder query and a list that is mostly identical images of headphones.

## Options

### Option 1 — **The catalogue's own top-level categories are the shop's opening screen; the search is the shortcut beneath them**

The shop opens on a shelf of the sixteen root categories, each a link, in the catalogue's own words — *Electronics*, *Home & Garden*, *Health & Beauty*. The search field sits directly under the shelf, labelled as the fast way for a person who already knows what they are looking for. Nothing is fetched for the shelf beyond the category list, so the screen is right even when a product call is slow.

Choosing a category opens that department's first thirty buyable products. Searching opens the results for those words. Both are the same page, the same grid, the same card.

*How it feels:* a person opens the shop and sees departments — the way every shop they have ever used looks — with a search box where a search box belongs. They pick **Home & Garden** because that is where the thing in their kitchen came from, and they are looking at real products with real prices. A person who knows the product types it and never looks at the shelf.

### Option 2 — Keep search-first, give it a better default

Open on a real category's products instead of *headphones* — the shop looks stocked the moment it loads.

*How it feels:* the page answers a question nobody asked ("what is in Electronics?") and still gives a person without a product name nothing to do but type. It also has to choose a default category, which is an editorial decision this product promised not to make, and the choice is visible in the URL and the title.

### Option 3 — A front door of curated shelves we write

"Popular right now", "Subscriptions", "Check what you are paying for" — shelves chosen by us.

*How it feels:* more like a shop and less like this product. Every shelf would be a claim we cannot support: "popular" is not a fact the catalogue gives us, and "subscriptions" cannot be told apart from one-time purchases until R1 exists. It would also put our words in a catalogue whose honesty is the product.

### Option 4 — A landing page that explains the shop before showing it

A paragraph about what the shop is, why the prices are real, and what happens when you pick something.

*How it feels:* a page about the shop instead of a shop. This product has already been through this lesson once (`docs/finished-feel/`): the screens that explain themselves are the ones that read as unfinished.

## Reasoning

The deciding factor is **what the visitor can do in the first second without deciding anything**. A shelf of departments asks nothing: a person recognises *Electronics* the way they recognise a sign in a shop. A search field asks a question, and a pre-filled search field asks a question and answers it badly. Only Option 1 gives a person who cannot name a product a way forward that costs no thought.

The second factor is **whose words the shop shows**. The catalogue's own categories are harvested from real retailers, so a shelf built from them is a fact. Any shelf we choose — a default category, a curated rail — is our editorial voice standing in front of a catalogue that is the product's evidence. Option 1 is the only treatment where the shop's structure is as honest as its prices.

The search stays, directly under the shelf, because the two visitors are real and different: a person holding a link or a product name should not have to browse sixteen departments to reach it. Ordering the shelf first and the search second is the opposite of the usual shop and is deliberate — the shelf is the demonstration that this is a catalogue, and the search is a shortcut, not the product.

Option 2 is rejected because a default category is an invented answer to "what should I look at?"; Option 3 because it invents facts; Option 4 because explanation is what the shop is already over-supplied with.

## Tradeoffs

- The shop's first screenful shows no product at all, which is a real cost to a stranger who wanted to see stock immediately. The category shelf has to carry the impression on its own, and it will be judged as a grid of words.
- Sixteen categories include legs like *Media* and *Hardware* and narrow ones like *Animals & Pet Supplies*. The catalogue's taxonomy is not a merchandiser's, and some of its words will read oddly next to each other.
- The shelf costs one catalogue call on every shop visit. It is cached, but it is a call the page did not make before.
- A person who lands on a category page from a shared link still meets a product grid before they see the shelf; the shelf is a shop-root experience.

## Notes

- The page title and lede change with the decision: *Search real products* becomes a promise about browsing, and the lede stops describing the page's mechanism.
- The five hardcoded suggestion links under the search (`components/MarketSearch.tsx:3`) go: they were a shelf we wrote, and now there is a shelf the catalogue wrote.
- Whether a **subscriptions** shelf can ever exist is not answered here. It needs R1: today the shop cannot tell a subscription from a one-time purchase, and a shelf that guesses would be the worst version of Option 3.
