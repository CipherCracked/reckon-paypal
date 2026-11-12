import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resetTokenCache } from "@/lib/paypal/client";
import { retrievePaymentsTaken } from "@/lib/paypal/transactions";
import { money } from "@/lib/money";

const tokenResponse = {
  ok: true,
  json: async () => ({ access_token: "tok", expires_in: 3600 }),
};

type Wire = { status?: string; value?: string; currency?: string; extra?: Record<string, unknown> };

const transaction = ({ status = "COMPLETED", value = "24.99", currency = "USD", extra }: Wire) => ({
  id: "TX-1",
  time: "2026-11-10T20:48:29.000Z",
  status,
  amount_with_breakdown: { gross_amount: { currency_code: currency, value } },
  ...extra,
});

const transactionsResponse = (transactions: unknown[]) => ({
  ok: true,
  json: async () => ({ transactions }),
});

const refused = {
  ok: false,
  status: 403,
  json: async () => ({ name: "NOT_AUTHORIZED", message: "no" }),
};

const STARTED = "2026-11-10T20:47:51Z";

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

describe("retrievePaymentsTaken", () => {
  it("counts the completed payments and adds their amounts", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(tokenResponse)
        .mockResolvedValueOnce(transactionsResponse([transaction({}), transaction({})])),
    );

    await expect(retrievePaymentsTaken("I-SUB-1", STARTED)).resolves.toEqual({
      kind: "read",
      count: 2,
      amount: money(4998),
    });
  });

  it("counts only money that moved and stayed", async () => {
    // APPROVED is an authorisation, PENDING is not a payment, and the two
    // refund states are money that came back. A line that counted any of them
    // as taken would state a charge PayPal's own record says was reversed.
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(tokenResponse)
        .mockResolvedValueOnce(
          transactionsResponse([
            transaction({ status: "COMPLETED", value: "24.99" }),
            transaction({ status: "APPROVED", value: "24.99" }),
            transaction({ status: "PENDING", value: "24.99" }),
            transaction({ status: "REFUNDED", value: "24.99" }),
            transaction({ status: "PARTIALLY_REFUNDED", value: "24.99" }),
          ]),
        ),
    );

    await expect(retrievePaymentsTaken("I-SUB-1", STARTED)).resolves.toEqual({
      kind: "read",
      count: 1,
      amount: money(2499),
    });
  });

  it("says a payment's amount is unstated rather than leaving it out of the total", async () => {
    // Half a total is worse than no total: "$49.98 taken" for three payments is
    // a figure nobody could check. The count is still known, so it is kept.
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(tokenResponse)
        .mockResolvedValueOnce(
          transactionsResponse([
            transaction({}),
            { id: "TX-2", status: "COMPLETED" },
          ]),
        ),
    );

    await expect(retrievePaymentsTaken("I-SUB-1", STARTED)).resolves.toEqual({
      kind: "read",
      count: 2,
      amount: null,
    });
  });

  it("never carries the payer's name or email past the boundary", async () => {
    // The endpoint returns them on every transaction. The product has no use for
    // either, and a record is a thing that gets printed, cached and logged.
    let seen = "";
    vi.stubGlobal("fetch", async (url: string) => {
      if (String(url).includes("/v1/oauth2/token")) return tokenResponse;
      const response = transactionsResponse([
        transaction({ extra: { payer_name: "Ada Lovelace", payer_email: "ada@example.com" } }),
      ]);
      seen = JSON.stringify(await response.json());
      return response;
    });

    const record = await retrievePaymentsTaken("I-SUB-1", STARTED);

    expect(seen).toContain("ada@example.com");
    expect(JSON.stringify(record)).not.toContain("ada@example.com");
    expect(JSON.stringify(record)).not.toContain("Ada Lovelace");
  });

  it("asks for the agreement's own window, starting when PayPal says it started", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse)
      .mockResolvedValueOnce(transactionsResponse([]));
    vi.stubGlobal("fetch", fetchMock);

    await retrievePaymentsTaken("I-SUB-1", STARTED);

    const url = new URL(String(fetchMock.mock.calls[1][0]));
    expect(url.pathname).toBe("/v1/billing/subscriptions/I-SUB-1/transactions");
    expect(Date.parse(url.searchParams.get("start_time") ?? "")).toBe(Date.parse(STARTED));
    expect(Date.parse(url.searchParams.get("end_time") ?? "")).toBeGreaterThan(Date.now());
  });

  it("reaches back three years when PayPal stated no start", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse)
      .mockResolvedValueOnce(transactionsResponse([]));
    vi.stubGlobal("fetch", fetchMock);

    await retrievePaymentsTaken("I-SUB-1", null);

    const url = new URL(String(fetchMock.mock.calls[1][0]));
    const years = (Date.now() - Date.parse(url.searchParams.get("start_time") ?? "")) / 31557600000;
    expect(years).toBeGreaterThan(2.9);
  });

  it("refuses to report zero when it could not look", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(tokenResponse).mockResolvedValueOnce(refused),
    );

    await expect(retrievePaymentsTaken("I-SUB-1", STARTED)).resolves.toEqual({
      kind: "unavailable",
    });
  });

  it("refuses a currency the product cannot state", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(tokenResponse)
        .mockResolvedValueOnce(transactionsResponse([transaction({ currency: "EUR" })])),
    );

    await expect(retrievePaymentsTaken("I-SUB-1", STARTED)).resolves.toEqual({
      kind: "unavailable",
    });
  });
});
