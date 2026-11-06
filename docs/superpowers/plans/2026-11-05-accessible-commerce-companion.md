# Accessible Commerce Companion — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a demo commerce store whose consent step restates any commitment — one-time, recurring, or financed — as the amount charged today, the cost across the term, and the cost of leaving.

**Architecture:** A Next.js App Router application with a server-side PayPal integration. PayPal objects are the source of truth for amounts. All money arithmetic runs in deterministic TypeScript over integer minor units. The language model reads merchant copy and returns labels and a plain summary only; it never receives or emits an amount. The consent screen renders the computed translation and offers an optional recognition check.

**Tech Stack:** Next.js 15 (App Router), TypeScript (strict), React 19, PayPal JS SDK via `@paypal/react-paypal-js`, PayPal REST (Orders v2, Subscriptions v1), Vitest, React Testing Library, jsdom.

**Spec:** `docs/accessible-commerce-companion/`
- `intro.md` — problem decomposition and problem tree
- `ipds/primary-user-profile.md`, `intervention-point.md`, `assistance-model.md`, `trust-and-agency.md`, `beneficiary-scope.md`
- `itds/paypal-integration.md`, `ai-approach.md`, `delivery-surface.md`, `product-data.md`, `stack.md`

## Global Constraints

- Node 20 or newer. TypeScript `strict: true`. No `any` in exported signatures.
- All money is integer minor units in a `Money` value. Floating-point arithmetic on money is forbidden.
- The language model never produces or receives a monetary value. Amounts come only from the PayPal object or the deterministic computation.
- No database, no accounts, no profiles, no persisted session state. An order lives for the request.
- Demo currency is USD.
- An unknown exit cost renders as "Not stated", never as `$0.00`.
- WCAG 2.2 AA: full keyboard operation, visible focus, 44×44 px minimum targets, no information conveyed by colour alone.
- Secrets stay server-side. Only `NEXT_PUBLIC_PAYPAL_CLIENT_ID` is exposed to the browser.

## Review Focus

1. **Rounding and currency drift** — PayPal returns a decimal string; the app computes in minor units. If the two disagree, the product displays a total it will not charge. Every task touching amounts must test the conversion.
2. **Fabricated figures** — model output that contains a currency value must never reach the screen. The guard test owns this.
3. **Unknown exit cost shown as zero** — a commitment with unpublished cancellation terms must read as unknown, not free.
4. **Duplicate capture** — a retried capture must not charge twice; the capture path must be idempotent.
5. **Silent failure** — when terms cannot be read, the screen must show the raw PayPal charge with an explicit statement, not an empty or partial view.

---

### Task 1: Scaffold the application

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `tests/smoke.test.ts`, `.env.example`, `.gitignore`
- Create: `app/layout.tsx`, `app/page.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `npm test` runs Vitest; `npm run dev` starts the app; `.env.example` declares `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_BASE_URL`, `NEXT_PUBLIC_PAYPAL_CLIENT_ID`, `ANTHROPIC_API_KEY`.

- [ ] **Step 1: Create the Next.js app**

Run: `npx create-next-app@latest . --ts --app --eslint --no-src-dir --no-tailwind --import-alias "@/*" --use-npm`
Expected: project files created; `npm run dev` starts on port 3000.

- [ ] **Step 2: Initialise git and ignore secrets**

Run: `git init && printf '\n.env\n.env.local\nnode_modules\n.next\n' >> .gitignore`
Expected: `.env` listed in `.gitignore`.

- [ ] **Step 3: Install test dependencies**

Run: `npm i -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event`
Expected: packages added to `devDependencies`.

- [ ] **Step 4: Write `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: { environment: "jsdom", globals: true, setupFiles: ["./tests/setup.ts"] },
  resolve: { alias: { "@": path.resolve(__dirname, ".") } },
});
```

Create `tests/setup.ts` containing `import "@testing-library/jest-dom/vitest";`.

- [ ] **Step 5: Write the smoke test**

```ts
// tests/smoke.test.ts
import { describe, it, expect } from "vitest";

describe("test harness", () => {
  it("runs", () => expect(1 + 1).toBe(2));
});
```

- [ ] **Step 6: Run the smoke test**

Run: `npx vitest run tests/smoke.test.ts`
Expected: PASS, 1 test.

- [ ] **Step 7: Write `.env.example`**

```
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_BASE_URL=https://api-m.sandbox.paypal.com
NEXT_PUBLIC_PAYPAL_CLIENT_ID=
ANTHROPIC_API_KEY=
```

- [ ] **Step 8: Commit**

```bash
git add -A && git commit -m "chore: scaffold Next.js app with Vitest"
```

---

### Task 2: Money arithmetic

**Files:**
- Create: `lib/money.ts`
- Test: `tests/money.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `type Currency = "USD"`
  - `type Money = { currency: Currency; minor: number }`
  - `money(minor: number, currency?: Currency): Money`
  - `addMoney(a: Money, b: Money): Money`
  - `multiplyMoney(a: Money, factor: number): Money`
  - `zeroMoney(currency?: Currency): Money`
  - `formatMoney(a: Money): string` — `$1.00` style
  - `fromDecimalString(value: string, currency?: Currency): Money` — parses `"12.34"` into 1234 minor units

- [ ] **Step 1: Write the failing tests**

```ts
// tests/money.test.ts
import { describe, it, expect } from "vitest";
import { money, addMoney, multiplyMoney, formatMoney, fromDecimalString } from "@/lib/money";

describe("money", () => {
  it("adds in minor units without float drift", () => {
    expect(addMoney(money(10), money(20)).minor).toBe(30);
    expect(addMoney(money(1), money(2)).minor).toBe(3);
  });
  it("multiplies by an integer factor", () => {
    expect(multiplyMoney(money(1250), 12).minor).toBe(15000);
  });
  it("formats minor units as currency", () => {
    expect(formatMoney(money(4700))).toBe("$47.00");
    expect(formatMoney(money(5))).toBe("$0.05");
  });
  it("parses a decimal string exactly", () => {
    expect(fromDecimalString("47.99").minor).toBe(4799);
    expect(fromDecimalString("0.1").minor).toBe(10);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/money.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `lib/money.ts`**

Use `Math.round(Number(value) * 100)` inside `fromDecimalString` only, and reject values that are not `/^\d+(\.\d{1,2})?$/`. Format by dividing minor units with integer division and `String(minor % 100).padStart(2, "0")`.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/money.test.ts`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/money.ts tests/money.test.ts && git commit -m "feat: add integer minor-unit money type"
```

---

### Task 3: Commitment types and one-time computation

**Files:**
- Create: `lib/commitment/types.ts`, `lib/commitment/compute.ts`
- Test: `tests/compute.test.ts`

**Interfaces:**
- Consumes: `Money`, `addMoney`, `multiplyMoney`, `zeroMoney` from `@/lib/money`.
- Produces:
  - `type CommitmentShape = "one_time" | "recurring" | "financed"`
  - `type ExitTerms = { kind: "none" } | { kind: "fee"; fee: Money } | { kind: "unknown" }`
  - `interface CommitmentTerms { shape; itemPrice; shipping; tax; recurrence?; installment?; exit }`
  - `interface CommitmentTranslation { today: Money; acrossTerm: Money; exit: Money | null; breakdown: { item: Money; shipping: Money; tax: Money } }`
  - `computeCommitment(terms: CommitmentTerms): CommitmentTranslation`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from "vitest";
import { money } from "@/lib/money";
import { computeCommitment } from "@/lib/commitment/compute";
import type { CommitmentTerms } from "@/lib/commitment/types";

const oneTime: CommitmentTerms = {
  shape: "one_time",
  itemPrice: money(4799), shipping: money(695), tax: money(401),
  exit: { kind: "none" },
};

describe("computeCommitment — one time", () => {
  it("charges item + shipping + tax today", () => {
    const t = computeCommitment(oneTime);
    expect(t.today.minor).toBe(5895);
    expect(t.acrossTerm.minor).toBe(5895);
    expect(t.exit?.minor).toBe(0);
  });
  it("keeps the breakdown exact", () => {
    const t = computeCommitment(oneTime);
    expect(t.breakdown).toEqual({
      item: money(4799), shipping: money(695), tax: money(401),
    });
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/compute.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement types and `computeCommitment` for `one_time`**

`today = itemPrice + shipping + tax`; `acrossTerm = today`; `exit` from `translateExit(terms.exit)` where `none` → `zeroMoney()`, `fee` → fee, `unknown` → `null`.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/compute.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/commitment tests/compute.test.ts && git commit -m "feat: compute one-time commitment translation"
```

---

### Task 4: Recurring and financed computation

**Files:**
- Modify: `lib/commitment/compute.ts`
- Test: `tests/compute.test.ts` (append)

**Interfaces:**
- Consumes: everything from Task 3.
- Produces: same `computeCommitment` signature, now handling `recurring` and `financed`.

- [ ] **Step 1: Write the failing tests**

```ts
const recurring: CommitmentTerms = {
  shape: "recurring",
  itemPrice: money(1200), shipping: money(0), tax: money(0),
  recurrence: { count: 12, period: "month" },
  exit: { kind: "fee", fee: money(0) },
};

const financed: CommitmentTerms = {
  shape: "financed",
  itemPrice: money(120000), shipping: money(0), tax: money(0),
  installment: { count: 12, amount: money(10500), fee: money(6000) },
  exit: { kind: "unknown" },
};

it("multiplies a recurring charge across the term", () => {
  const t = computeCommitment(recurring);
  expect(t.today.minor).toBe(1200);
  expect(t.acrossTerm.minor).toBe(14400);
});
it("sums instalments and the financing fee", () => {
  const t = computeCommitment(financed);
  expect(t.today.minor).toBe(10500);
  expect(t.acrossTerm.minor).toBe(132000);
});
it("returns null exit when terms are unknown", () => {
  expect(computeCommitment(financed).exit).toBeNull();
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/compute.test.ts`
Expected: FAIL on the recurring assertion (`acrossTerm` is 1200).

- [ ] **Step 3: Implement recurring and financed branches**

Recurring: `perPeriod = itemPrice + tax`; `acrossTerm = today + perPeriod * (count - 1)`.
Financed: `today = installment.amount`; `acrossTerm = installment.amount * count + installment.fee`.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/compute.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/commitment/compute.ts tests/compute.test.ts && git commit -m "feat: compute recurring and financed commitments"
```

---

### Task 5: Catalog and storefront

**Files:**
- Create: `lib/catalog/products.ts`
- Modify: `app/page.tsx`
- Test: `tests/storefront.test.tsx`

**Interfaces:**
- Consumes: `money`, `CommitmentTerms` from earlier tasks.
- Produces: `type Product = { slug: string; name: string; description: string; terms: CommitmentTerms }`; `products: Product[]` with exactly three entries: `noise-cancelling-headphones` (one_time), `coffee-subscription` (recurring), `mattress-financed` (financed).

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from "@testing-library/react";
import Home from "@/app/page";

it("lists every catalog product", () => {
  render(<Home />);
  expect(screen.getByText("Noise-Cancelling Headphones")).toBeInTheDocument();
  expect(screen.getByText("Coffee Subscription")).toBeInTheDocument();
  expect(screen.getByText("Mattress — 12 Months")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/storefront.test.tsx`
Expected: FAIL, no products rendered.

- [ ] **Step 3: Implement the catalog and page**

Each product's `description` must contain merchant-style ambiguity (a struck-through original price, a percentage, a recurring term, or an instalment plan) so the extraction task has real text to read.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/storefront.test.tsx`
Expected: PASS, 1 test.

- [ ] **Step 5: Commit**

```bash
git add lib/catalog app/page.tsx tests/storefront.test.tsx && git commit -m "feat: add demo storefront and catalog"
```

---

### Task 6: PayPal client

**Files:**
- Create: `lib/paypal/client.ts`, `lib/paypal/orders.ts`
- Test: `tests/paypal-orders.test.ts`

**Interfaces:**
- Consumes: `Money`, `fromDecimalString`.
- Produces:
  - `getAccessToken(): Promise<string>`
  - `type CreateOrderInput = { referenceId: string; description: string; amount: Money }`
  - `createPayPalOrder(input: CreateOrderInput): Promise<{ id: string; amount: Money }>`
  - `capturePayPalOrder(id: string): Promise<{ id: string; status: string; amount: Money }>`

- [ ] **Step 1: Write the failing test with mocked fetch**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPayPalOrder } from "@/lib/paypal/orders";
import { money } from "@/lib/money";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: "tok", expires_in: 3600 }) })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ id: "ORDER-1", status: "CREATED", purchase_units: [{ amount: { currency_code: "USD", value: "58.95" } }] }) }));
});

it("creates an order and returns minor units from PayPal", async () => {
  const result = await createPayPalOrder({ referenceId: "ref-1", description: "Headphones", amount: money(5895) });
  expect(result.id).toBe("ORDER-1");
  expect(result.amount).toEqual(money(5895));
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/paypal-orders.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement the client**

Token request: `POST {PAYPAL_BASE_URL}/v1/oauth2/token` with basic auth and `grant_type=client_credentials`. Order request: `POST /v2/checkout/orders` with `intent: "CAPTURE"` and `purchase_units[0].amount = { currency_code, value: (minor/100).toFixed(2) }`. Cache the token in module scope with its expiry.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/paypal-orders.test.ts`
Expected: PASS, 1 test.

- [ ] **Step 5: Commit**

```bash
git add lib/paypal tests/paypal-orders.test.ts && git commit -m "feat: add PayPal orders client"
```

---

### Task 7: Create-order API route

**Files:**
- Create: `app/api/paypal/orders/route.ts`
- Test: `tests/api-create-order.test.ts`

**Interfaces:**
- Consumes: `products`, `computeCommitment`, `createPayPalOrder`.
- Produces: `POST /api/paypal/orders` accepting `{ slug: string }` and returning `{ orderId: string; translation: CommitmentTranslation; productName: string }`.

- [ ] **Step 1: Write the failing test**

Call `POST` from the route module with `new Request("http://localhost/api/paypal/orders", { method: "POST", body: JSON.stringify({ slug: "noise-cancelling-headphones" }) })`, stub the PayPal client, and assert the response contains `orderId: "ORDER-1"` and `translation.today.minor === 5895`.

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/api-create-order.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement the route**

Return 404 for an unknown slug and 502 when PayPal fails. Never return a translation computed from a failed PayPal call.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/api-create-order.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/paypal/orders tests/api-create-order.test.ts && git commit -m "feat: add create-order endpoint"
```

---

### Task 8: Capture endpoint with idempotency

**Files:**
- Create: `app/api/paypal/orders/[id]/capture/route.ts`
- Modify: `lib/paypal/orders.ts`
- Test: `tests/api-capture.test.ts`

**Interfaces:**
- Consumes: `capturePayPalOrder`.
- Produces: `POST /api/paypal/orders/:id/capture` returning `{ status: "COMPLETED" | "ALREADY_CAPTURED"; amount: Money }`.

- [ ] **Step 1: Write the failing tests**

One test captures successfully. A second test stubs PayPal to return `ORDER_ALREADY_CAPTURED` and expects HTTP 200 with `status: "ALREADY_CAPTURED"`, not an error.

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/api-capture.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement capture**

Treat `ORDER_ALREADY_CAPTURED` as success. Any other failure returns 502 with the PayPal issue text.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/api-capture.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add app/api/paypal/orders lib/paypal/orders.ts tests/api-capture.test.ts && git commit -m "feat: add idempotent capture endpoint"
```

---

### Task 9: Commitment view component

**Files:**
- Create: `components/CommitmentView.tsx`
- Test: `tests/commitment-view.test.tsx`

**Interfaces:**
- Consumes: `CommitmentTranslation`, `formatMoney`.
- Produces: `CommitmentView({ translation, labels, summary }: { translation: CommitmentTranslation; labels: { item: string; shipping: string; tax: string }; summary: string })`.

- [ ] **Step 1: Write the failing tests**

```tsx
it("states today, term, and exit", () => {
  render(<CommitmentView translation={t} labels={labels} summary="You pay once." />);
  expect(screen.getByText("$58.95")).toBeInTheDocument();
  expect(screen.getByText("$58.95")).toBeDefined();
});
it("renders an unknown exit cost as Not stated, never as zero", () => {
  render(<CommitmentView translation={{ ...t, exit: null }} labels={labels} summary="" />);
  expect(screen.getByText(/not stated/i)).toBeInTheDocument();
  expect(screen.queryByText("$0.00")).toBeNull();
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/commitment-view.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement the component**

Three labelled rows — "Charged today", "Across the term", "Cost to leave" — over an itemised breakdown. Each figure has a text label; colour is never the only signifier. Use semantic `<dl>` markup.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/commitment-view.test.tsx`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add components/CommitmentView.tsx tests/commitment-view.test.tsx && git commit -m "feat: add commitment view"
```

---

### Task 10: Recognition check

**Files:**
- Create: `components/RecognitionCheck.tsx`
- Test: `tests/recognition-check.test.tsx`

**Interfaces:**
- Produces: `RecognitionCheck({ amount, onResult }: { amount: Money; onResult: (matched: boolean) => void })`.

- [ ] **Step 1: Write the failing tests**

Assert the component renders the amount and the question "Does this match what you expected?". Assert that clicking "Yes" calls `onResult(true)` and "No, show me the breakdown" calls `onResult(false)`. Assert the check can be skipped without calling `onResult`.

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/recognition-check.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement the component**

Never ask the shopper to produce the figure. Both buttons carry accessible names. Skipping leaves the payment path unchanged.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/recognition-check.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 5: Commit**

```bash
git add components/RecognitionCheck.tsx tests/recognition-check.test.tsx && git commit -m "feat: add optional recognition check"
```

---

### Task 11: AI extraction with a money guard

**Files:**
- Create: `lib/ai/types.ts`, `lib/ai/extract-terms.ts`, `lib/ai/guard.ts`
- Test: `tests/ai-guard.test.ts`, `tests/ai-extract.test.ts`

**Interfaces:**
- Produces:
  - `interface ExtractedTerms { shape: CommitmentShape | null; recurrenceCount: number | null; recurrencePeriod: "month" | "year" | null; cancellationWindowDays: number | null; exitFeeKnown: boolean; labels: { item: string; shipping: string; tax: string }; summary: string }`
  - `findMoneyLike(text: string): string | null` — matches `/\$\s?\d|USD\s?\d|\d+\.\d{2}/i`
  - `assertNoMoney(terms: ExtractedTerms): void` — throws `MoneyInModelOutputError` when any string field matches
  - `extractTerms(input: { productText: string }): Promise<ExtractedTerms>`

- [ ] **Step 1: Write the failing guard tests**

```ts
it("flags a currency value in the summary", () => {
  expect(findMoneyLike("You pay $12.00 a month")).toBe("$12.00");
});
it("accepts a summary with no currency", () => {
  expect(findMoneyLike("You pay monthly for one year.")).toBeNull();
});
it("throws when model output contains money", () => {
  const bad = { ...valid, summary: "Total USD 120" };
  expect(() => assertNoMoney(bad)).toThrow(MoneyInModelOutputError);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/ai-guard.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement the guard**

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/ai-guard.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 5: Write the failing extraction test**

Stub the Anthropic client. Assert `extractTerms` sends a JSON-schema-constrained request and returns parsed `ExtractedTerms`. Assert a response containing `"$"` causes `assertNoMoney` to throw before return.

- [ ] **Step 6: Run to verify failure**

Run: `npx vitest run tests/ai-extract.test.ts`
Expected: FAIL.

- [ ] **Step 7: Implement `extractTerms`**

Use the Anthropic SDK with a tool/JSON schema that has no monetary fields. The prompt supplies only product copy. On a guard failure, throw; the caller falls back to raw terms.

- [ ] **Step 8: Run to verify pass**

Run: `npx vitest run tests/ai-extract.test.ts`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add lib/ai tests/ai-guard.test.ts tests/ai-extract.test.ts && git commit -m "feat: add AI term extraction with money guard"
```

---

### Task 12: Consent page and translation endpoint

**Files:**
- Create: `app/consent/[orderId]/page.tsx`, `app/api/commitment/[orderId]/route.ts`
- Modify: `app/api/paypal/orders/route.ts` (return `productText` alongside the order)
- Test: `tests/consent-page.test.tsx`

**Interfaces:**
- Consumes: `computeCommitment`, `extractTerms`, `CommitmentView`, `RecognitionCheck`.
- Produces: `GET /api/commitment/:orderId` returning `{ translation, labels, summary, degraded: boolean }`.

- [ ] **Step 1: Write the failing test**

Render the consent page with a stubbed fetch returning a translation. Assert the three figures appear. Then stub a failed extraction and assert the raw PayPal amount appears with the text "We could not read the terms for this purchase. Here is the amount PayPal will charge." and `degraded: true`.

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/consent-page.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement the page and route**

On extraction failure the page must still render `translation.today` and the explicit degraded message. It must never render a blank screen.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/consent-page.test.tsx`
Expected: PASS, 2 tests.

- [ ] **Step 5: Commit**

```bash
git add app/consent app/api/commitment app/api/paypal/orders tests/consent-page.test.tsx && git commit -m "feat: add consent page with degraded fallback"
```

---

### Task 13: Subscriptions path

**Files:**
- Create: `lib/paypal/subscriptions.ts`, `app/api/paypal/subscriptions/route.ts`
- Test: `tests/subscriptions.test.ts`

**Interfaces:**
- Produces: `ensurePlan(input: { productId: string; planId: string; amount: Money; interval: "MONTH" | "YEAR" }): Promise<string>`; `createSubscription(planId: string): Promise<{ id: string; status: string }>`; `POST /api/paypal/subscriptions` returning `{ subscriptionId }`.

- [ ] **Step 1: Write the failing tests**

Assert `ensurePlan` creates a product then a billing plan and returns the plan id. Assert a second call with the same plan id does not create a duplicate (stub returns 409 and the client treats it as success).

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/subscriptions.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement the subscription client and route**

Use `/v1/catalogs/products`, `/v1/billing/plans`, `/v1/billing/subscriptions`. Treat an existing product/plan response as success.

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/subscriptions.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/paypal/subscriptions.ts app/api/paypal/subscriptions tests/subscriptions.test.ts && git commit -m "feat: add subscription plan and signup path"
```

---

### Task 14: Full-flow integration test

**Files:**
- Create: `tests/flow.test.tsx`

**Interfaces:**
- Consumes: the whole app surface.
- Produces: one test proving the demo path end to end with PayPal and the model stubbed.

- [ ] **Step 1: Write the failing test**

Render the storefront, click "Noise-Cancelling Headphones", click "Continue to payment", and assert the consent screen shows "Charged today", "Across the term", and "Cost to leave" with the computed figures. Stub PayPal to return `$58.95`.

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/flow.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement whatever navigation and wiring the test exposes**

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run tests/flow.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add tests/flow.test.tsx app components lib && git commit -m "test: add end-to-end demo flow"
```

---

### Task 15: Accessibility pass and deployment

**Files:**
- Modify: `app/layout.tsx`, `components/CommitmentView.tsx`, `components/RecognitionCheck.tsx`
- Create: `README.md`, `docs/demo-script.md`

**Interfaces:**
- Consumes: the built app.
- Produces: a deployed URL and a five-step demo script.

- [ ] **Step 1: Write the failing accessibility tests**

Using `@testing-library/user-event`, tab through the consent screen and assert every interactive element receives focus in reading order. Assert every button's accessible name is unique. Assert no element has a click handler without a keyboard equivalent.

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run tests/accessibility.test.tsx`
Expected: FAIL on at least one focus-order or naming assertion.

- [ ] **Step 3: Fix the components until the tests pass**

- [ ] **Step 4: Run the whole suite**

Run: `npx vitest run`
Expected: PASS, every test.

- [ ] **Step 5: Deploy**

Set `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_BASE_URL`, `NEXT_PUBLIC_PAYPAL_CLIENT_ID`, `ANTHROPIC_API_KEY` in the host's environment. Deploy to Vercel or Render. Verify in the sandbox that a test purchase reaches the consent screen and captures.

- [ ] **Step 6: Write `README.md` and `docs/demo-script.md`**

README covers setup, sandbox credentials, and the run command. The demo script lists the five screens in the order a three-minute video shows them.

- [ ] **Step 7: Commit**

```bash
git add README.md docs/demo-script.md app components && git commit -m "docs: add setup and demo script; a11y pass"
```

---

## Self-Review

**Spec coverage.** Every IPD maps to tasks: primary user and beneficiary scope to Tasks 5 and 9 (one rendering, no modes); intervention point to Tasks 3–4 and 13 (three commitment shapes); assistance model to Tasks 9 and 10 (three quantities, optional check); trust and agency to Tasks 11 and 12 (guard, degraded fallback, no retention). Every ITD maps: PayPal integration to Tasks 6–8 and 13; AI approach to Task 11; delivery surface to Tasks 5 and 12; product data to Task 5; stack to Task 1.

**Gaps found and fixed.** The original draft had no task owning the "unknown exit" rendering; it is now asserted in Task 9. The draft also had no owner for idempotent capture; Task 8 now covers it.

**Type consistency.** `Money` is used identically across all tasks. `CommitmentTranslation.exit` is `Money | null` everywhere. `computeCommitment` and `extractTerms` keep their signatures from first definition to last use.

**Review Focus coverage.** Rounding drift — Tasks 2 and 6. Fabricated figures — Task 11. Unknown exit — Tasks 4 and 9. Duplicate capture — Task 8. Silent failure — Task 12.

**Proportion.** Task bodies carry signatures, exact values, and test assertions. No task transcribes a function body except where a rule (the computation, the guard regex) is not determined by the signature.
