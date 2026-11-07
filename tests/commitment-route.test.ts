import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/commitment/[orderId]/route";
import { readProductCardFromPayPal, readProductFromPayPal } from "@/lib/paypal/catalog";
import { EXIT_UNREADABLE_NOTE, resolveExitTerm } from "@/lib/commitment/published-exit";
import { extractTerms } from "@/lib/ai/extract-terms";
import { money } from "@/lib/money";

vi.mock("@/lib/paypal/catalog", () => ({
  readProductFromPayPal: vi.fn(),
  readProductCardFromPayPal: vi.fn(),
}));

vi.mock("@/lib/commitment/published-exit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/commitment/published-exit")>()),
  resolveExitTerm: vi.fn(),
}));

vi.mock("@/lib/ai/extract-terms", () => ({
  extractTerms: vi.fn(),
}));

const labels = { item: "Coffee", shipping: "Shipping", tax: "Sales tax" };

async function get(slug: string) {
  const response = await GET(
    new Request(`http://localhost/api/commitment/ORDER-1?slug=${slug}`),
    { params: Promise.resolve({ orderId: "ORDER-1" }) },
  );
  return { status: response.status, body: await response.json() };
}

beforeEach(() => {
  vi.mocked(extractTerms).mockResolvedValue({ labels, summary: "You pay monthly." } as never);
  vi.mocked(readProductFromPayPal).mockResolvedValue(null);
  vi.mocked(readProductCardFromPayPal).mockResolvedValue(null);
  vi.mocked(resolveExitTerm).mockReset();
  // By default the rule changes nothing: whatever the terms said is what the
  // screen gets, and the tests that care about the read override it.
  vi.mocked(resolveExitTerm).mockImplementation(async (exit) => ({
    exit,
    note: null,
    quoted: null,
  }));
});

describe("where the commitment route reads its terms (ITD 17)", () => {
  it("uses the published terms and says so when PayPal has nothing", async () => {
    const { status, body } = await get("coffee-subscription");

    expect(status).toBe(200);
    expect(body.sources).toEqual({ paypal: null, published: "the terms shown on this page" });
    // The file's terms: $12.00 a month for 12 months.
    expect(body.translation.acrossTerm).toEqual(money(14400));
  });

  it("reads the plan from PayPal first, and names it", async () => {
    vi.mocked(readProductFromPayPal).mockResolvedValue({
      slug: "coffee-subscription",
      paypalProductId: "PROD-1",
      name: "Coffee Subscription",
      description: "Freshly roasted.",
      terms: {
        shape: "recurring",
        itemPrice: money(1500),
        shipping: money(0),
        tax: money(0),
        recurrence: { count: 6, period: "month" },
        exit: { kind: "unknown" },
      },
      planLabel: "the PayPal plan for Coffee Subscription",
    });

    const { body } = await get("coffee-subscription");

    expect(body.sources).toEqual({
      paypal: "the PayPal plan for Coffee Subscription",
      published: null,
    });
    // The plan's numbers, not the file's: 6 months at $15.00.
    expect(body.translation.acrossTerm).toEqual(money(9000));
    // PayPal cannot answer the exit figure, so it stays absent (IPD 19).
    expect(body.translation.exit).toBeNull();
  });

  it("falls back to the published terms when PayPal is unreachable", async () => {
    vi.mocked(readProductFromPayPal).mockRejectedValue(new Error("PayPal credentials are not configured."));

    const { status, body } = await get("coffee-subscription");

    expect(status).toBe(200);
    expect(body.sources.published).toBe("the terms shown on this page");
    expect(body.translation.acrossTerm).toEqual(money(14400));
  });

  it("still refuses a slug it does not know, in either source", async () => {
    const { status } = await get("not-a-product");
    expect(status).toBe(404);
  });
});

describe("the exit figure the seller publishes (IPD 19)", () => {
  it("hands the seller's own description to the exit rule, not PayPal's silence", async () => {
    // The mattress's terms leave the exit unknown, so the description is what
    // can answer — and it is labelled as this page's description, not PayPal's.
    await get("mattress-financed");

    expect(resolveExitTerm).toHaveBeenCalledWith(
      { kind: "unknown" },
      expect.stringContaining("Cancellation terms"),
      "the description shown on this page",
    );
  });

  it("uses the stated exit and keeps the sentence it came from", async () => {
    vi.mocked(resolveExitTerm).mockResolvedValue({
      exit: { kind: "none" },
      note: null,
      quoted: { source: "the description shown on this page", span: "cancel any time, no fee" },
    });

    const { body } = await get("mattress-financed");

    expect(body.translation.exit).toEqual(money(0));
    expect(body.quotedExit).toEqual({
      source: "the description shown on this page",
      span: "cancel any time, no fee",
    });
    expect(body.exitNote).toBeNull();
  });

  it("passes the reason a figure is absent through to the screen", async () => {
    vi.mocked(resolveExitTerm).mockResolvedValue({
      exit: { kind: "unknown" },
      note: "The seller's published terms do not say what it costs to leave.",
      quoted: null,
    });

    const { body } = await get("mattress-financed");

    expect(body.translation.exit).toBeNull();
    expect(body.exitNote).toBe("The seller's published terms do not say what it costs to leave.");
  });

  it("gives a failed exit read a reason, and does not call the wording degraded", async () => {
    vi.mocked(resolveExitTerm).mockRejectedValue(new Error("unexpected"));

    const { status, body } = await get("mattress-financed");

    expect(status).toBe(200);
    expect(body.translation.exit).toBeNull();
    expect(body.exitNote).toBe(EXIT_UNREADABLE_NOTE);
    // The figures are still computed from terms that were read; only the third
    // line is missing, and the summary is unaffected.
    expect(body.degraded).toBe(false);
  });
});
