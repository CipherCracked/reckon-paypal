import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ReceiptPage from "@/app/receipt/[orderId]/page";
import { readMarketProduct } from "@/lib/market/channel3";
import { retrieveSubscription } from "@/lib/paypal/retrieve";
import { retrievePaymentsTaken } from "@/lib/paypal/transactions";
import { money } from "@/lib/money";
import { recordedProduct } from "./fixtures/channel3-listings";
import { clearPublishedExitCache } from "@/lib/commitment/published-exit";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

vi.mock("@/lib/paypal/retrieve", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/paypal/retrieve")>();
  return { ...actual, retrieveSubscription: vi.fn(), retrieveOrder: vi.fn() };
});

vi.mock("@/lib/paypal/transactions", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/paypal/transactions")>()),
  retrievePaymentsTaken: vi.fn(),
}));

vi.mock("@/lib/market/channel3", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/market/channel3")>()),
  readMarketProduct: vi.fn(),
}));

// The record's third figure is read from the seller's words. This suite is
// about how the page reports a listing it could not read, so the reading is
// fixed to the seller's silence (the read itself is tested where it lives).
vi.mock("@/lib/commitment/published-exit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/commitment/published-exit")>()),
  resolveExitTerm: vi.fn(async () => ({
    kind: "silent" as const,
    exit: { kind: "unknown" as const },
    note: "The seller's words don't say what leaving costs.",
    quoted: null,
  })),
}));

const renderReceipt = () =>
  ReceiptPage({
    params: Promise.resolve({ orderId: "I-SUB-1" }),
    searchParams: Promise.resolve({ slug: "ch3-YyLUjLT" }),
  });

beforeEach(() => {
  clearPublishedExitCache();
  vi.mocked(readMarketProduct).mockReset();
  vi.mocked(readMarketProduct).mockResolvedValue(recordedProduct("YyLUjLT"));
  vi.mocked(retrieveSubscription).mockReset();
  vi.mocked(retrieveSubscription).mockResolvedValue({
    id: "I-SUB-1",
    status: "ACTIVE",
    startedAt: "2026-11-10T20:47:51Z",
    nextBillingTime: "2026-12-07T00:00:00Z",
    statusChangeTime: null,
    amount: money(2499),
    terms: {
      shape: "recurring",
      itemPrice: money(2499),
      shipping: null,
      tax: null,
      recurrence: { count: 6, period: "month" },
      exit: { kind: "unknown" },
    },
  });
  vi.mocked(retrievePaymentsTaken).mockReset();
  vi.mocked(retrievePaymentsTaken).mockResolvedValue({
    kind: "read",
    count: 1,
    amount: money(2499),
  });

  // The record asks for the model's sentence after the page renders. These
  // tests are about the page, so the answer is "nothing to add".
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, json: async () => ({ sentence: null }) }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("what the record says PayPal has taken", () => {
  it("states the count and the money from PayPal's own record", async () => {
    render(await renderReceipt());

    expect(screen.getByText("Taken so far")).toBeInTheDocument();
    expect(screen.getByText(/\$24\.99 — 1 of 6 payments\./)).toBeInTheDocument();
  });

  it("asks about the agreement, starting when PayPal says it started", async () => {
    await renderReceipt();

    expect(retrievePaymentsTaken).toHaveBeenCalledWith("I-SUB-1", "2026-11-10T20:47:51Z");
  });

  it("says it could not read the record, never that nothing was taken", async () => {
    vi.mocked(retrievePaymentsTaken).mockResolvedValue({ kind: "unavailable" });

    render(await renderReceipt());

    expect(
      screen.getByText(/not read — paypal's payment record could not be read just now/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/lists no completed payment/i)).toBeNull();
  });
});

describe("a record opened without its listing", () => {
  const renderBare = () =>
    ReceiptPage({
      params: Promise.resolve({ orderId: "I-SUB-1" }),
      searchParams: Promise.resolve({}),
    });

  it("asks PayPal for the subscription once, not twice", async () => {
    // Without a listing the shape has to be discovered, and the discovery read
    // is the record's only read: asking again would spend a second round trip
    // on the screen a shopper is most likely to open from PayPal itself.
    render(await renderBare());

    expect(retrieveSubscription).toHaveBeenCalledTimes(1);
  });

  it("still shows the figures the subscription's plan states", async () => {
    render(await renderBare());

    expect(screen.getAllByText(/\$149\.94/).length).toBeGreaterThan(0);
    // Today's charge and the next charge are both one period, so $24.99 is on
    // the page more than once — which is the record agreeing with itself.
    expect(screen.getAllByText(/\$24\.99/).length).toBeGreaterThan(0);
  });
});

describe("a record opened when the catalogue did not answer", () => {
  it("still shows what PayPal holds, and says the seller's words were not read", async () => {
    // The record is the one screen a shopper keeps. A catalogue outage must not
    // take it away — and it must not claim the listing does not exist either.
    vi.mocked(readMarketProduct).mockRejectedValueOnce(new Error("fetch failed"));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    render(await renderReceipt());

    expect(screen.getByText(/\$149\.94/)).toBeInTheDocument();
    expect(
      screen.getByText(
        /the catalogue could not be read just now, so what the seller says about leaving was not read/i,
      ),
    ).toBeInTheDocument();
    warn.mockRestore();
  });
});
