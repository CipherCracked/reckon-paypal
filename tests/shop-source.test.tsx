import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Shop from "@/app/shop/page";
import { searchMarket, type MarketProduct } from "@/lib/market/channel3";
import { money } from "@/lib/money";

// Only the read is mocked: the price arithmetic the shop renders is the real
// code, so a card that says "From $19.99" is the same path the product page runs.
vi.mock("@/lib/market/channel3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/market/channel3")>();
  return { ...actual, searchMarket: vi.fn() };
});

const product = (id: string, overrides: Partial<MarketProduct> = {}): MarketProduct => ({
  id,
  title: `Product ${id}`,
  description: "A description.",
  brand: "A brand",
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
});

const shop = (q?: string) => Shop({ searchParams: Promise.resolve(q ? { q } : {}) });

beforeEach(() => {
  vi.mocked(searchMarket).mockReset();
});

afterEach(() => {
  delete process.env.CHANNEL3_API_KEY;
});

describe("the shop is the live catalogue (IPD 22)", () => {
  it("shows a real listing's price and the retailer it came from", async () => {
    vi.mocked(searchMarket).mockResolvedValue([product("prd00020")]);

    render(await shop("headphones"));

    expect(screen.getByText("Product prd00020")).toBeInTheDocument();
    expect(screen.getByText("From $19.99 at shop.example")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Product prd00020/ })).toHaveAttribute(
      "href",
      "/product/ch3-prd00020",
    );
  });

  it("states the spread only when the retailers disagree", async () => {
    vi.mocked(searchMarket).mockResolvedValue([
      product("prd00021", {
        offers: [
          { domain: "a.example", url: "https://a.example/p", price: money(1000), compareAt: null, availability: "InStock" },
          { domain: "b.example", url: "https://b.example/p", price: money(3250), compareAt: null, availability: "InStock" },
        ],
      }),
    ]);

    render(await shop("lamps"));

    expect(screen.getByText(/\$22\.50 between the lowest and the highest/)).toBeInTheDocument();
    expect(screen.getByText(/2 retailers listing it/)).toBeInTheDocument();
  });

  it("passes the query through, and searches something by default", async () => {
    vi.mocked(searchMarket).mockResolvedValue([]);

    await shop("coffee maker");
    expect(searchMarket).toHaveBeenLastCalledWith("coffee maker");

    await shop();
    expect(searchMarket).toHaveBeenLastCalledWith("headphones");
  });

  it("says the catalogue found nothing rather than showing a near miss", async () => {
    vi.mocked(searchMarket).mockResolvedValue([]);

    render(await shop("a thing that does not exist"));

    expect(screen.getByText(/Nothing in the catalogue matched/)).toBeInTheDocument();
  });

  it("names a missing key as the reason there is nothing live to show", async () => {
    vi.mocked(searchMarket).mockRejectedValue(new Error("No product catalogue key is configured."));

    render(await shop("headphones"));

    expect(screen.getByRole("status")).toHaveTextContent(/no product catalogue key/i);
  });

  it("says the catalogue could not be reached, without inventing a shelf", async () => {
    process.env.CHANNEL3_API_KEY = "test-key";
    vi.mocked(searchMarket).mockRejectedValue(new Error("The product catalogue answered 500."));

    render(await shop("headphones"));

    expect(screen.getByRole("status")).toHaveTextContent(/could not be reached/);
    expect(screen.queryByText(/Product prd/)).toBeNull();
  });
});
