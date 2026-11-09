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
    // Unique per issuance — PayPal refuses a repeated invoice number.
    expect(createBody.detail.invoice_number).toBe(
      `clinic-visit-${new Date("2026-11-07T12:00:00Z").getTime().toString(36)}`,
    );
    expect(createBody.detail.payment_term).toEqual({
      term_type: "DUE_ON_DATE_SPECIFIED",
      due_date: "2026-11-21",
    });
    expect(createBody.items[0].unit_amount).toEqual({ currency_code: "USD", value: "260.00" });
  });

  it("gives two issuances of the same bill different numbers", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(tokenResponse)
      .mockResolvedValueOnce(created("260.00"))
      .mockResolvedValueOnce(sent([{ href: "https://x", rel: "payer-view" }]))
      .mockResolvedValueOnce(created("260.00"))
      .mockResolvedValueOnce(sent([{ href: "https://x", rel: "payer-view" }]));
    vi.stubGlobal("fetch", fetchMock);

    await createInvoice(draft, new Date("2026-11-07T12:00:00Z"));
    await createInvoice(draft, new Date("2026-11-07T12:00:01Z"));

    const numbers = fetchMock.mock.calls
      .filter((call) => {
        const url = String(call[0]);
        return url.endsWith("/v2/invoicing/invoices") && String(call[1]?.method) === "POST";
      })
      .map((call) => JSON.parse(call[1].body as string).detail.invoice_number);

    expect(numbers).toHaveLength(2);
    expect(new Set(numbers).size).toBe(2);
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
        .mockResolvedValueOnce(sent([]))
        // The bill is read back before it is called unpayable, and this one has no link either.
        .mockResolvedValueOnce(created("260.00", "2026-11-21", [])),
    );

    const invoice = await createInvoice(draft);

    expect(invoice.payerUrl).toBeNull();
    expect(invoice.missingLink).toBe(true);
  });

  it("finds the payer's page by reading the bill back when sending did not return it", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(tokenResponse)
        .mockResolvedValueOnce(created("260.00"))
        .mockResolvedValueOnce(sent([]))
        .mockResolvedValueOnce(
          created("260.00", "2026-11-21", [
            { href: "https://www.sandbox.paypal.com/invoice/p/#INV2TEST", rel: "payer-view" },
          ]),
        ),
    );

    const invoice = await createInvoice(draft);

    expect(invoice.payerUrl).toBe("https://www.sandbox.paypal.com/invoice/p/#INV2TEST");
    expect(invoice.missingLink).toBe(false);
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

  it("never offers the invoice resource as the page a payer opens", async () => {
    // `self` is the REST endpoint: a JSON response, not a page. The bill screen
    // labels whatever comes back "Pay this bill at PayPal", so an API URL there
    // sends the payer to JSON and calls it a payment.
    const resource = [
      { href: "https://api.sandbox.paypal.com/v2/invoicing/invoices/INV2-TEST-0001", rel: "self" },
    ];
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(tokenResponse)
        .mockResolvedValueOnce(created("260.00"))
        .mockResolvedValueOnce(sent(resource))
        .mockResolvedValueOnce(created("260.00", "2026-11-21", resource)),
    );

    const invoice = await createInvoice(draft);

    expect(invoice.payerUrl).toBeNull();
    expect(invoice.missingLink).toBe(true);
  });

  it("takes the payer's page from the recipient view PayPal keeps on the bill", async () => {
    // PayPal holds the payer's page in `detail.metadata.recipient_view_url`, and
    // the read-back is where it can be found when sending did not return it.
    const readBack = {
      ok: true,
      json: async () => ({
        id: "INV2-TEST-0001",
        status: "SENT",
        amount: { currency_code: "USD", value: "260.00" },
        detail: {
          payment_term: { due_date: "2026-11-21" },
          metadata: { recipient_view_url: "https://www.sandbox.paypal.com/invoice/p/#INV2TEST" },
        },
        links: [
          {
            href: "https://api.sandbox.paypal.com/v2/invoicing/invoices/INV2-TEST-0001",
            rel: "self",
          },
        ],
      }),
    };
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(tokenResponse)
        .mockResolvedValueOnce(created("260.00"))
        .mockResolvedValueOnce(sent([]))
        .mockResolvedValueOnce(readBack),
    );

    const invoice = await createInvoice(draft);

    expect(invoice.payerUrl).toBe("https://www.sandbox.paypal.com/invoice/p/#INV2TEST");
    expect(invoice.missingLink).toBe(false);
  });
});
