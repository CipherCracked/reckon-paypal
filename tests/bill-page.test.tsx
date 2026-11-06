import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import BillPage from "@/app/bill/[invoiceId]/page";
import { retrieveInvoice } from "@/lib/paypal/retrieve";
import { money } from "@/lib/money";

vi.mock("@/lib/paypal/retrieve", () => ({ retrieveInvoice: vi.fn() }));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

const record = {
  id: "INV2-1",
  status: "SENT",
  amount: money(26000),
  dueDate: "2026-11-21",
  payerUrl: "https://www.sandbox.paypal.com/invoice/p/#INV2-1",
};

async function renderBill(slug = "clinic-visit") {
  const element = await BillPage({
    params: Promise.resolve({ invoiceId: "INV2-1" }),
    searchParams: Promise.resolve({ slug }),
  });
  return render(element);
}

beforeEach(() => {
  vi.mocked(retrieveInvoice).mockReset();
  vi.mocked(retrieveInvoice).mockResolvedValue(record);
});

describe("the bill screen", () => {
  it("leads with the date the biller set, not with the amount", async () => {
    await renderBill();

    expect(screen.getByText(/Due 21 November 2026/)).toBeInTheDocument();
  });

  it("renders the same three figures as any other commitment", async () => {
    await renderBill();

    expect(screen.getByText("Across the term")).toBeInTheDocument();
    expect(screen.getByText("Cost to leave")).toBeInTheDocument();
    expect(screen.getByText("Charged today")).toBeInTheDocument();
  });

  it("says a missing exit term is unstated rather than free", async () => {
    await renderBill();

    expect(screen.getByText(/Not stated/i)).toBeInTheDocument();
  });

  it("hands payment to PayPal rather than collecting card details", async () => {
    await renderBill();

    const link = screen.getByRole("link", { name: /pay this bill at paypal/i });
    expect(link).toHaveAttribute("href", record.payerUrl);
  });

  it("refuses to show figures when PayPal and the terms disagree", async () => {
    vi.mocked(retrieveInvoice).mockResolvedValue({ ...record, amount: money(15000) });

    await renderBill();

    expect(screen.getByRole("alert")).toHaveTextContent(/\$150\.00/);
    expect(screen.queryByText("Charged today")).toBeNull();
    expect(screen.queryByRole("link", { name: /pay this bill/i })).toBeNull();
  });

  it("still shows the computed figures when PayPal cannot be reached", async () => {
    vi.mocked(retrieveInvoice).mockRejectedValue(new Error("down"));

    await renderBill();

    expect(screen.getByText("Charged today")).toBeInTheDocument();
    expect(screen.getByText(/could not show this bill right now/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /pay this bill/i })).toBeNull();
  });

  it("does not invent a due date the biller never gave", async () => {
    vi.mocked(retrieveInvoice).mockResolvedValue({ ...record, dueDate: null });

    await renderBill();

    expect(screen.getByText(/No due date stated/i)).toBeInTheDocument();
  });

  it("refuses an unknown bill", async () => {
    await expect(renderBill("no-such-bill")).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
