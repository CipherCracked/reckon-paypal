import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ensurePlan, createSubscription } from "@/lib/paypal/subscriptions";
import { resetTokenCache } from "@/lib/paypal/client";
import { POST } from "@/app/api/paypal/subscriptions/route";
import { money } from "@/lib/money";

// The route resolves through PayPal first, the file second. These tests are
// about what the route sends to PayPal, so the resolver answers from the file
// and the fetch mock counts only the calls the route itself makes.
vi.mock("@/lib/catalog/resolve", async () => {
  const { findProduct } = await import("@/lib/catalog/products");
  return {
    resolveProduct: vi.fn(async (slug: string) => {
      const product = findProduct(slug);
      if (!product) return null;
      return {
        ...product,
        sources: { paypal: null, published: "the terms shown on this page" },
        descriptionLabel: "the description shown on this page",
      };
    }),
  };
});

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
  description: "Freshly roasted, $12.00 a bag, delivered every month.",
  amount: money(1200),
  interval: "MONTH" as const,
  totalCycles: 12,
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

  it("gives the plan the same number of charges the screen promises", async () => {
    // A plan with total_cycles 0 charges until it is cancelled. The schedule
    // line says "12 payments", so the plan has to stop at twelve.
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ access_token: "tok", expires_in: 3600 }))
      .mockResolvedValueOnce(json({ id: "PROD-1" }))
      .mockResolvedValueOnce(json({ id: "P-1" }));
    vi.stubGlobal("fetch", fetchMock);

    await ensurePlan(planInput);

    const planRequest = JSON.parse(fetchMock.mock.calls[2][1].body);
    expect(planRequest.billing_cycles[0].total_cycles).toBe(12);
  });

  it("refuses a term with no end rather than creating an open-ended plan", async () => {
    vi.stubGlobal("fetch", vi.fn());

    await expect(ensurePlan({ ...planInput, totalCycles: 0 })).rejects.toThrow(/whole number/);
    await expect(ensurePlan({ ...planInput, totalCycles: 1.5 })).rejects.toThrow(/whole number/);
  });

  it("treats an existing product and plan as success instead of creating a duplicate", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(json({ access_token: "tok", expires_in: 3600 }))
        .mockResolvedValueOnce(duplicate())
        .mockResolvedValueOnce(duplicate())
        .mockResolvedValueOnce(
          json({
            plans: [
              { id: "P-EXISTING", name: "Commitment demo plan P-DEMO-COFFEE-MONTHLY 12x" },
            ],
          }),
        ),
    );

    await expect(ensurePlan(planInput)).resolves.toBe("P-EXISTING");
  });

  it("does not send a plan id, which PayPal does not accept on creation", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ access_token: "tok", expires_in: 3600 }))
      .mockResolvedValueOnce(json({ id: "PROD-1" }))
      .mockResolvedValueOnce(json({ id: "P-1" }));
    vi.stubGlobal("fetch", fetchMock);

    await ensurePlan(planInput);

    const planRequest = JSON.parse(fetchMock.mock.calls[2][1].body);
    expect(planRequest).not.toHaveProperty("id");
    expect(planRequest.product_id).toBe("PROD-1");
  });
});

describe("createSubscription", () => {
  it("creates a subscription against the plan and returns the approval link", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(json({ access_token: "tok", expires_in: 3600 }))
        .mockResolvedValueOnce(
          json({
            id: "I-SUB-1",
            status: "APPROVAL_PENDING",
            links: [
              { href: "https://www.sandbox.paypal.com/webapps/billing/x", rel: "approve" },
            ],
          }),
        ),
    );

    await expect(
      createSubscription("P-1", {
        returnUrl: "http://localhost/consent/pending?slug=coffee&approved=1",
        cancelUrl: "http://localhost/consent/pending?slug=coffee&cancelled=1",
      }),
    ).resolves.toEqual({
      id: "I-SUB-1",
      status: "APPROVAL_PENDING",
      approveUrl: "https://www.sandbox.paypal.com/webapps/billing/x",
    });
  });

  it("tells PayPal where to send the shopper back, or the flow ends at PayPal", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ access_token: "tok", expires_in: 3600 }))
      .mockResolvedValueOnce(json({ id: "I-SUB-1", status: "APPROVAL_PENDING" }));
    vi.stubGlobal("fetch", fetchMock);

    await createSubscription("P-1", {
      returnUrl: "http://localhost/consent/pending?slug=coffee&approved=1",
      cancelUrl: "http://localhost/consent/pending?slug=coffee&cancelled=1",
    });

    const body = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(body.application_context).toEqual({
      user_action: "SUBSCRIBE_NOW",
      return_url: "http://localhost/consent/pending?slug=coffee&approved=1",
      cancel_url: "http://localhost/consent/pending?slug=coffee&cancelled=1",
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

  it("passes PayPal's approval link through to the browser", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(json({ access_token: "tok", expires_in: 3600 }))
        .mockResolvedValueOnce(json({ id: "PROD-1" }))
        .mockResolvedValueOnce(json({ id: "P-1" }))
        .mockResolvedValueOnce(
          json({
            id: "I-SUB-1",
            status: "APPROVAL_PENDING",
            links: [
              { href: "https://www.sandbox.paypal.com/webapps/billing/x", rel: "approve" },
            ],
          }),
        ),
    );

    const response = await POST(
      new Request("http://localhost/api/paypal/subscriptions", {
        method: "POST",
        body: JSON.stringify({ slug: "coffee-subscription" }),
      }),
    );
    const body = await response.json();

    expect(body.approveUrl).toBe("https://www.sandbox.paypal.com/webapps/billing/x");
  });

  it("sends the shopper back to this origin after approving", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ access_token: "tok", expires_in: 3600 }))
      .mockResolvedValueOnce(json({ id: "PROD-1" }))
      .mockResolvedValueOnce(json({ id: "P-1" }))
      .mockResolvedValueOnce(json({ id: "I-SUB-1", status: "APPROVAL_PENDING" }));
    vi.stubGlobal("fetch", fetchMock);

    await POST(
      new Request("https://shop.example/api/paypal/subscriptions", {
        method: "POST",
        body: JSON.stringify({ slug: "coffee-subscription" }),
      }),
    );

    const subscriptionRequest = JSON.parse(fetchMock.mock.calls[3][1].body);
    expect(subscriptionRequest.application_context.return_url).toBe(
      "https://shop.example/consent/pending?slug=coffee-subscription&approved=1",
    );
    expect(subscriptionRequest.application_context.cancel_url).toBe(
      "https://shop.example/consent/pending?slug=coffee-subscription&cancelled=1",
    );
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

  it("creates the plan for the term the screen states", async () => {
    // The coffee subscription is a 12-month term. Whatever the screen says the
    // shopper is agreeing to, the plan PayPal charges them from must say it too.
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ access_token: "tok", expires_in: 3600 }))
      .mockResolvedValueOnce(json({ id: "PROD-1" }))
      .mockResolvedValueOnce(json({ id: "P-1" }))
      .mockResolvedValueOnce(json({ id: "I-SUB-1", status: "APPROVAL_PENDING" }));
    vi.stubGlobal("fetch", fetchMock);

    await POST(
      new Request("http://localhost/api/paypal/subscriptions", {
        method: "POST",
        body: JSON.stringify({ slug: "coffee-subscription" }),
      }),
    );

    const planRequest = JSON.parse(fetchMock.mock.calls[2][1].body);
    expect(planRequest.billing_cycles[0].total_cycles).toBe(12);
  });
});
