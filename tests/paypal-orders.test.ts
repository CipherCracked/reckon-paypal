import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createPayPalOrder } from "@/lib/paypal/orders";
import { resetTokenCache } from "@/lib/paypal/client";
import { money } from "@/lib/money";

const tokenResponse = {
  ok: true,
  json: async () => ({ access_token: "tok", expires_in: 3600 }),
};

const orderResponse = (value: string, links?: Array<{ href: string; rel: string }>) => ({
  ok: true,
  json: async () => ({
    id: "ORDER-1",
    status: "CREATED",
    purchase_units: [{ amount: { currency_code: "USD", value } }],
    links,
  }),
});

const orderInput = {
  referenceId: "ref-1",
  description: "Headphones",
  amount: money(5895),
  returnUrl: "http://localhost:3000/consent/pending?slug=x&approved=1",
  cancelUrl: "http://localhost:3000/consent/pending?slug=x&cancelled=1",
};

beforeEach(() => {
  vi.stubEnv("PAYPAL_CLIENT_ID", "test-client-id");
  vi.stubEnv("PAYPAL_CLIENT_SECRET", "test-client-secret");
  vi.stubEnv("PAYPAL_BASE_URL", "https://api-m.sandbox.paypal.com");
  resetTokenCache();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("createPayPalOrder", () => {
  it("creates an order and returns minor units from PayPal", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(tokenResponse).mockResolvedValueOnce(orderResponse("58.95")),
    );

    const result = await createPayPalOrder(orderInput);

    expect(result.id).toBe("ORDER-1");
    expect(result.amount).toEqual(money(5895));
  });

  it("returns PayPal's approval link so the payer can authorise the order", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(tokenResponse)
        .mockResolvedValueOnce(
          orderResponse("58.95", [
            { href: "https://api.sandbox.paypal.com/v2/checkout/orders/ORDER-1", rel: "self" },
            { href: "https://www.sandbox.paypal.com/checkoutnow?token=ORDER-1", rel: "approve" },
          ]),
        ),
    );

    const result = await createPayPalOrder(orderInput);

    expect(result.approveUrl).toBe("https://www.sandbox.paypal.com/checkoutnow?token=ORDER-1");
  });

  it("tells PayPal where to send the payer back after approving", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse)
      .mockResolvedValueOnce(orderResponse("58.95"));
    vi.stubGlobal("fetch", fetchMock);

    await createPayPalOrder(orderInput);

    const sent = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(sent.application_context.return_url).toBe(orderInput.returnUrl);
    expect(sent.application_context.cancel_url).toBe(orderInput.cancelUrl);
  });

  it("refuses an order whose PayPal amount disagrees with the amount requested", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(tokenResponse).mockResolvedValueOnce(orderResponse("58.94")),
    );

    await expect(
      createPayPalOrder({ ...orderInput, amount: money(5895) }),
    ).rejects.toThrow(/58\.94/);
  });

  it("reuses the cached access token", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse)
      .mockResolvedValueOnce(orderResponse("58.95"))
      .mockResolvedValueOnce(orderResponse("58.95"));
    vi.stubGlobal("fetch", fetchMock);

    await createPayPalOrder({ ...orderInput, referenceId: "a", description: "A" });
    await createPayPalOrder({ ...orderInput, referenceId: "b", description: "B" });

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
