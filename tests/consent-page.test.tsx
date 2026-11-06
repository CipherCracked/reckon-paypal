import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConsentScreen } from "@/components/ConsentScreen";
import { GET } from "@/app/api/commitment/[orderId]/route";
import { extractTerms } from "@/lib/ai/extract-terms";
import { computeCommitment } from "@/lib/commitment/compute";
import { presentFigures } from "@/lib/commitment/present";
import { money } from "@/lib/money";
import type { CommitmentTerms } from "@/lib/commitment/types";

vi.mock("@/lib/ai/extract-terms", () => ({
  extractTerms: vi.fn(),
}));

const terms: CommitmentTerms = {
  shape: "recurring",
  itemPrice: money(1100),
  shipping: money(0),
  tax: money(100),
  recurrence: { count: 12, period: "month" },
  exit: { kind: "fee", fee: money(0) },
};

const translation = computeCommitment(terms);

const payload = {
  translation,
  figures: presentFigures(terms, translation),
  labels: { item: "Coffee, one bag", shipping: "Shipping", tax: "Sales tax" },
  summary: "You pay monthly for one year.",
  degraded: false,
};

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, json: async () => payload })),
  );
  vi.mocked(extractTerms).mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("consent screen", () => {
  it("shows the three figures for the purchase", async () => {
    render(<ConsentScreen orderId="ORDER-1" slug="coffee-subscription" />);

    expect(await screen.findByText("Charged today")).toBeInTheDocument();

    const todayRow = screen.getByText("Charged today").closest("div") as HTMLElement;
    expect(within(todayRow).getByText("$12.00")).toBeInTheDocument();
    expect(screen.getByText("$144.00")).toBeInTheDocument();
    expect(screen.getByText("Cost to leave")).toBeInTheDocument();
  });

  it("says where the screen belongs in production, so the demo store is not mistaken for the product", async () => {
    render(<ConsentScreen orderId="ORDER-1" slug="coffee-subscription" />);

    expect(
      await screen.findByText(/this is a demonstration store\. the check needs only the amount/i),
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

    render(<ConsentScreen orderId="ORDER-1" slug="coffee-subscription" />);

    expect(
      await screen.findByText(/we could not write a plain-language summary for this purchase/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Charged today")).toBeInTheDocument();
    expect(screen.getByText("$144.00")).toBeInTheDocument();
  });

  it("moves focus to the breakdown when the shopper says the amount does not match", async () => {
    render(<ConsentScreen orderId="ORDER-1" slug="coffee-subscription" />);
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

    render(<ConsentScreen orderId="pending" slug="coffee-subscription" />);
    await screen.findByText("Charged today");

    await userEvent.click(screen.getByRole("button", { name: /pay now/i }));

    expect(fetchMock).toHaveBeenLastCalledWith("/api/paypal/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: "coffee-subscription" }),
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
        json: async () => ({ status: "COMPLETED", amount: { currency: "USD", minor: 1200 } }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<ConsentScreen orderId="ORDER-1" slug="coffee-subscription" returning />);

    expect(
      await screen.findByText(/payment complete\. paypal has charged/i),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith("/api/paypal/orders/ORDER-1/capture", {
      method: "POST",
    });
    expect(
      await screen.findByRole("link", { name: /keep a record of this payment/i }),
    ).toHaveAttribute("href", "/receipt/ORDER-1?slug=coffee-subscription");
  });

  it("reassures the shopper that nothing was charged when they back out at PayPal", async () => {
    render(<ConsentScreen orderId="ORDER-1" slug="coffee-subscription" cancelled />);

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

    render(<ConsentScreen orderId="I-SUB-1" slug="coffee-subscription" />);
    await screen.findByText("Charged today");

    await userEvent.click(screen.getByRole("button", { name: /approve subscription/i }));

    expect(fetchMock).toHaveBeenLastCalledWith("/api/paypal/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: "coffee-subscription" }),
    });
    expect(
      await screen.findByRole("link", { name: /approve .* with paypal/i }),
    ).toHaveAttribute("href", "https://www.sandbox.paypal.com/webapps/billing/x");
  });
});

describe("GET /api/commitment/:orderId", () => {
  const request = (slug: string) =>
    new Request(`http://localhost/api/commitment/ORDER-1?slug=${slug}`);

  it("returns the translation and the extracted summary", async () => {
    vi.mocked(extractTerms).mockResolvedValueOnce({
      shape: "recurring",
      recurrenceCount: 12,
      recurrencePeriod: "month",
      cancellationWindowDays: null,
      exitFeeKnown: true,
      labels: payload.labels,
      summary: payload.summary,
    });

    const response = await GET(request("coffee-subscription"), {
      params: Promise.resolve({ orderId: "ORDER-1" }),
    });
    const body = await response.json();

    expect(body.degraded).toBe(false);
    expect(body.translation.today.minor).toBe(1200);
    expect(body.summary).toBe("You pay monthly for one year.");
  });

  it("degrades to the PayPal amount when the terms cannot be read", async () => {
    vi.mocked(extractTerms).mockRejectedValueOnce(new Error("model unavailable"));

    const response = await GET(request("coffee-subscription"), {
      params: Promise.resolve({ orderId: "ORDER-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.degraded).toBe(true);
    expect(body.translation.today.minor).toBe(1200);
    expect(body.labels.item).toBe("Coffee Subscription");
  });
});
