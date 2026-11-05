import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ensurePlan, createSubscription } from "@/lib/paypal/subscriptions";
import { resetTokenCache } from "@/lib/paypal/client";
import { POST } from "@/app/api/paypal/subscriptions/route";
import { money } from "@/lib/money";

const json = (body: unknown, ok = true, status = 200) => ({
  ok,
  status,
  json: async () => body,
});

const duplicate = () =>
  json(
    { name: "UNPROCESSABLE_ENTITY", details: [{ issue: "DUPLICATE_RESOURCE" }] },
    false,
    422,
  );

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

const planInput = {
  productId: "DEMO-COFFEE",
  planId: "P-DEMO-COFFEE-MONTHLY",
  amount: money(1200),
  interval: "MONTH" as const,
};

describe("ensurePlan", () => {
  it("creates a catalog product and a billing plan, then returns the plan id", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ access_token: "tok", expires_in: 3600 }))
      .mockResolvedValueOnce(json({ id: "PROD-1" }))
      .mockResolvedValueOnce(json({ id: "P-1" }));
    vi.stubGlobal("fetch", fetchMock);

    const planId = await ensurePlan(planInput);

    expect(planId).toBe("P-1");
    const planRequest = JSON.parse(fetchMock.mock.calls[2][1].body);
    expect(planRequest.pricing_scheme).toBeUndefined();
    expect(planRequest.billing_cycles[0].pricing_scheme.fixed_price).toEqual({
      currency_code: "USD",
      value: "12.00",
    });
  });

  it("treats an existing product and plan as success instead of creating a duplicate", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(json({ access_token: "tok", expires_in: 3600 }))
        .mockResolvedValueOnce(duplicate())
        .mockResolvedValueOnce(duplicate()),
    );

    await expect(ensurePlan(planInput)).resolves.toBe(planInput.planId);
  });
});

describe("createSubscription", () => {
  it("creates a subscription against the plan", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(json({ access_token: "tok", expires_in: 3600 }))
        .mockResolvedValueOnce(json({ id: "I-SUB-1", status: "APPROVAL_PENDING" })),
    );

    await expect(createSubscription("P-1")).resolves.toEqual({
      id: "I-SUB-1",
      status: "APPROVAL_PENDING",
    });
  });
});

describe("POST /api/paypal/subscriptions", () => {
  it("subscribes the shopper to the recurring product's plan", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(json({ access_token: "tok", expires_in: 3600 }))
        .mockResolvedValueOnce(json({ id: "PROD-1" }))
        .mockResolvedValueOnce(json({ id: "P-1" }))
        .mockResolvedValueOnce(json({ id: "I-SUB-1", status: "APPROVAL_PENDING" })),
    );

    const response = await POST(
      new Request("http://localhost/api/paypal/subscriptions", {
        method: "POST",
        body: JSON.stringify({ slug: "coffee-subscription" }),
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.subscriptionId).toBe("I-SUB-1");
  });

  it("refuses a product that does not repeat", async () => {
    const response = await POST(
      new Request("http://localhost/api/paypal/subscriptions", {
        method: "POST",
        body: JSON.stringify({ slug: "noise-cancelling-headphones" }),
      }),
    );

    expect(response.status).toBe(400);
  });
});
