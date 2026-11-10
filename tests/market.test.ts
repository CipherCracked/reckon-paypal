import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MarketError,
  MARKET_EXIT_NOTE,
  cheapestInStock,
  isMarketSlug,
  marketProductId,
  marketSlug,
  marketTerms,
  offerSpread,
  readMarketProduct,
  searchMarket,
  type MarketOffer,
  type MarketProduct,
} from "@/lib/market/channel3";
import { computeCommitment } from "@/lib/commitment/compute";
import { money } from "@/lib/money";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function offer(overrides: Partial<MarketOffer> = {}): MarketOffer {
  return {
    domain: "shop.example",
    url: "https://shop.example/p/1",
    price: money(1999),
    compareAt: null,
    availability: "InStock",
    ...overrides,
  };
}

function product(id: string, overrides: Partial<MarketProduct> = {}): MarketProduct {
  return {
    id,
    title: `Product ${id}`,
    description: "A description.",
    brand: null,
    image: null,
    rating: null,
    offers: [offer()],
    ...overrides,
  };
}

/** The smallest thing `request` needs from a fetch response. */
function reply(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

/** The catalogue's own product shape, as the API sends it. */
function rawProduct(id: string, offers: unknown[]) {
  return {
    id,
    title: "A real product",
    description: "What the seller wrote.",
    brands: [{ name: "A brand" }],
    images: [
      { url: "https://images.example/other.jpg", alt_text: "another", is_main_image: false },
      { url: "https://images.example/main.jpg", alt_text: "the main one", is_main_image: true },
    ],
    ratings: { value: 4.5, count: 120 },
    offers,
  };
}

const rawOffer = (domain: string, price: number, availability = "InStock") => ({
  domain,
  url: `https://${domain}/p`,
  // The catalogue quotes dollars, as a decimal; the parser turns it into cents.
  price: { price, compare_at_price: null, currency: "USD" },
  availability,
});

beforeEach(() => {
  process.env.CHANNEL3_API_KEY = "test-key";
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.CHANNEL3_API_KEY;
});

/* ------------------------------------------------------------------ */
/* Slugs                                                               */
/* ------------------------------------------------------------------ */

describe("a real product's slug", () => {
  it("is recognisable and round-trips the catalogue id", () => {
    const slug = marketSlug("oUZqBOZ");
    expect(slug).toBe("ch3-oUZqBOZ");
    expect(isMarketSlug(slug)).toBe(true);
    expect(marketProductId(slug)).toBe("oUZqBOZ");
  });

  it("does not mistake a demo entry for a real product", () => {
    for (const slug of ["coffee-subscription", "noise-cancelling-headphones", "ch3-", "ch3-ab", "sub-ch3-abcd"]) {
      expect(isMarketSlug(slug)).toBe(false);
      expect(marketProductId(slug)).toBeNull();
    }
  });
});

/* ------------------------------------------------------------------ */
/* Choosing an offer                                                   */
/* ------------------------------------------------------------------ */

describe("the offer a purchase would use", () => {
  it("is the cheapest one the retailer says is in stock", () => {
    const cheapest = cheapestInStock([
      offer({ domain: "b.example", price: money(2999) }),
      offer({ domain: "a.example", price: money(1499) }),
      offer({ domain: "c.example", price: money(999), availability: "OutOfStock" }),
    ]);

    expect(cheapest?.domain).toBe("a.example");
    expect(cheapest?.price).toEqual(money(1499));
  });

  it("breaks a tie by domain so the same catalogue always yields the same price", () => {
    const cheapest = cheapestInStock([
      offer({ domain: "z.example", price: money(1000) }),
      offer({ domain: "m.example", price: money(1000) }),
    ]);

    expect(cheapest?.domain).toBe("m.example");
  });

  it("refuses a price in another currency rather than compare it to dollars", () => {
    // The parser already drops a non-USD offer; this pins the second guard, which
    // is what makes `cheapestInStock` safe for any caller holding its own offers.
    const cheapest = cheapestInStock([
      offer({ price: { currency: "EUR", minor: 500 } as unknown as MarketOffer["price"] }),
      offer({ domain: "us.example", price: money(2000) }),
    ]);

    expect(cheapest?.domain).toBe("us.example");
  });

  it("is nothing at all when no offer can be bought", () => {
    expect(cheapestInStock([])).toBeNull();
    expect(cheapestInStock([offer({ availability: "OutOfStock" })])).toBeNull();
  });
});

describe("the spread between retailers", () => {
  it("is the gap between the lowest and the highest in-stock price", () => {
    expect(
      offerSpread([
        offer({ price: money(1000) }),
        offer({ price: money(3250) }),
        offer({ price: money(9999), availability: "OutOfStock" }),
      ]),
    ).toEqual(money(2250));
  });

  it("is nothing when one retailer lists it, or they all agree", () => {
    expect(offerSpread([offer()])).toBeNull();
    expect(offerSpread([offer({ price: money(1000) }), offer({ price: money(1000) })])).toBeNull();
  });
});

describe("the terms a listed price supports", () => {
  it("is one charge of that price, with the rest stated as absent", () => {
    const terms = marketTerms(offer({ price: money(2499) }));

    expect(terms.shape).toBe("one_time");
    expect(terms.itemPrice).toEqual(money(2499));
    // `null`, not zero: the offer states neither part, and a retailer that says
    // nothing about shipping has not said shipping is free. That distinction is
    // what makes the totals on the product page read "At least".
    expect(terms.shipping).toBeNull();
    expect(terms.tax).toBeNull();
    // Not `unknown`: one payment ends the agreement, so there is nothing to
    // leave. Leaving this unknown put "Not stated" where the shop's own demo
    // product of the same shape showed $0.00, and left the third figure empty on
    // every real product the shop carries.
    expect(terms.exit).toEqual({ kind: "none" });
  });

  it("shows a paid-once listing as costing nothing to leave, and names what that is not", () => {
    const terms = marketTerms(offer({ price: money(2499) }));
    const translation = computeCommitment(terms);

    expect(translation.exit).toEqual(money(0));
    // The sentence answers the figure instead of apologising for it, and it does
    // not imply the retailer's return terms are known.
    expect(MARKET_EXIT_NOTE).toContain("nothing to cancel");
    expect(MARKET_EXIT_NOTE).toContain("does not state");
    expect(MARKET_EXIT_NOTE).not.toMatch(/Channel3|catalogue does not carry/);
  });
});

/* ------------------------------------------------------------------ */
/* Reading the catalogue                                              */
/* ------------------------------------------------------------------ */

describe("reading a product back", () => {
  it("keeps what the catalogue sent: title, brand, main image, rating, offers", async () => {
    vi.mocked(fetch).mockResolvedValue(
      reply(rawProduct("prd00001", [rawOffer("shop.example", 19.99), rawOffer("other.example", 24.99)])),
    );

    const read = await readMarketProduct(marketSlug("prd00001"));

    expect(read?.title).toBe("A real product");
    expect(read?.description).toBe("What the seller wrote.");
    expect(read?.brand).toBe("A brand");
    expect(read?.image).toEqual({ url: "https://images.example/main.jpg", alt: "the main one" });
    expect(read?.rating).toEqual({ value: 4.5, count: 120 });
    expect(read?.offers).toHaveLength(2);
    expect(read?.offers[0].price).toEqual(money(1999));
  });

  it("drops an offer whose price cannot be stated exactly", async () => {
    vi.mocked(fetch).mockResolvedValue(
      reply(
        rawProduct("prd00002", [
          { ...rawOffer("shop.example", 19.994), price: { price: "19.994", currency: "USD" } },
          rawOffer("other.example", 20),
        ]),
      ),
    );

    const read = await readMarketProduct(marketSlug("prd00002"));

    expect(read?.offers.map((o) => o.domain)).toEqual(["other.example"]);
  });

  it("drops an offer whose link is not https", async () => {
    vi.mocked(fetch).mockResolvedValue(
      reply(rawProduct("prd00003", [{ ...rawOffer("shop.example", 19.99), url: "http://shop.example/p" }])),
    );

    const read = await readMarketProduct(marketSlug("prd00003"));

    expect(read?.offers).toEqual([]);
  });

  it("answers null when the catalogue no longer lists the id", async () => {
    vi.mocked(fetch).mockResolvedValue(reply({ detail: "Not found" }, 404));

    await expect(readMarketProduct(marketSlug("prd00004"))).resolves.toBeNull();
  });

  it("answers null for a slug that names no product, without asking", async () => {
    await expect(readMarketProduct("coffee-subscription")).resolves.toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("fails loudly when the catalogue itself is down", async () => {
    vi.mocked(fetch).mockResolvedValue(reply({ detail: "boom" }, 500));

    await expect(readMarketProduct(marketSlug("prd00005"))).rejects.toBeInstanceOf(MarketError);
  });

  it("says so, rather than calling the catalogue, when no key is configured", async () => {
    delete process.env.CHANNEL3_API_KEY;

    await expect(readMarketProduct(marketSlug("prd00006"))).rejects.toThrow(/no product catalogue key/i);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("sends the key in a header, over the catalogue's own endpoint", async () => {
    vi.mocked(fetch).mockResolvedValue(reply(rawProduct("prd00007", [rawOffer("shop.example", 19.99)])));

    await readMarketProduct(marketSlug("prd00007"));

    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("https://api.trychannel3.com/v1/products/prd00007");
    expect((init?.headers as Record<string, string>)["x-api-key"]).toBe("test-key");
  });
});

describe("searching the catalogue", () => {
  it("keeps only products someone can actually buy", async () => {
    vi.mocked(fetch).mockResolvedValue(
      reply({
        products: [
          rawProduct("prd00010", [rawOffer("shop.example", 19.99)]),
          rawProduct("prd00011", [rawOffer("shop.example", 19.99, "OutOfStock")]),
          rawProduct("prd00012", []),
        ],
      }),
    );

    const found = await searchMarket("query-one");

    expect(found.map((p) => p.id)).toEqual(["prd00010"]);
  });

  it("remembers an answer rather than paying for it twice", async () => {
    vi.mocked(fetch).mockResolvedValue(
      reply({ products: [rawProduct("prd00013", [rawOffer("shop.example", 19.99)])] }),
    );

    await searchMarket("query-two");
    await searchMarket("query-two");

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("asks nothing when the query is empty, and nothing for whitespace", async () => {
    await expect(searchMarket("   ")).resolves.toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });
});
