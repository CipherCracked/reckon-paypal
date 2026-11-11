import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { Shell } from "@/components/Shell";
import Shop from "@/app/shop/page";
import ReadPage from "@/app/read/page";
import ProductPage from "@/app/product/[slug]/page";
import ConsentPage from "@/app/consent/[orderId]/page";
import BillPage from "@/app/bill/[invoiceId]/page";
import ReceiptPage from "@/app/receipt/[orderId]/page";
import { retrieveInvoice, retrieveOrder } from "@/lib/paypal/retrieve";
import { readMarketProduct } from "@/lib/market/channel3";
import { money } from "@/lib/money";
import { recordedProduct } from "./fixtures/channel3-listings";

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

// The product page reads the live catalogue. These tests are about the frame
// around each screen, so the read is fixed to the recorded listing; what the
// catalogue client does with the wire is tested where it lives.
vi.mock("@/lib/market/channel3", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/market/channel3")>()),
  readMarketProduct: vi.fn(),
}));

// The BARK description states the term and says nothing about leaving, so the
// exit stays absent with the seller's silence as its reason.
vi.mock("@/lib/commitment/published-exit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/commitment/published-exit")>()),
  resolveExitTerm: vi.fn(async () => ({
    kind: "silent" as const,
    exit: { kind: "unknown" as const },
    note: "The seller's published terms do not say what it costs to leave.",
    quoted: null,
  })),
}));

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
  vi.mocked(readMarketProduct).mockReset();
  vi.mocked(readMarketProduct).mockResolvedValue(recordedProduct("YyLUjLT"));
});

describe("the frame", () => {
  it("gives the keyboard one way past itself, before anything else", async () => {
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

  it("names the service and gives it somewhere to go home to", async () => {
    render(
      <Shell>
        <p>page content</p>
      </Shell>,
    );

    expect(
      screen.getByRole("link", { name: /accessible commerce companion/i }),
    ).toHaveAttribute("href", "/");
  });

  it("does not repeat a status line on every screen", async () => {
    render(
      <Shell>
        <p>page content</p>
      </Shell>,
    );

    expect(screen.queryByText(/sandbox/i)).toBeNull();
    expect(screen.queryByText(/example/i)).toBeNull();
  });
});

describe("the way in (IPD 27, revised by IPD 28)", () => {
  it("offers nothing where signing in cannot work", () => {
    render(
      <Shell>
        <p>page content</p>
      </Shell>,
    );

    // A Sign in that leads to a page saying signing in is off is a claim the
    // frame is not allowed to make.
    expect(screen.queryByRole("link", { name: /sign in|your commitments/i })).toBeNull();
  });

  it("points the sign-in at the sign-in itself, not at a page about it", () => {
    render(
      <Shell canSignIn>
        <p>page content</p>
      </Shell>,
    );

    // The owner's report: the control was a link to /account, which is where the
    // control already was. It now starts the sign-in.
    expect(screen.getByRole("link", { name: /^sign in$/i })).toHaveAttribute(
      "href",
      "/auth/paypal/start",
    );
  });

  it("offers a way out where signing in can work, instead of a second sign-in", () => {
    const { container } = render(
      <Shell canSignIn signedIn>
        <p>page content</p>
      </Shell>,
    );

    expect(screen.queryByRole("link", { name: /^sign in$/i })).toBeNull();
    // Signed in, the frame's control ends the session. It is a POST so a stray
    // link cannot end it for someone (IPD 28).
    const signOut = screen.getByRole("button", { name: /sign out/i });
    expect(signOut).toHaveAttribute("type", "submit");
    expect(container.querySelector("form")?.getAttribute("action")).toBe("/auth/paypal/signout");
  });

  it("puts the product's sections in the frame once, not on every page", () => {
    render(
      <Shell canSignIn>
        <p>page content</p>
      </Shell>,
    );

    const sections = screen.getByRole("navigation", { name: /sections/i });
    expect(
      within(sections).getByRole("link", { name: /^shop$/i }),
    ).toHaveAttribute("href", "/shop");
    expect(
      within(sections).getByRole("link", { name: /read a document/i }),
    ).toHaveAttribute("href", "/read");
  });
});

describe("the journey", () => {
  it("names where the shop's back link goes", async () => {
    render(await Shop({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole("link", { name: /back to the start/i })).toHaveAttribute("href", "/");
  });

  it("names where the reader's back link goes", async () => {
    render(<ReadPage />);

    expect(screen.getByRole("link", { name: /back to the start/i })).toHaveAttribute("href", "/");
  });

  it("names the commitment the consent screen goes back to", async () => {
    render(
      await ConsentPage({
        params: Promise.resolve({ orderId: "pending" }),
        searchParams: Promise.resolve({ slug: "ch3-YyLUjLT" }),
      }),
    );

    expect(
      screen.getByRole("link", { name: /back to this product/i }),
    ).toHaveAttribute("href", "/product/ch3-YyLUjLT");
  });

  it("gives the product screen a way out", async () => {
    render(
      await ProductPage({ params: Promise.resolve({ slug: "ch3-YyLUjLT" }) }),
    );

    // A listing came from the shop, so its way out goes back to the search
    // rather than to the front door.
    expect(screen.getByRole("link", { name: /back to the shop/i })).toHaveAttribute(
      "href",
      "/shop",
    );
  });

  it("gives the bill screen a way out", async () => {
    render(
      await BillPage({
        params: Promise.resolve({ invoiceId: "INV2-1" }),
        searchParams: Promise.resolve({ slug: "clinic-visit" }),
      }),
    );

    expect(screen.getByRole("link", { name: /back to the document reader/i })).toHaveAttribute(
      "href",
      "/read",
    );
  });

  it("ends the record with its ways on, and none of them back into the payment", async () => {
    render(
      await ReceiptPage({
        params: Promise.resolve({ orderId: "I-SUB-1" }),
        searchParams: Promise.resolve({ slug: "ch3-YyLUjLT" }),
      }),
    );

    // IPD 28: the record is a page of the product, not a terminal one.
    expect(screen.getByRole("link", { name: /back to the start/i })).toHaveAttribute("href", "/");
    expect(
      screen.getByRole("link", { name: /see everything this store holds for you/i }),
    ).toHaveAttribute("href", "/account");
    expect(screen.getByRole("link", { name: /read a document/i })).toHaveAttribute(
      "href",
      "/read",
    );

    // Nothing on a record reopens the thing that already happened.
    expect(document.querySelector('a[href^="/consent"]')).toBeNull();
  });
});
