import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Subscriptions from "@/app/shop/subscriptions/page";
import { money } from "@/lib/money";
import type { MarketPage, MarketProduct } from "@/lib/market/channel3";

// Only the catalogue read is mocked: the screen, the card and the sentences are
// the real code, so what is asserted here is what a shopper sees.
vi.mock("@/lib/market/channel3", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/market/channel3")>()),
  searchMarket: vi.fn(),
}));

import { searchMarket } from "@/lib/market/channel3";

const product = (id: string, title: string, description: string): MarketProduct => ({
  id,
  title,
  description,
  brand: "Dr. Squatch",
  image: null,
  rating: null,
  offers: [
    {
      domain: "shop.example",
      url: "https://shop.example/p",
      price: money(3600),
      compareAt: null,
      availability: "InStock",
    },
  ],
});

const page = (...products: MarketProduct[]): MarketPage => ({ products, nextToken: null });

const soap = product(
  "Bpc46Ob",
  "Bar Soap Subscription",
  "A subscription service providing a 6-pack of Dr. Squatch's natural men's bar soaps, billed and shipped on a quarterly basis.",
);
const calendar = product(
  "RjcfvkT",
  "2027 Cat in a Box Monthly Wall Calendar",
  "This 12 x 12 calendar features large monthly grids.",
);

beforeEach(() => {
  process.env.CHANNEL3_API_KEY = "test-key";
  vi.mocked(searchMarket).mockReset();
  vi.mocked(searchMarket).mockResolvedValue(page());
});

afterEach(() => {
  delete process.env.CHANNEL3_API_KEY;
});

describe("the shelf of things that charge more than once", () => {
  it("shows a tile per listing, quoting the seller's words that put it there", async () => {
    vi.mocked(searchMarket).mockResolvedValue(page(soap, calendar));

    render(await Subscriptions());

    expect(screen.getByRole("link", { name: /Bar Soap Subscription/ })).toHaveAttribute(
      "href",
      "/product/ch3-Bpc46Ob",
    );
    expect(screen.getByText(/billed and shipped on a quarterly basis/)).toBeInTheDocument();
    // The calendar matched the search and was refused by the reading.
    expect(screen.queryByText(/2027 Cat in a Box/)).not.toBeInTheDocument();
  });

  it("says whose words the shelf shows, so a tile is evidence rather than a verdict", async () => {
    vi.mocked(searchMarket).mockResolvedValue(page(soap));

    render(await Subscriptions());

    expect(screen.getByText(/the phrase that says so is quoted from the listing/i)).toBeInTheDocument();
  });

  it("says nothing it can read is there, rather than showing an empty grid", async () => {
    vi.mocked(searchMarket).mockResolvedValue(page(calendar));

    render(await Subscriptions());

    expect(screen.getByText(/none of the listings it returned say they charge more than once/i)).toBeInTheDocument();
  });

  it("says the catalogue could not be reached rather than that nothing repeats", async () => {
    vi.mocked(searchMarket).mockRejectedValue(new Error("fetch failed"));

    render(await Subscriptions());

    expect(screen.getByText(/could not be reached just now/i)).toBeInTheDocument();
    expect(screen.queryByText(/none of the listings it returned/i)).not.toBeInTheDocument();
  });
});
