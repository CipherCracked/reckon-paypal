import { beforeEach, describe, expect, it, vi } from "vitest";
import { money } from "@/lib/money";
import type { MarketPage, MarketProduct } from "@/lib/market/channel3";

vi.mock("@/lib/market/channel3", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/market/channel3")>()),
  searchMarket: vi.fn(),
}));

import { searchMarket } from "@/lib/market/channel3";
import { SHELF_QUERIES, readRepeatingShelf } from "@/lib/market/repeating";

const product = (id: string, title: string, description: string): MarketProduct => ({
  id,
  title,
  description,
  brand: null,
  image: null,
  rating: null,
  offers: [
    {
      domain: "shop.example",
      url: "https://shop.example/p",
      price: money(4999),
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
const laptop = product(
  "leHmRex",
  "Precision Workstation Laptop",
  "A flagship professional workstation laptop designed for high-demand workloads.",
);

beforeEach(() => {
  vi.mocked(searchMarket).mockReset();
  vi.mocked(searchMarket).mockResolvedValue(page());
});

describe("reading the shelf out of the catalogue", () => {
  it("asks the catalogue for the words that surface recurring listings", async () => {
    await readRepeatingShelf();

    for (const query of SHELF_QUERIES) {
      expect(searchMarket).toHaveBeenCalledWith(query);
    }
  });

  it("keeps a result only when its own words say it charges more than once", async () => {
    vi.mocked(searchMarket).mockResolvedValue(page(soap, calendar, laptop));

    const tiles = await readRepeatingShelf();

    expect(tiles).toHaveLength(1);
    expect(tiles[0].product.id).toBe(soap.id);
    expect(tiles[0].quote).toBe(
      "A subscription service providing a 6-pack of Dr. Squatch's natural men's bar soaps, billed and shipped on a quarterly basis",
    );
  });

  it("shows a listing once, even when two queries both find it", async () => {
    vi.mocked(searchMarket).mockResolvedValue(page(soap));

    const tiles = await readRepeatingShelf();

    expect(tiles).toHaveLength(1);
  });

  it("keeps what one query found when the other does not answer", async () => {
    vi.mocked(searchMarket)
      .mockRejectedValueOnce(new Error("the catalogue dropped the call"))
      .mockResolvedValueOnce(page(soap));

    const tiles = await readRepeatingShelf();

    expect(tiles.map((tile) => tile.product.id)).toEqual([soap.id]);
  });

  it("throws when the catalogue answered nothing at all", async () => {
    vi.mocked(searchMarket).mockRejectedValue(new Error("the catalogue is down"));

    await expect(readRepeatingShelf()).rejects.toThrow(/catalogue is down/);
  });

  it("stops at one page's worth, however much the catalogue returns", async () => {
    const many = Array.from({ length: 40 }, (_, index) =>
      product(`id${index}`, `${index + 1} Month Subscription`, "Billed monthly."),
    );
    vi.mocked(searchMarket).mockResolvedValue(page(...many));

    const tiles = await readRepeatingShelf();

    expect(tiles).toHaveLength(30);
  });
});
