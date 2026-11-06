import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/paypal/invoices/route";
import { createInvoice } from "@/lib/paypal/invoices";
import { PayPalError } from "@/lib/paypal/client";
import { money } from "@/lib/money";

vi.mock("@/lib/paypal/invoices", () => ({ createInvoice: vi.fn() }));

function request(body: unknown): Request {
  return new Request("http://localhost:3000/api/paypal/invoices", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.mocked(createInvoice).mockReset();
  vi.mocked(createInvoice).mockResolvedValue({
    id: "INV2-1",
    status: "SENT",
    amount: money(26000),
    dueDate: "2026-11-21",
    payerUrl: "https://www.sandbox.paypal.com/invoice/p/#INV2-1",
    missingLink: false,
  });
});

describe("POST /api/paypal/invoices", () => {
  it("creates a bill for the amount the terms compute, not the first line", async () => {
    await POST(request({ slug: "clinic-visit" }));

    expect(vi.mocked(createInvoice)).toHaveBeenCalledWith(
      expect.objectContaining({
        reference: "clinic-visit",
        amount: money(26000),
        dueInDays: 14,
      }),
    );
  });

  it("returns the same figures the consent screen renders", async () => {
    const response = await POST(request({ slug: "clinic-visit" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.invoiceId).toBe("INV2-1");
    expect(body.dueDate).toBe("2026-11-21");
    expect(body.payerUrl).toContain("paypal.com/invoice");
    expect(body.figures.map((figure: { id: string }) => figure.id)).toEqual([
      "acrossTerm",
      "exit",
      "today",
    ]);
  });

  it("refuses a bill it does not know", async () => {
    const response = await POST(request({ slug: "not-a-bill" }));

    expect(response.status).toBe(404);
    expect(vi.mocked(createInvoice)).not.toHaveBeenCalled();
  });

  it("returns no figures when PayPal refuses to create the bill", async () => {
    vi.mocked(createInvoice).mockRejectedValue(new PayPalError("nope", 422, "INVALID_REQUEST"));

    const response = await POST(request({ slug: "clinic-visit" }));
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.error).toContain("INVALID_REQUEST");
    expect(body.figures).toBeUndefined();
  });

  it("treats a body that is not JSON as an unknown bill", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/paypal/invoices", { method: "POST", body: "not json" }),
    );

    expect(response.status).toBe(404);
  });
});
