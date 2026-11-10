import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/paypal/orders/route";
import { createPayPalOrder } from "@/lib/paypal/orders";
import { readMarketProduct } from "@/lib/market/channel3";
import { recordedProduct } from "./fixtures/channel3-listings";

vi.mock("@/lib/paypal/orders", () => ({
  createPayPalOrder: vi.fn(async () => ({
    id: "ORDER-1",
    amount: { currency: "USD", minor: 5895 },
    approveUrl: "https://www.sandbox.paypal.com/checkoutnow?token=ORDER-1",
  })),
}));

vi.mock("@/lib/market/channel3", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/market/channel3")>()),
  readMarketProduct: vi.fn(),
}));

const post = (body: unknown) =>
  POST(
    new Request("http://localhost/api/paypal/orders", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    }),
  );

beforeEach(() => {
  vi.mocked(createPayPalOrder).mockClear();
  vi.mocked(readMarketProduct).mockReset();
  vi.mocked(readMarketProduct).mockResolvedValue(recordedProduct("YyLUjLT"));
});

describe("POST /api/paypal/orders", () => {
  it("creates a PayPal order and returns the computed translation", async () => {
    const response = await post({ slug: "noise-cancelling-headphones" });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.orderId).toBe("ORDER-1");
    expect(body.translation.today.minor).toBe(5895);
    expect(body.productName).toBe("Noise-Cancelling Headphones");
  });

  it("passes the approval link through and sends the payer back to us", async () => {
    const response = await post({ slug: "noise-cancelling-headphones" });
    const body = await response.json();

    expect(body.approveUrl).toBe("https://www.sandbox.paypal.com/checkoutnow?token=ORDER-1");
    expect(vi.mocked(createPayPalOrder).mock.calls[0][0].returnUrl).toBe(
      "http://localhost/consent/pending?slug=noise-cancelling-headphones&approved=1",
    );
    expect(vi.mocked(createPayPalOrder).mock.calls[0][0].cancelUrl).toBe(
      "http://localhost/consent/pending?slug=noise-cancelling-headphones&cancelled=1",
    );
  });

  it("returns 404 for an unknown product", async () => {
    const response = await post({ slug: "not-a-product" });

    expect(response.status).toBe(404);
    expect(createPayPalOrder).not.toHaveBeenCalled();
  });

  it("refuses a repeating product, which needs a subscription instead of an order", async () => {
    const response = await post({ slug: "ch3-YyLUjLT" });

    expect(response.status).toBe(400);
    expect(createPayPalOrder).not.toHaveBeenCalled();
  });

  it("returns 502 with no translation when PayPal fails", async () => {
    vi.mocked(createPayPalOrder).mockRejectedValueOnce(new Error("PayPal is down"));

    const response = await post({ slug: "noise-cancelling-headphones" });
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.translation).toBeUndefined();
    expect(body.error).toMatch(/paypal/i);
  });
});
