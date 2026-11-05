import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { ConsentScreen } from "@/components/ConsentScreen";
import { GET } from "@/app/api/commitment/[orderId]/route";
import { extractTerms } from "@/lib/ai/extract-terms";
import { money } from "@/lib/money";

vi.mock("@/lib/ai/extract-terms", () => ({
  extractTerms: vi.fn(),
}));

const translation = {
  today: money(1200),
  acrossTerm: money(14400),
  exit: money(0),
  breakdown: { item: money(1000), shipping: money(100), tax: money(100) },
};

const payload = {
  translation,
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

  it("shows the PayPal amount and says plainly that the terms could not be read", async () => {
    vi.mocked(fetch as unknown as () => Promise<unknown>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...payload, degraded: true, summary: "" }),
    });

    render(<ConsentScreen orderId="ORDER-1" slug="coffee-subscription" />);

    expect(
      await screen.findByText(
        /we could not read the terms for this purchase\. here is the amount paypal will charge\./i,
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("$12.00")).toBeInTheDocument();
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
