import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createPayPalOrder } from "@/lib/paypal/orders";
import { resetTokenCache } from "@/lib/paypal/client";
import { money } from "@/lib/money";

const tokenResponse = {
  ok: true,
  json: async () => ({ access_token: "tok", expires_in: 3600 }),
};

const orderResponse = (value: string) => ({
  ok: true,
  json: async () => ({
    id: "ORDER-1",
    status: "CREATED",
    purchase_units: [{ amount: { currency_code: "USD", value } }],
  }),
});

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

    const result = await createPayPalOrder({
      referenceId: "ref-1",
      description: "Headphones",
      amount: money(5895),
    });

    expect(result.id).toBe("ORDER-1");
    expect(result.amount).toEqual(money(5895));
  });

  it("refuses an order whose PayPal amount disagrees with the amount requested", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(tokenResponse).mockResolvedValueOnce(orderResponse("58.94")),
    );

    await expect(
      createPayPalOrder({ referenceId: "ref-1", description: "Headphones", amount: money(5895) }),
    ).rejects.toThrow(/58\.94/);
  });

  it("reuses the cached access token", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse)
      .mockResolvedValueOnce(orderResponse("58.95"))
      .mockResolvedValueOnce(orderResponse("58.95"));
    vi.stubGlobal("fetch", fetchMock);

    await createPayPalOrder({ referenceId: "a", description: "A", amount: money(5895) });
    await createPayPalOrder({ referenceId: "b", description: "B", amount: money(5895) });

    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
