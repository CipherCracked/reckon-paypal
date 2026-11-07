import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { Shell } from "@/components/Shell";
import Shop from "@/app/shop/page";
import ReadPage from "@/app/read/page";
import ProductPage from "@/app/product/[slug]/page";
import ConsentPage from "@/app/consent/[orderId]/page";
import BillPage from "@/app/bill/[invoiceId]/page";
import ReceiptPage from "@/app/receipt/[orderId]/page";
import { retrieveInvoice, retrieveOrder } from "@/lib/paypal/retrieve";
import { money } from "@/lib/money";

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/paypal/retrieve", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/paypal/retrieve")>();
  return { ...actual, retrieveInvoice: vi.fn(), retrieveOrder: vi.fn() };
});

beforeEach(() => {
  vi.mocked(retrieveInvoice).mockReset();
  vi.mocked(retrieveInvoice).mockResolvedValue({
    id: "INV2-1",
    status: "SENT",
    amount: money(26000),
    dueDate: "2026-11-21",
    payerUrl: null,
  });
  vi.mocked(retrieveOrder).mockReset();
  vi.mocked(retrieveOrder).mockResolvedValue({ status: "COMPLETED" } as never);
});

describe("the frame", () => {
  it("gives the keyboard one way past itself, before anything else", () => {
    render(
      <Shell>
        <p>page content</p>
      </Shell>,
    );

    const skip = screen.getAllByRole("link")[0];
    expect(skip).toHaveTextContent(/skip to the content/i);
    expect(skip).toHaveAttribute("href", "#main");

    const main = document.getElementById("main");
    expect(main).not.toBeNull();
    expect(main).toHaveTextContent("page content");
  });

  it("names the service and gives it somewhere to go home to", () => {
    render(
      <Shell>
        <p>page content</p>
      </Shell>,
    );

    expect(
      screen.getByRole("link", { name: /accessible commerce companion/i }),
    ).toHaveAttribute("href", "/");
  });

  it("does not repeat a status line on every screen", () => {
    render(
      <Shell>
        <p>page content</p>
      </Shell>,
    );

    expect(screen.queryByText(/sandbox/i)).toBeNull();
    expect(screen.queryByText(/example/i)).toBeNull();
  });
});

describe("the journey", () => {
  it("names where the shop's back link goes", () => {
    render(<Shop />);

    expect(screen.getByRole("link", { name: /back to the ways in/i })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("names where the reader's back link goes", () => {
    render(<ReadPage />);

    expect(screen.getByRole("link", { name: /back to the ways in/i })).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("names the commitment the consent screen goes back to", async () => {
    render(
      await ConsentPage({
        params: Promise.resolve({ orderId: "pending" }),
        searchParams: Promise.resolve({ slug: "coffee-subscription" }),
      }),
    );

    expect(
      screen.getByRole("link", { name: /back to coffee subscription/i }),
    ).toHaveAttribute("href", "/product/coffee-subscription");
  });

  it("gives the product screen a way out", async () => {
    render(
      await ProductPage({ params: Promise.resolve({ slug: "coffee-subscription" }) }),
    );

    expect(screen.getByRole("link", { name: /back to the ways in/i })).toBeInTheDocument();
  });

  it("gives the bill screen a way out", async () => {
    render(
      await BillPage({
        params: Promise.resolve({ invoiceId: "INV2-1" }),
        searchParams: Promise.resolve({ slug: "clinic-visit" }),
      }),
    );

    expect(screen.getByRole("link", { name: /back to the ways in/i })).toBeInTheDocument();
  });

  it("ends the record with two ways on and no way back into the payment", async () => {
    render(
      await ReceiptPage({
        params: Promise.resolve({ orderId: "I-SUB-1" }),
        searchParams: Promise.resolve({ slug: "coffee-subscription" }),
      }),
    );

    expect(screen.getByRole("link", { name: /read another document/i })).toHaveAttribute(
      "href",
      "/read",
    );
    expect(screen.getByRole("link", { name: /browse the shop/i })).toHaveAttribute(
      "href",
      "/shop",
    );
    expect(screen.queryByRole("link", { name: /^back/i })).toBeNull();
  });
});
