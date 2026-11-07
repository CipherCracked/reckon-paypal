# Demo script — three minutes, six beats

Record in the sandbox. Every figure below is computed from the code, so the numbers on screen will
match this script. Paste the text in [`sample-document.md`](./sample-document.md) for beat 5.

**The one sentence the video exists to land:** *the screen does the arithmetic the commitment
requires, from the amount PayPal holds or the words the seller wrote — and the model is never allowed
to produce a number.*

---

### 1. The question (≈20s) — `/`

Open on the home page, not a shop.

> "Every payment asks you to work something out. This shows the answer before you agree to it —
> same three figures, whichever way the money is asked of you."

Point at the four cards and read the figure printed on each: a purchase ($58.95 today), a
subscription ($144.00 across the term), a bill ($260.00 owed by a date), a document. Say the point
plainly: the shop is one of these four, not the product.

### 2. A subscription, end to end (≈45s) — `/product/coffee-subscription` → consent

Read the seller's copy as a shopper meets it: *"Freshly roasted, $12.00 a bag, delivered every month.
A 12-month term — cancel any time, no fee."*

Press continue. On the consent screen, top to bottom:

- **Across the term — $144.00**, arithmetic `12 × $12.00`
- **Cost to leave — $0.00** (the seller did publish one)
- **Charged today — $12.00**

> "The figure a shopper cannot compute comes first. Today's charge is last because the seller has
> already made it unmissable."

Then press "Pay now" and show PayPal's own approval page. Do not complete it yet.

### 3. A bill that PayPal itself issues (≈35s) — back to `/` → "Open this bill"

> "A bill isn't bought — it already exists, and the biller can change it. So this door asks PayPal
> for a real invoice first, and the page reads it back from PayPal's copy."

Open it, and show: the due date first, then the three figures, then "Pay this bill at PayPal". Note
what the page says when the biller published no cancellation terms: **Not stated**, never `$0.00`.

### 4. The numbers are ours (≈20s) — stay on the bill page

Point at the arithmetic line and at the notice that the figures come from PayPal's copy.

> "PayPal is the source of the amount. Every sum is computed by our code in whole cents. If PayPal's
> copy and the published terms ever disagreed, this page would show no figures at all rather than a
> wrong one."

### 5. A document the shopper brings (≈45s) — `/read`, paste `sample-document.md`

> "Most commitments don't arrive as a checkout. They arrive as text."

Paste, submit, then read what comes back:

- **Across the term — $430.00**, beside the sentence *"The membership is $35.00 per month for 12
  months."*
- **Cost to leave — $25.00**, beside the sentence that states the fee
- **Charged today — $45.00**, beside the joining-fee sentence
- The count of quotations that were **rejected by verification** — say what that number is for.

> "The model was only allowed to copy sentences. Every sentence it offered was checked against the
> text: if it isn't really there, it is thrown away and counted. Then our parser — not the model —
> read the numbers out of the sentences that survived. The model never had a field to put an amount
> in."

### 6. What it refuses to do (≈15s) — delete one line of the document and re-read

Remove *"for 12 months"* and submit again. **Across the term** now reads as an absence with its
reason, and the other two figures still stand.

> "A total it cannot support is not estimated. And nothing here was stored — no account, no profile,
> no record of who pasted what."

Close on the home page for two seconds.

---

## If something is down

- **No model configured or unreachable:** `/read` says nothing was interpreted and lists the
  amounts exactly as written, before showing them. The consent screen and the bill page keep every
  computed figure and flag only the missing wording. Say this out loud rather than hiding it — it is
  the design, not a failure.
- **PayPal sandbox slow or refusing:** the bill page still renders the biller's published terms and
  states that they are not from PayPal's copy.

## Do not say

- Do not call it an advisor, a coach, or a budgeting tool. It renders what is already owed.
- Do not claim anyone used it. No tester has, and the video should not imply one has.
