import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ListedCommitment, ReadingWords } from "@/components/ListedCommitment";
import { ModelError } from "@/lib/ai/client";
import { requestQuotations } from "@/lib/ai/read-document";
import { clearPublishedExitCache } from "@/lib/commitment/published-exit";
import {
  cheapestInStock,
  readMarketProduct,
  type MarketOffer,
  type MarketProduct,
} from "@/lib/market/channel3";
import { money } from "@/lib/money";
import { recordedProduct } from "./fixtures/channel3-listings";

/**
 * The panel under a real listing's photograph, in each of the states the reading
 * can put it in (IPD 38, IPD 40).
 *
 * The states are kept apart because each answers a different question a shopper
 * asks — is this a subscription, how long, what if I stop — and merging any two
 * makes one of the answers false. The one thing they share is that none is a
 * default: each is a report of what the listing's own words said, and the two
 * that cannot produce a total offer no way to agree to one.
 */

vi.mock("@/lib/market/channel3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/market/channel3")>();
  return { ...actual, readMarketProduct: vi.fn() };
});

vi.mock("@/lib/ai/read-document", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/read-document")>();
  return { ...actual, requestQuotations: vi.fn() };
});

function listing(overrides: Partial<MarketProduct> = {}): MarketProduct {
  return {
    id: "prd00050",
    title: "A real product",
    description: "What the seller wrote.",
    brand: null,
    image: null,
    rating: null,
    offers: [
      {
        domain: "shop.example",
        url: "https://shop.example/p",
        price: money(1999),
        compareAt: null,
        availability: "InStock",
      },
    ],
    ...overrides,
  };
}

function offerOf(record: MarketProduct): MarketOffer {
  const offer = cheapestInStock(record.offers);
  if (!offer) throw new Error("this fixture has no in-stock offer");
  return offer;
}

async function panel(record: MarketProduct) {
  vi.mocked(readMarketProduct).mockResolvedValue(record);
  render(await ListedCommitment({ slug: `ch3-${record.id}`, offer: offerOf(record) }));
}

const SIX_MONTHS = {
  id: "prd00050",
  title: "BarkBox 6-Month Subscription",
  description: "A 6-Month Subscription, delivered monthly.",
};

beforeEach(() => {
  vi.mocked(readMarketProduct).mockReset();
  vi.mocked(requestQuotations).mockReset();
  // A model that was asked and pointed at nothing: the listing's own silence.
  vi.mocked(requestQuotations).mockResolvedValue({ quotations: [], summary: "" });
  clearPublishedExitCache();
});

describe("a listing that states a term this page can schedule", () => {
  it("shows the three figures and the way to agree to them", async () => {
    vi.mocked(requestQuotations).mockResolvedValue({
      quotations: [{ field: "termLength", quote: "6-Month Subscription" }],
      summary: "",
    });

    await panel(listing(SIX_MONTHS));

    expect(screen.getByText(/across the term/i)).toBeTruthy();
    expect(screen.getByText(/\$119\.94/)).toBeTruthy();
    expect(screen.getByRole("link", { name: /check this commitment/i })).toBeTruthy();
  });

  it("asks the model once for the whole panel, not once per question", async () => {
    // The schedule and the cost to leave are read from the same words. Two reads
    // of one text would be two waits on the page that shows the figures.
    vi.mocked(requestQuotations).mockResolvedValue({
      quotations: [{ field: "termLength", quote: "6-Month Subscription" }],
      summary: "",
    });

    await panel(listing(SIX_MONTHS));

    expect(requestQuotations).toHaveBeenCalledTimes(1);
  });
});

describe("a listing whose term this page cannot total", () => {
  it("names the charge period the term is written in, and offers no way to agree", async () => {
    vi.mocked(requestQuotations).mockResolvedValue({
      quotations: [
        { field: "termLength", quote: "12-month Coffee Club membership" },
        { field: "period", quote: "billed quarterly" },
      ],
      summary: "",
    });

    await panel(
      listing({ description: "A 12-month Coffee Club membership, billed quarterly." }),
    );

    expect(screen.getByText(/12-month Coffee Club membership/i)).toBeTruthy();
    expect(screen.getByText(/no total/i)).toBeTruthy();
    // The price charged today is still a fact, and the only figure left.
    expect(screen.getByText(/\$19\.99/)).toBeTruthy();
    expect(screen.queryByRole("link", { name: /check this commitment/i })).toBeNull();
  });

  it("says a term written in years is not one it can schedule", async () => {
    vi.mocked(requestQuotations).mockResolvedValue({
      quotations: [{ field: "termLength", quote: "a 1 year plan" }],
      summary: "",
    });

    await panel(listing({ description: "A tea club on a 1 year plan." }));

    expect(screen.getByText(/a 1 year plan/i)).toBeTruthy();
    expect(screen.getByText(/no total/i)).toBeTruthy();
    expect(screen.queryByRole("link", { name: /check this commitment/i })).toBeNull();
  });
});

describe("a listing that repeats and says nothing about when it stops", () => {
  it("says it runs for as long as you keep it, and offers no way to agree", async () => {
    vi.mocked(requestQuotations).mockResolvedValue({
      quotations: [{ field: "period", quote: "Billed monthly, cancel anytime" }],
      summary: "",
    });

    await panel(listing({ description: "Billed monthly, cancel anytime." }));

    expect(screen.getByText(/as long as you keep it/i)).toBeTruthy();
    expect(screen.getByText(/\$19\.99/)).toBeTruthy();
    expect(screen.queryByRole("link", { name: /check this commitment/i })).toBeNull();
  });
});

describe("a listing whose words say nothing about a term", () => {
  it("is a one-time purchase, and the sentence says why it is one", async () => {
    await panel(listing({ description: "A sturdy umbrella. Ships in two days." }));

    // Written by the reading having found nothing, not assumed from the shape.
    expect(screen.getByText(/paid once, so there is nothing to cancel/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: /check this commitment/i })).toBeTruthy();
  });
});

describe("a listing whose words could not be read", () => {
  it("says so, and offers a retry rather than a price to agree to", async () => {
    vi.mocked(requestQuotations).mockRejectedValue(
      new ModelError("The model did not answer in time."),
    );

    await panel(listing({ description: "A box. Terms unclear." }));

    expect(screen.getByText(/could not read the listing/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: /try again/i })).toBeTruthy();
    expect(screen.queryByRole("link", { name: /check this commitment/i })).toBeNull();
  });

  it("does not ask the model a second time for the cost to leave", async () => {
    // The one reading answered both questions. Re-asking would turn one timeout
    // into two waits and two failures on the same page.
    vi.mocked(requestQuotations).mockRejectedValue(
      new ModelError("The model did not answer in time."),
    );

    await panel(listing({ description: "A box. Terms unclear." }));

    expect(requestQuotations).toHaveBeenCalledTimes(1);
  });
});

// A curated listing is the product's own front door, and the model can be
// absent. The checked fixture is what stands between a demo and a blank page, so
// the panel must still schedule it (IPD 40, note on the entry).
describe("a curated listing when the model is not configured", () => {
  it("still shows a schedule, from the checked fixture", async () => {
    vi.mocked(requestQuotations).mockRejectedValue(new ModelError("No model is configured."));

    await panel(recordedProduct("YyLUjLT"));

    expect(screen.getByText(/across the term/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: /check this commitment/i })).toBeTruthy();
  });
});

describe("the wait", () => {
  it("says whose words are being read rather than showing a spinner", async () => {
    render(<ReadingWords />);

    expect(screen.getByText(/reading this listing's words/i)).toBeTruthy();
  });

  it("claims no figure the page does not have yet", async () => {
    render(<ReadingWords />);

    expect(screen.queryByText(/across the term/i)).toBeNull();
  });
});
