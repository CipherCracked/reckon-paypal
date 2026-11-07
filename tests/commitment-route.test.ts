import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/commitment/[orderId]/route";
import { readProductFromPayPal } from "@/lib/paypal/catalog";
import { extractTerms } from "@/lib/ai/extract-terms";
import { money } from "@/lib/money";

vi.mock("@/lib/paypal/catalog", () => ({
  readProductFromPayPal: vi.fn(),
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
