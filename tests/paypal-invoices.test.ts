import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createInvoice } from "@/lib/paypal/invoices";
import { resetTokenCache } from "@/lib/paypal/client";
import { money } from "@/lib/money";

const tokenResponse = {
  ok: true,
  json: async () => ({ access_token: "tok", expires_in: 3600 }),
};

const created = (value: string, dueDate = "2026-11-21", links?: unknown[]) => ({
  ok: true,
  json: async () => ({
    id: "INV2-TEST-0001",
    status: "DRAFT",
    amount: { currency_code: "USD", value },
    detail: { payment_term: { due_date: dueDate } },
    links: links ?? [],
  }),
});

const sent = (links?: unknown[]) => ({
  ok: true,
  json: async () => ({ status: "SENT", links: links ?? [] }),
});

const draft = {
  reference: "clinic-visit",
  description: "Clinic visit",
  amount: money(26000),
  dueInDays: 14,
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

describe("createInvoice", () => {
  it("creates the bill, sends it, and returns the payer's page", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(tokenResponse)
        .mockResolvedValueOnce(created("260.00"))
        .mockResolvedValueOnce(
          sent([{ href: "https://www.sandbox.paypal.com/invoice/p/#INV2TEST", rel: "payer-view" }]),
        ),
    );

    const invoice = await createInvoice(draft, new Date("2026-11-07T12:00:00Z"));

    expect(invoice.id).toBe("INV2-TEST-0001");
    expect(invoice.status).toBe("SENT");
    expect(invoice.amount).toEqual(money(26000));
    expect(invoice.dueDate).toBe("2026-11-21");
    expect(invoice.payerUrl).toBe("https://www.sandbox.paypal.com/invoice/p/#INV2TEST");
    expect(invoice.missingLink).toBe(false);
  });

  it("asks PayPal for the terms we will render, not the ones it prefers", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse)
      .mockResolvedValueOnce(created("260.00"))
      .mockResolvedValueOnce(sent([{ href: "https://x", rel: "payer-view" }]));
    vi.stubGlobal("fetch", fetchMock);

    await createInvoice(draft, new Date("2026-11-07T12:00:00Z"));

    const createBody = JSON.parse(fetchMock.mock.calls[1][1].body as string);
    expect(createBody.detail.currency_code).toBe("USD");
    expect(createBody.detail.invoice_number).toBe("clinic-visit");
    expect(createBody.detail.payment_term).toEqual({
      term_type: "DUE_ON_DATE_SPECIFIED",
      due_date: "2026-11-21",
    });
    expect(createBody.items[0].unit_amount).toEqual({ currency_code: "USD", value: "260.00" });
  });

  it("refuses a bill whose amount PayPal did not agree to", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(tokenResponse).mockResolvedValueOnce(created("150.00")),
    );

    await expect(createInvoice(draft)).rejects.toThrow(
      "PayPal returned $150.00, but $260.00 was requested.",
    );
  });

  it("reports a missing payment link instead of pretending the bill is payable", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(tokenResponse)
        .mockResolvedValueOnce(created("260.00"))
        .mockResolvedValueOnce(sent([])),
    );

    const invoice = await createInvoice(draft);

    expect(invoice.payerUrl).toBeNull();
    expect(invoice.missingLink).toBe(true);
  });

  it("falls back to the draft's own link when sending returns none", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(tokenResponse)
        .mockResolvedValueOnce(
          created("260.00", "2026-11-21", [{ href: "https://draft", rel: "payer-view" }]),
        )
        .mockResolvedValueOnce(sent([])),
    );

    const invoice = await createInvoice(draft);

    expect(invoice.payerUrl).toBe("https://draft");
  });
});
