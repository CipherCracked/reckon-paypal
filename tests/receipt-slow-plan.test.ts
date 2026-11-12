import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { money } from "@/lib/money";
import { resetTokenCache } from "@/lib/paypal/client";
import { retrieveSubscription } from "@/lib/paypal/retrieve";

/**
 * The receipt's plan read is the one that supplies *Across the term* and
 * *Charged today*. It was given the two-second render deadline while every
 * sibling read on the same page was given eight, so a slow answer was swallowed
 * by a `catch` and the receipt showed two of its three figures as blank.
 *
 * PayPal's own read is the only thing this suite fakes, and it honours the
 * signal the way `fetch` does: the deadline works by aborting, so a stub that
 * ignored the signal could not tell one budget from another.
 */

const tokenResponse = {
  ok: true,
  json: async () => ({ access_token: "tok", expires_in: 3600 }),
};

const subscriptionResponse = {
  ok: true,
  json: async () => ({ id: "I-1", status: "ACTIVE", plan_id: "P-1" }),
};

const planResponse = {
  ok: true,
  json: async () => ({
    id: "P-1",
    billing_cycles: [
      {
        frequency: { interval_unit: "MONTH", interval_count: 1 },
        tenure_type: "REGULAR",
        total_cycles: 6,
        pricing_scheme: { fixed_price: { currency_code: "USD", value: "24.99" } },
      },
    ],
  }),
};

/** 2,500 ms: longer than the render budget, well inside the detail budget. */
const SLOW_MS = 2_500;

function stubPayPal(): void {
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string, init?: RequestInit) => {
      if (String(url).includes("/v1/oauth2/token")) return Promise.resolve(tokenResponse);
      if (String(url).includes("/v1/billing/plans/")) {
        return new Promise((resolve, reject) => {
          const timer = setTimeout(() => resolve(planResponse), SLOW_MS);
          init?.signal?.addEventListener("abort", () => {
            clearTimeout(timer);
            const aborted = new Error("The operation was aborted.");
            aborted.name = "AbortError";
            reject(aborted);
          });
        });
      }
      return Promise.resolve(subscriptionResponse);
    }),
  );
}

beforeEach(() => {
  vi.stubEnv("PAYPAL_CLIENT_ID", "test-client-id");
  vi.stubEnv("PAYPAL_CLIENT_SECRET", "test-client-secret");
  vi.stubEnv("PAYPAL_BASE_URL", "https://api-m.sandbox.paypal.com");
  resetTokenCache();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("a plan PayPal is slow to describe", () => {
  it("is still read, so the receipt keeps its term total and today's charge", async () => {
    stubPayPal();
    vi.useFakeTimers();

    const reading = retrieveSubscription("I-1");
    await vi.advanceTimersByTimeAsync(SLOW_MS + 100);
    const record = await reading;

    expect(record.terms).not.toBeNull();
    expect(record.terms?.recurrence).toEqual({ count: 6, period: "month" });
    expect(record.amount).toEqual(money(2499));
  });

  it("gives up rather than waiting on PayPal indefinitely", async () => {
    // The detail deadline is a budget, not a promise to wait: a plan read that
    // never answers must still leave the page with everything else it has.
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string, init?: RequestInit) => {
        if (String(url).includes("/v1/oauth2/token")) return Promise.resolve(tokenResponse);
        if (String(url).includes("/v1/billing/plans/")) {
          return new Promise((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => {
              const aborted = new Error("The operation was aborted.");
              aborted.name = "AbortError";
              reject(aborted);
            });
          });
        }
        return Promise.resolve(subscriptionResponse);
      }),
    );
    vi.useFakeTimers();

    const reading = retrieveSubscription("I-1");
    await vi.advanceTimersByTimeAsync(10_000);
    const record = await reading;

    expect(record.terms).toBeNull();
    expect(record.status).toBe("ACTIVE");
  });
});
