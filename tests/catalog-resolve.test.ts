import { beforeEach, describe, expect, it, vi } from "vitest";
import { readProductCardFromPayPal, readProductFromPayPal } from "@/lib/paypal/catalog";
import { resolveCatalogue, resolveProduct, resolveProductCard } from "@/lib/catalog/resolve";
import { readMarketProduct, type MarketProduct } from "@/lib/market/channel3";
import { money } from "@/lib/money";
import { recordedProduct } from "./fixtures/channel3-listings";

vi.mock("@/lib/paypal/catalog", () => ({
  readProductCardFromPayPal: vi.fn(),
  readProductFromPayPal: vi.fn(),
}));

vi.mock("@/lib/market/channel3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/market/channel3")>();
  return { ...actual, readMarketProduct: vi.fn() };
});

const card = {
  slug: "noise-cancelling-headphones",
  paypalProductId: "PROD-1",
  name: "Headphones Club",
  description: "Shipped from Leeds.",
};

const terms = {
  shape: "one_time" as const,
  itemPrice: money(4999),
  shipping: money(0),
  tax: money(0),
  exit: { kind: "none" as const },
};

function oneTimeListing(id: string): MarketProduct {
  return {
    id,
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
  };
}

beforeEach(() => {
  vi.mocked(readProductCardFromPayPal).mockReset();
  vi.mocked(readProductFromPayPal).mockReset();
  vi.mocked(readMarketProduct).mockReset();
  vi.mocked(readProductCardFromPayPal).mockResolvedValue(null);
  vi.mocked(readProductFromPayPal).mockResolvedValue(null);
});

describe("reading a listing from PayPal (IPD 20)", () => {
  it("names PayPal's catalogue when the card was read, not the file", async () => {
    vi.mocked(readProductCardFromPayPal).mockResolvedValue(card);

    await expect(resolveProductCard("noise-cancelling-headphones")).resolves.toEqual({
      slug: "noise-cancelling-headphones",
      name: "Headphones Club",
      description: "Shipped from Leeds.",
      sources: { paypal: "PayPal's catalogue", published: null },
    });
  });

  it("falls back to the file, and says so, when PayPal is unreachable", async () => {
    vi.mocked(readProductCardFromPayPal).mockRejectedValue(
      new Error("PayPal credentials are not configured."),
    );

    const resolved = await resolveProductCard("noise-cancelling-headphones");

    expect(resolved?.name).toBe("Noise-Cancelling Headphones");
    expect(resolved?.sources).toEqual({
      paypal: null,
      published: "the terms shown on this page",
    });
  });

  it("still refuses a slug the file does not have", async () => {
    await expect(resolveProductCard("not-a-product")).resolves.toBeNull();
  });
});

describe("reading a commitment from PayPal", () => {
  it("takes the plan's terms and names the plan, not the catalogue", async () => {
    vi.mocked(readProductFromPayPal).mockResolvedValue({
      ...card,
      terms,
      planLabel: "the PayPal plan for Headphones Club",
    });

    const resolved = await resolveProduct("noise-cancelling-headphones");

    expect(resolved?.terms).toEqual(terms);
    expect(resolved?.sources).toEqual({
      paypal: "the PayPal plan for Headphones Club",
      published: null,
    });
    expect(resolved?.descriptionLabel).toBe("the description published with the PayPal product");
    expect(resolved?.listed).toBeUndefined();
  });

  it("falls back to the file's terms and labels this page's description", async () => {
    const resolved = await resolveProduct("noise-cancelling-headphones");

    expect(resolved?.terms.itemPrice).toEqual(money(4799));
    expect(resolved?.sources.published).toBe("the terms shown on this page");
    expect(resolved?.descriptionLabel).toBe("the description shown on this page");
  });
});

describe("reading a real listing", () => {
  it("turns a curated subscription into a recurring commitment at the live price", async () => {
    vi.mocked(readMarketProduct).mockResolvedValue(recordedProduct("YyLUjLT"));

    const resolved = await resolveProduct("ch3-YyLUjLT");

    expect(resolved?.listed).toBe(true);
    expect(resolved?.terms.shape).toBe("recurring");
    expect(resolved?.terms.itemPrice).toEqual(money(2499));
    expect(resolved?.terms.recurrence).toEqual({ count: 6, period: "month" });
    expect(resolved?.terms.exit).toEqual({ kind: "unknown" });
    expect(resolved?.sources.published).toContain("the price Channel3 lists at bark.co");
    expect(resolved?.sources.published).toContain("6 month BarkBox plan");
  });

  it("keeps a listing the map does not curate as a one-time purchase", async () => {
    vi.mocked(readMarketProduct).mockResolvedValue(oneTimeListing("prd00050"));

    const resolved = await resolveProduct("ch3-prd00050");

    expect(resolved?.terms.shape).toBe("one_time");
    expect(resolved?.terms.itemPrice).toEqual(money(1999));
    expect(resolved?.sources.published).toBe("the price Channel3 lists at shop.example");
  });

  it("answers nothing when the catalogue no longer lists the product", async () => {
    vi.mocked(readMarketProduct).mockResolvedValue(null);

    await expect(resolveProduct("ch3-YyLUjLT")).resolves.toBeNull();
  });

  it("answers nothing when a curated listing no longer states the quoted term", async () => {
    const listing = recordedProduct("YyLUjLT");
    vi.mocked(readMarketProduct).mockResolvedValue({
      ...listing,
      description: "A box for dogs. No plan length is stated here.",
    });

    await expect(resolveProduct("ch3-YyLUjLT")).resolves.toBeNull();
  });

  it("answers nothing when the listing has no offer anyone can buy", async () => {
    const listing = recordedProduct("YyLUjLT");
    vi.mocked(readMarketProduct).mockResolvedValue({
      ...listing,
      offers: [{ ...listing.offers[0], availability: "OutOfStock" }],
    });

    await expect(resolveProduct("ch3-YyLUjLT")).resolves.toBeNull();
  });
});

describe("listing the whole catalogue", () => {
  it("resolves each card on its own, so one PayPal answer does not relabel the rest", async () => {
    vi.mocked(readProductCardFromPayPal).mockImplementation(async (slug) =>
      slug === "noise-cancelling-headphones" ? card : null,
    );

    const catalogue = await resolveCatalogue();

    expect(catalogue).toHaveLength(1);
    expect(catalogue[0].sources.paypal).toBe("PayPal's catalogue");
  });
});
