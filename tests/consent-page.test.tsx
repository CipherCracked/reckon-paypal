import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConsentScreen } from "@/components/ConsentScreen";
import { GET } from "@/app/api/commitment/[orderId]/route";
import { extractTerms } from "@/lib/ai/extract-terms";
import { resolveExitTerm } from "@/lib/commitment/published-exit";
import { computeCommitment } from "@/lib/commitment/compute";
import { presentFigures } from "@/lib/commitment/present";
import { readProductFromPayPal } from "@/lib/paypal/catalog";
import { readMarketProduct } from "@/lib/market/channel3";
import { money } from "@/lib/money";
import { recordedProduct } from "./fixtures/channel3-listings";
import type { CommitmentTerms } from "@/lib/commitment/types";

vi.mock("@/lib/ai/extract-terms", () => ({
  extractTerms: vi.fn(),
}));

vi.mock("@/lib/commitment/published-exit", async () => {
  const actual = await vi.importActual<typeof import("@/lib/commitment/published-exit")>(
    "@/lib/commitment/published-exit",
  );
  return { ...actual, resolveExitTerm: vi.fn() };
});

vi.mock("@/lib/paypal/catalog", () => ({
  readProductCardFromPayPal: vi.fn(),
  readProductFromPayPal: vi.fn(),
}));

vi.mock("@/lib/market/channel3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/market/channel3")>();
  return { ...actual, readMarketProduct: vi.fn() };
});

const terms: CommitmentTerms = {
  shape: "recurring",
  itemPrice: money(2499),
  shipping: null,
  tax: null,
  recurrence: { count: 6, period: "month" },
  exit: { kind: "unknown" },
};

const translation = computeCommitment(terms);

const payload = {
  translation,
  figures: presentFigures(terms, translation, { unstatedAt: "checkout" }),
  labels: { item: "Each delivery", shipping: "Shipping", tax: "Sales tax" },
  summary: "You pay monthly for six months.",
  sources: { paypal: null, published: "the price Channel3 lists at bark.co" },
  exitNote: null,
  exitUnreadable: false,
  quotedExit: null,
  degraded: false,
};

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, json: async () => payload })),
  );
  vi.mocked(extractTerms).mockReset();
  vi.mocked(readProductFromPayPal).mockReset();
  vi.mocked(readProductFromPayPal).mockResolvedValue(null);
  vi.mocked(readMarketProduct).mockReset();
  vi.mocked(readMarketProduct).mockResolvedValue(recordedProduct("YyLUjLT"));
  // A stated term never reaches the model, which is the common case here.
  vi.mocked(resolveExitTerm).mockResolvedValue({
    kind: "stated",
    exit: terms.exit,
    note: null,
    quoted: null,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("consent screen", () => {
  it("shows the three figures for the purchase", async () => {
    render(<ConsentScreen orderId="ORDER-1" slug="ch3-YyLUjLT" />);

    expect(await screen.findByText("Charged today")).toBeInTheDocument();

    const todayRow = screen.getByText("Charged today").closest("div") as HTMLElement;
    expect(within(todayRow).getByText("At least $24.99")).toBeInTheDocument();
    expect(screen.getByText("At least $149.94")).toBeInTheDocument();
    expect(screen.getByText("Cost to leave")).toBeInTheDocument();
  });

  it("states its own status once, at the point of payment, and says where the check belongs", async () => {
    render(<ConsentScreen orderId="ORDER-1" slug="ch3-YyLUjLT" />);

    expect(
      await screen.findByText(
        /this shop is an example, and payments run in paypal's sandbox, so no real money moves/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/it fits any checkout, not just this one/i),
    ).toBeInTheDocument();
  });

  it("keeps the three figures when only the wording is unavailable", async () => {
    vi.mocked(fetch as unknown as () => Promise<unknown>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...payload, degraded: true, summary: "" }),
    });

    render(<ConsentScreen orderId="ORDER-1" slug="ch3-YyLUjLT" />);

    expect(
      await screen.findByText(/we could not write a plain-language summary for this purchase/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Charged today")).toBeInTheDocument();
    expect(screen.getByText("At least $149.94")).toBeInTheDocument();
  });

  it("moves focus to the breakdown when the shopper says the amount does not match", async () => {
    render(<ConsentScreen orderId="ORDER-1" slug="ch3-YyLUjLT" />);
    await screen.findByText("Charged today");

    await userEvent.click(screen.getByRole("button", { name: /show me the breakdown/i }));

    expect(document.activeElement?.textContent).toBe("Where these figures come from");
  });

  it("sends a one-time purchase to PayPal's approval page before capturing", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...payload, shape: "one_time" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          orderId: "ORDER-1",
          approveUrl: "https://www.sandbox.paypal.com/checkoutnow?token=ORDER-1",
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<ConsentScreen orderId="pending" slug="ch3-YyLUjLT" />);
    await screen.findByText("Charged today");

    await userEvent.click(screen.getByRole("button", { name: /pay now/i }));

    expect(fetchMock).toHaveBeenLastCalledWith("/api/paypal/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: "ch3-YyLUjLT" }),
    });
    expect(
      await screen.findByRole("link", { name: /approve the payment with paypal/i }),
    ).toHaveAttribute("href", "https://www.sandbox.paypal.com/checkoutnow?token=ORDER-1");
  });

  it("captures the order when the shopper comes back from approving", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...payload, shape: "one_time" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "COMPLETED", amount: { currency: "USD", minor: 2499 } }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<ConsentScreen orderId="ORDER-1" slug="ch3-YyLUjLT" returning />);

    expect(
      await screen.findByText(/payment complete\. paypal has charged/i),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith("/api/paypal/orders/ORDER-1/capture", {
      method: "POST",
    });
    expect(
      await screen.findByRole("link", { name: /keep a record of this payment/i }),
    ).toHaveAttribute("href", "/receipt/ORDER-1?slug=ch3-YyLUjLT");
  });

  it("reassures the shopper that nothing was charged when they back out at PayPal", async () => {
    render(<ConsentScreen orderId="ORDER-1" slug="ch3-YyLUjLT" cancelled />);

    expect(
      await screen.findByText(/you left paypal before approving\. nothing has been charged\./i),
    ).toBeInTheDocument();
  });

  it("sends a repeating purchase to PayPal's subscription approval, not to a capture", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...payload, shape: "recurring" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          subscriptionId: "I-SUB-1",
          status: "APPROVAL_PENDING",
          approveUrl: "https://www.sandbox.paypal.com/webapps/billing/x",
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<ConsentScreen orderId="I-SUB-1" slug="ch3-YyLUjLT" />);
    await screen.findByText("Charged today");

    await userEvent.click(screen.getByRole("button", { name: /approve subscription/i }));

    expect(fetchMock).toHaveBeenLastCalledWith("/api/paypal/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: "ch3-YyLUjLT" }),
    });
    expect(
      await screen.findByRole("link", { name: /approve .* with paypal/i }),
    ).toHaveAttribute("href", "https://www.sandbox.paypal.com/webapps/billing/x");
  });
});

describe("GET /api/commitment/:orderId", () => {
  const request = (slug: string) =>
    new Request(`http://localhost/api/commitment/ORDER-1?slug=${slug}`);

  it("returns the live listing's figures and schedule without asking a model", async () => {
    const response = await GET(request("ch3-YyLUjLT"), {
      params: Promise.resolve({ orderId: "ORDER-1" }),
    });
    const body = await response.json();

    expect(body.degraded).toBe(false);
    expect(body.shape).toBe("recurring");
    expect(body.translation.today.minor).toBe(2499);
    expect(body.translation.acrossTerm.minor).toBe(14994);
    expect(body.sources.published).toContain("bark.co");
    expect(body.schedule).toMatch(/6 payments of \$24\.99, one a month/);
    expect(body.summary).toBe("");
    expect(extractTerms).not.toHaveBeenCalled();
  });

  it("names the parts itself, so the labels cannot change between two loads", async () => {
    const bodyOf = async () =>
      (await GET(request("ch3-YyLUjLT"), {
        params: Promise.resolve({ orderId: "ORDER-1" }),
      })).json();

    const first = await bodyOf();
    const second = await bodyOf();

    expect(first.labels).toEqual(second.labels);
    expect(first.labels).toEqual({
      item: "BARK 6 Month Subscription",
      shipping: "Shipping",
      tax: "Sales tax",
    });
  });

  it("reads a one-time listing from PayPal first, and names the plan", async () => {
    vi.mocked(readProductFromPayPal).mockResolvedValue({
      slug: "noise-cancelling-headphones",
      paypalProductId: "PROD-1",
      name: "Noise-Cancelling Headphones",
      description: "Ships in two working days.",
      terms: {
        shape: "one_time",
        itemPrice: money(4999),
        shipping: money(0),
        tax: money(0),
        exit: { kind: "none" },
      },
      planLabel: "the PayPal plan for Noise-Cancelling Headphones",
    });

    const response = await GET(request("noise-cancelling-headphones"), {
      params: Promise.resolve({ orderId: "ORDER-1" }),
    });
    const body = await response.json();

    expect(body.sources).toEqual({
      paypal: "the PayPal plan for Noise-Cancelling Headphones",
      published: null,
    });
    expect(body.translation.today).toEqual(money(4999));
  });

  it("keeps the figures when the exit read fails", async () => {
    vi.mocked(resolveExitTerm).mockRejectedValueOnce(new Error("model unavailable"));

    const response = await GET(request("ch3-YyLUjLT"), {
      params: Promise.resolve({ orderId: "ORDER-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.exitUnreadable).toBe(true);
    expect(body.degraded).toBe(false);
    expect(body.labels.item).toBe("BARK 6 Month Subscription");
  });
});
