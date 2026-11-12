import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createPayPalOrder } from "@/lib/paypal/orders";
import { getAccessToken, PayPalError, resetTokenCache } from "@/lib/paypal/client";
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

describe("the access token", () => {
  it("refuses an answer with no token, rather than sending 'Bearer undefined' to PayPal", async () => {
    // A 200 with a body that is not the token shape used to be cached as
    // `undefined` and sent as a credential: every call after it failed with a
    // 401 that looked like a bad key rather than a bad answer.
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ expires_in: 3600 }) }),
    );

    await expect(getAccessToken()).rejects.toBeInstanceOf(PayPalError);
  });

  it("does not keep a token whose lifetime PayPal did not state", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ access_token: "tok" }) });
    vi.stubGlobal("fetch", fetchMock);

    await getAccessToken();
    await getAccessToken();

    // A NaN expiry would compare false forever, which reads as "cached" in the
    // code and behaves as "never cached" here. Said out loud, it is the answer:
    // the token is used and not kept.
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
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

  it("sends the amount as a whole-cent decimal string", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse)
      .mockResolvedValueOnce(orderResponse("58.95"));
    vi.stubGlobal("fetch", fetchMock);

    await createPayPalOrder(orderInput);

    const [, init] = fetchMock.mock.calls[1] as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    expect(body.purchase_units[0].amount).toEqual({ currency_code: "USD", value: "58.95" });
  });

  it("asks PayPal to state the amount it created the order with", async () => {
    // A bare create reply is `id`, `status` and `links` — no purchase unit — so
    // the amount check would refuse every order, including correct ones.
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse)
      .mockResolvedValueOnce(orderResponse("58.95"));
    vi.stubGlobal("fetch", fetchMock);

    await createPayPalOrder(orderInput);

    const [, init] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect((init.headers as Record<string, string>).Prefer).toBe("return=representation");
  });

  it("refuses an order PayPal created without stating an amount", async () => {
    // Standing our own figure in for PayPal's would make the agreement check
    // pass by agreeing with itself, and would let the screen call it PayPal's.
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(tokenResponse)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: "ORDER-1", status: "CREATED" }),
        }),
    );

    await expect(createPayPalOrder(orderInput)).rejects.toThrow(/without stating an amount/i);
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
