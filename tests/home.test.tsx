import { beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "@/app/page";
import { readMarketProduct } from "@/lib/market/channel3";
import { recordedProduct } from "./fixtures/channel3-listings";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

// The entry reads a real listing. This suite is about the screen's own
// behaviour, so the live read is fixed to the record captured from the
// catalogue; what `readMarketProduct` does with the wire is tested where it
// lives.
vi.mock("@/lib/market/channel3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/market/channel3")>();
  return { ...actual, readMarketProduct: vi.fn() };
});

// The BARK description states the term but says nothing about leaving. The
// reading is fixed so this suite tests how the entry renders that silence; the
// reader itself is tested where it lives.
vi.mock("@/lib/commitment/published-exit", async () => {
  const actual = await vi.importActual<typeof import("@/lib/commitment/published-exit")>(
    "@/lib/commitment/published-exit",
  );
  return {
    ...actual,
    resolveExitTerm: vi.fn(async () => ({
      kind: "silent" as const,
      exit: { kind: "unknown" as const },
      note: "The seller's published terms do not say what it costs to leave.",
      quoted: null,
    })),
  };
});

beforeEach(() => {
  vi.mocked(readMarketProduct).mockReset();
  vi.mocked(readMarketProduct).mockResolvedValue(recordedProduct("YyLUjLT"));
});

describe("the front door", () => {
  it("states the promise, and who it is for, before asking anyone to choose", async () => {
    render(await Home());

    expect(
      screen.getByRole("heading", { name: /what it costs, before you agree to it/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/what it costs to leave/i).length).toBeGreaterThan(0);
    // IPD 21: the audience is named in words, not left to be inferred from the
    // scope of the vocabulary.
    expect(screen.getByText(/dyscalculia, ADHD and dyslexia/i)).toBeInTheDocument();
  });

  it("puts the seller's words beside the figures they produced", async () => {
    render(await Home());

    expect(
      screen.getByRole("heading", { name: /what the seller wrote/i }),
    ).toBeInTheDocument();
    // The listing's own copy, printed rather than summarised.
    expect(screen.getAllByText(/6 month BarkBox plan/i).length).toBeGreaterThan(0);
    // The merchant said nothing about leaving, so the figure says so rather
    // than filling in a zero.
    const exit = document.querySelector("[data-figure='exit']");
    expect(exit).not.toBeNull();
    expect(exit).toHaveTextContent(/not stated/i);
  });

  it("works one commitment in full before anything is clicked", async () => {
    render(await Home());

    expect(screen.getByText("Across the term")).toBeInTheDocument();
    expect(screen.getByText("At least $149.94")).toBeInTheDocument();
    expect(screen.getByText("Cost to leave")).toBeInTheDocument();
    expect(screen.getByText("Charged today")).toBeInTheDocument();
    expect(screen.getAllByText(/At least \$24\.99/).length).toBeGreaterThan(0);
  });

  it("says where the worked example's figures came from, and that nothing was created", async () => {
    render(await Home());

    expect(
      screen.getByText(/computed from the price Channel3 lists at bark\.co/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/nothing has been charged and nothing has been created at paypal/i),
    ).toBeInTheDocument();
  });

  it("performs no further request and creates nothing when it renders", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(await Home());

    expect(fetchMock).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("offers one primary action into the journey", async () => {
    render(await Home());

    const primary = screen.getByRole("link", { name: /check this commitment/i });
    expect(primary).toHaveAttribute("href", "/product/ch3-YyLUjLT");
  });

  it("keeps the other ways in at a second rank, not as four equal cards", async () => {
    render(await Home());

    const doors = screen.getAllByRole("listitem");
    expect(doors).toHaveLength(3);
    expect(screen.getByText("A purchase you pay once")).toBeInTheDocument();
    expect(screen.getByText("A bill you were sent")).toBeInTheDocument();
    expect(screen.getByText("A document someone sent you")).toBeInTheDocument();
  });

  it("keeps the live shop reachable without making it the product", async () => {
    render(await Home());

    expect(screen.getByRole("link", { name: /search real products/i })).toHaveAttribute(
      "href",
      "/shop",
    );
  });
});

describe("the bill door", () => {
  it("asks PayPal for a bill and opens the screen it produces", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ invoiceId: "INV2-1" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(await Home());
    await userEvent.click(screen.getByRole("button", { name: /clinic visit/i }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/paypal/invoices",
      expect.objectContaining({ method: "POST" }),
    );
    expect(push).toHaveBeenCalledWith("/bill/INV2-1?slug=clinic-visit");
    vi.unstubAllGlobals();
  });

  it("says so when PayPal will not issue the bill, instead of opening a broken page", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "PayPal could not create this bill (INVALID_REQUEST)." }),
      }),
    );

    render(await Home());
    await userEvent.click(screen.getByRole("button", { name: /clinic visit/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(/INVALID_REQUEST/);
    expect(push).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
