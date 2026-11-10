import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ensurePlan, createSubscription } from "@/lib/paypal/subscriptions";
import { resetTokenCache } from "@/lib/paypal/client";
import { POST } from "@/app/api/paypal/subscriptions/route";
import { SUSPEND_AFTER_FAILED_PAYMENTS } from "@/lib/commitment/plan-policy";
import { money } from "@/lib/money";

// The route resolves through PayPal first, the catalogue second, the file
// last. These tests are about what the route sends to PayPal, so the resolver
// answers from the recorded listing fixture (and from the file for the one-time
// product) while the fetch mock counts only the calls the route itself makes.
vi.mock("@/lib/catalog/resolve", async () => {
  const { findProduct } = await import("@/lib/catalog/products");
  const { money: amount } = await import("@/lib/money");
  const { curatedTerm, subscriptionTerms } = await import("@/lib/market/subscriptions");
  const { recordedProduct } = await import("./fixtures/channel3-listings");
  const listed = recordedProduct("YyLUjLT");

  return {
    resolveProduct: vi.fn(async (slug: string) => {
      if (slug === "ch3-YyLUjLT") {
        return {
          slug,
          name: listed.title,
          description: listed.description,
          terms: subscriptionTerms(listed.offers[0], curatedTerm("YyLUjLT")!),
          sources: {
            paypal: null,
            published:
              "the price Channel3 lists at bark.co and the term the listing states (“6 month BarkBox plan”)",
          },
          descriptionLabel: "the description Channel3 lists for this product",
          listed: true,
        };
      }

      // No catalogue entry has the financed shape today. The route still has a
      // branch for it, and this term is what that branch is handed.
      if (slug === "financed-example") {
        return {
          slug,
          name: "A financed example",
          description: "Twelve instalments and one opening fee.",
          terms: {
            shape: "financed",
            itemPrice: amount(10500),
            shipping: amount(0),
            tax: amount(0),
            installment: { count: 12, amount: amount(10500) },
            openingFee: amount(6000),
            exit: { kind: "unknown" },
          },
          sources: { paypal: null, published: "the terms shown on this page" },
          descriptionLabel: "the description shown on this page",
        };
      }

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
  productId: "DEMO-SUBSCRIPTION",
  planId: "P-DEMO-MONTHLY",
  description: "A box for dogs, $24.99 a delivery, every month for six months.",
  amount: money(2499),
  interval: "MONTH" as const,
  totalCycles: 6,
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
      value: "24.99",
    });
  });

  it("gives the plan the same number of charges the screen promises", async () => {
    // A plan with total_cycles 0 charges until it is cancelled. The schedule
    // line says "6 payments", so the plan has to stop at six.
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ access_token: "tok", expires_in: 3600 }))
      .mockResolvedValueOnce(json({ id: "PROD-1" }))
      .mockResolvedValueOnce(json({ id: "P-1" }));
    vi.stubGlobal("fetch", fetchMock);

    await ensurePlan(planInput);

    const planRequest = JSON.parse(fetchMock.mock.calls[2][1].body);
    expect(planRequest.billing_cycles[0].total_cycles).toBe(6);
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
              { id: "P-EXISTING", name: "Commitment demo plan P-DEMO-MONTHLY 6x" },
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

  it("takes an opening fee through PayPal's setup fee, which it charges at activation", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ access_token: "tok", expires_in: 3600 }))
      .mockResolvedValueOnce(json({ id: "PROD-1" }))
      .mockResolvedValueOnce(json({ id: "P-1" }));
    vi.stubGlobal("fetch", fetchMock);

    await ensurePlan({ ...planInput, setupFee: money(6000) });

    const planRequest = JSON.parse(fetchMock.mock.calls[2][1].body);
    expect(planRequest.payment_preferences.setup_fee).toEqual({
      currency_code: "USD",
      value: "60.00",
    });
  });

  it("suspends the plan on the number of failed payments the screen states", async () => {
    // The screen tells the shopper this before they agree, so the plan must be
    // created with it. Both read the same constant: a promise written twice is a
    // promise that can drift.
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ access_token: "tok", expires_in: 3600 }))
      .mockResolvedValueOnce(json({ id: "PROD-1" }))
      .mockResolvedValueOnce(json({ id: "P-1" }));
    vi.stubGlobal("fetch", fetchMock);

    await ensurePlan(planInput);

    const planRequest = JSON.parse(fetchMock.mock.calls[2][1].body);
    expect(planRequest.payment_preferences.payment_failure_threshold).toBe(
      SUSPEND_AFTER_FAILED_PAYMENTS,
    );
  });

  it("says nothing about a fee when there is none, rather than saying zero", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ access_token: "tok", expires_in: 3600 }))
      .mockResolvedValueOnce(json({ id: "PROD-1" }))
      .mockResolvedValueOnce(json({ id: "P-1" }));
    vi.stubGlobal("fetch", fetchMock);

    await ensurePlan({ ...planInput, setupFee: money(0) });

    const planRequest = JSON.parse(fetchMock.mock.calls[2][1].body);
    expect(planRequest.payment_preferences).not.toHaveProperty("setup_fee");
  });

  it("shortens copy PayPal would refuse, and marks where it stopped", async () => {
    // PayPal refuses a catalog product description over 256 characters — at the
    // create call the shopper is waiting on to reach the approval page, which is
    // the one place in this flow where a refusal costs the agreement itself. The
    // ellipsis is the point: a shortened description must never read as a
    // complete sentence the merchant wrote.
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ access_token: "tok", expires_in: 3600 }))
      .mockResolvedValueOnce(json({ id: "PROD-1" }))
      .mockResolvedValueOnce(json({ id: "P-1" }));
    vi.stubGlobal("fetch", fetchMock);

    await ensurePlan({ ...planInput, description: "A box for dogs. ".repeat(40) });

    const productRequest = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(productRequest.description).toHaveLength(256);
    expect(productRequest.description.endsWith("…")).toBe(true);
  });

  it("sends no description rather than a shortened one it was told to leave out", async () => {
    // A listing's copy lives in a catalogue this app reads live, and every screen
    // quotes it from there. Sending the first 256 characters would put a sentence
    // this app cut onto PayPal's product and offer it as the merchant's.
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ access_token: "tok", expires_in: 3600 }))
      .mockResolvedValueOnce(json({ id: "PROD-1" }))
      .mockResolvedValueOnce(json({ id: "P-1" }));
    vi.stubGlobal("fetch", fetchMock);

    await ensurePlan({ ...planInput, description: null });

    const productRequest = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(productRequest).not.toHaveProperty("description");
  });

  it("names the plan after its term and its fee, in the plan's own language", async () => {
    // A repeated run finds the plan it made last time by this exact name. One
    // that spelled the fee as a raw object would never match — and would show
    // "[object Object]" to anyone reading the plan in PayPal's dashboard.
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ access_token: "tok", expires_in: 3600 }))
      .mockResolvedValueOnce(json({ id: "PROD-1" }))
      .mockResolvedValueOnce(json({ id: "P-1" }));
    vi.stubGlobal("fetch", fetchMock);

    await ensurePlan({ ...planInput, setupFee: money(6000) });

    const planRequest = JSON.parse(fetchMock.mock.calls[2][1].body);
    expect(planRequest.name).toBe("Commitment demo plan P-DEMO-MONTHLY 6x +60.00");
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
        returnUrl: "http://localhost/consent/pending?slug=ch3-YyLUjLT&approved=1",
        cancelUrl: "http://localhost/consent/pending?slug=ch3-YyLUjLT&cancelled=1",
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
      returnUrl: "http://localhost/consent/pending?slug=ch3-YyLUjLT&approved=1",
      cancelUrl: "http://localhost/consent/pending?slug=ch3-YyLUjLT&cancelled=1",
    });

    const body = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(body.application_context).toEqual({
      user_action: "SUBSCRIBE_NOW",
      return_url: "http://localhost/consent/pending?slug=ch3-YyLUjLT&approved=1",
      cancel_url: "http://localhost/consent/pending?slug=ch3-YyLUjLT&cancelled=1",
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
        body: JSON.stringify({ slug: "ch3-YyLUjLT" }),
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
        body: JSON.stringify({ slug: "ch3-YyLUjLT" }),
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
        body: JSON.stringify({ slug: "ch3-YyLUjLT" }),
      }),
    );

    const subscriptionRequest = JSON.parse(fetchMock.mock.calls[3][1].body);
    expect(subscriptionRequest.application_context.return_url).toBe(
      "https://shop.example/consent/pending?slug=ch3-YyLUjLT&approved=1",
    );
    expect(subscriptionRequest.application_context.cancel_url).toBe(
      "https://shop.example/consent/pending?slug=ch3-YyLUjLT&cancelled=1",
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
    // The listing states six months. Whatever the screen says the shopper is
    // agreeing to, the plan PayPal charges them from must say it too.
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
        body: JSON.stringify({ slug: "ch3-YyLUjLT" }),
      }),
    );

    const planRequest = JSON.parse(fetchMock.mock.calls[2][1].body);
    expect(planRequest.billing_cycles[0].total_cycles).toBe(6);
    expect(planRequest.billing_cycles[0].pricing_scheme.fixed_price).toEqual({
      currency_code: "USD",
      value: "24.99",
    });
  });

  it("does not cut a listing's copy down to fit a PayPal field", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ access_token: "tok", expires_in: 3600 }))
      .mockResolvedValueOnce(json({ id: "PROD-1" }))
      .mockResolvedValueOnce(json({ id: "P-1" }))
      .mockResolvedValueOnce(json({ id: "I-SUB-1", status: "APPROVAL_PENDING" }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new Request("http://localhost/api/paypal/subscriptions", {
        method: "POST",
        body: JSON.stringify({ slug: "ch3-YyLUjLT" }),
      }),
    );

    expect(response.status).toBe(200);
    const productRequest = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(productRequest).not.toHaveProperty("description");
  });

  it("schedules a financed term as its instalments plus the fee, not one charge", async () => {
    // A financed term promises 12 × $105.00 and a $60.00 fee taken once. This is
    // the only thing that makes that promise true: PayPal's own schedule of
    // charges.
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ access_token: "tok", expires_in: 3600 }))
      .mockResolvedValueOnce(json({ id: "PROD-1" }))
      .mockResolvedValueOnce(json({ id: "P-1" }))
      .mockResolvedValueOnce(json({ id: "I-SUB-1", status: "APPROVAL_PENDING" }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new Request("http://localhost/api/paypal/subscriptions", {
        method: "POST",
        body: JSON.stringify({ slug: "financed-example" }),
      }),
    );

    expect(response.status).toBe(200);
    const planRequest = JSON.parse(fetchMock.mock.calls[2][1].body);
    expect(planRequest.billing_cycles[0].total_cycles).toBe(12);
    expect(planRequest.billing_cycles[0].frequency).toEqual({
      interval_unit: "MONTH",
      interval_count: 1,
    });
    expect(planRequest.billing_cycles[0].pricing_scheme.fixed_price).toEqual({
      currency_code: "USD",
      value: "105.00",
    });
    expect(planRequest.payment_preferences.setup_fee).toEqual({
      currency_code: "USD",
      value: "60.00",
    });
  });
});
