import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "@/app/api/paypal/subscriptions/[id]/cancel/route";
import { resetTokenCache } from "@/lib/paypal/client";

/**
 * The cancel route reports what PayPal said, and nothing else (ITD 21).
 *
 * The tests below are written around the one thing that must not happen: a
 * failed request reported as a cancellation. Every failure case asserts the
 * outcome is *not* `cancelled` as well as asserting what it is.
 */

const json = (body: unknown, ok = true, status = 200) => ({
  ok,
  status,
  json: async () => body,
  headers: { get: () => null },
});

const request = () => new Request("http://localhost/api/paypal/subscriptions/I-SUB-1/cancel", {
  method: "POST",
});

const call = () =>
  POST(request(), { params: Promise.resolve({ id: "I-SUB-1" }) });

/** PayPal's token handshake, then whatever the cancel endpoint answers. */
function paypal(second: unknown) {
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce(json({ access_token: "tok", expires_in: 3600 }))
    .mockResolvedValueOnce(second);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

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

describe("POST /api/paypal/subscriptions/:id/cancel", () => {
  it("cancels at PayPal when PayPal answers success", async () => {
    const fetchMock = paypal(new Response(null, { status: 204 }));

    const response = await call();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ outcome: "cancelled" });

    // It is PayPal's subscription that ends, so the id goes into the path —
    // encoded, because it is a value from the page and not a path we built.
    const [url, init] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(url).toBe(
      "https://api-m.sandbox.paypal.com/v1/billing/subscriptions/I-SUB-1/cancel",
    );
    expect(init.method).toBe("POST");
  });

  it("reports a subscription PayPal says is not running as not running", async () => {
    paypal(
      json(
        { name: "UNPROCESSABLE_ENTITY", details: [{ issue: "SUBSCRIPTION_STATUS_INVALID" }] },
        false,
        422,
      ),
    );

    const body = await (await call()).json();

    expect(body.outcome).not.toBe("cancelled");
    expect(body).toEqual({ outcome: "not-running", issue: "SUBSCRIPTION_STATUS_INVALID" });
  });

  it("treats an unknown subscription as one that is not running, not as our failure", async () => {
    paypal(
      json({ name: "RESOURCE_NOT_FOUND", details: [{ issue: "INVALID_RESOURCE_ID" }] }, false, 422),
    );

    expect((await (await call()).json()).outcome).toBe("not-running");
  });

  it("treats a 404 as not running even without an issue code", async () => {
    paypal(json({}, false, 404));

    const body = await (await call()).json();

    expect(body.outcome).not.toBe("unconfirmed");
    expect(body.outcome).toBe("not-running");
  });

  it("says only that it cannot tell when PayPal fails", async () => {
    // A 5xx after the request left us is exactly the case where PayPal may have
    // committed before the answer was lost. Reporting a cancellation here would
    // be inventing one; reporting a refusal would be denying a real one.
    paypal(json({ name: "INTERNAL_SERVER_ERROR" }, false, 500));

    const body = await (await call()).json();

    expect(body).toEqual({ outcome: "unconfirmed" });
  });

  it("says only that it cannot tell when the request never got an answer", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ access_token: "tok", expires_in: 3600 }))
      .mockRejectedValueOnce(new TypeError("fetch failed"));
    vi.stubGlobal("fetch", fetchMock);

    expect(await (await call()).json()).toEqual({ outcome: "unconfirmed" });
  });

  it("refuses to act without an id rather than guess one", async () => {
    const response = await POST(request(), { params: Promise.resolve({ id: "" }) });

    expect(response.status).toBe(400);
  });
});
