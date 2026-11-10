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

    expect(screen.getByText(/\$22\.50 apart/)).toBeInTheDocument();
    expect(screen.getByText(/2 retailers in these results/)).toBeInTheDocument();
  });

  it("does not call a near miss a match when the results do not use the query", async () => {
    // The catalogue matches on more than spelling: a query it cannot answer
    // still comes back full. The count line must not present that as twelve
    // products for the shopper's words.
    vi.mocked(searchMarket).mockResolvedValue([
      product("prd00022", { title: "Z Shape Bracket", brand: null }),
      product("prd00023", { title: "Zipper Storage Bag", brand: null }),
    ]);

    render(await shop("zzzqqq"));

    expect(screen.getByText(/nothing the catalogue returned uses/i)).toBeInTheDocument();
    expect(screen.queryByText(/2 results for/i)).not.toBeInTheDocument();
  });

  it("counts the results that do use the query, and says what the rest are", async () => {
    vi.mocked(searchMarket).mockResolvedValue([
      product("prd00024", { title: "Desk Lamp", brand: null }),
      product("prd00025", { title: "Z Shape Bracket", brand: null }),
    ]);

    render(await shop("lamp"));

    expect(screen.getByText(/1 of the 2 results/i)).toBeInTheDocument();
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
