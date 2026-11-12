import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { money } from "@/lib/money";

/*
 * The catalogue module remembers what it has read — that is the behaviour the
 * shop depends on — so each test loads its own copy, and no test can pass on
 * another one's cache. `market` is that copy.
 */
let market: typeof import("@/lib/market/channel3");

beforeEach(async () => {
  process.env.CHANNEL3_API_KEY = "test-key";
  vi.stubGlobal("fetch", vi.fn());
  vi.resetModules();
  market = await import("@/lib/market/channel3");
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.CHANNEL3_API_KEY;
});

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function reply(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

const rawOffer = (domain: string, price: number, availability = "InStock") => ({
  domain,
  url: `https://${domain}/p`,
  price: { price, compare_at_price: null, currency: "USD" },
  availability,
});

function rawProduct(id: string, offers: unknown[] = [rawOffer(`${id}.example`, 19.99)], extra: object = {}) {
  return {
    id,
    title: `A real product ${id}`,
    description: "What the seller wrote.",
    brands: [{ name: "A brand" }],
    images: [{ url: `https://images.example/${id}.jpg`, alt_text: "the main one", is_main_image: true }],
    ratings: null,
    offers,
    ...extra,
  };
}

const category = (slug: string, title: string, hasChildren = true) => ({
  slug,
  title,
  path: [{ slug, title }],
  has_children: hasChildren,
});

/** The JSON body a call sent, parsed. */
function sentBody(call = 0): Record<string, unknown> {
  const [, init] = vi.mocked(fetch).mock.calls[call];
  return JSON.parse(String(init?.body));
}

/* ------------------------------------------------------------------ */
/* The price boundary                                                  */
/* ------------------------------------------------------------------ */

describe("a price crossing into the catalogue's units", () => {
  it("turns whole cents into the dollars the catalogue filters on", () => {
    expect(market.cataloguePrice(money(4999))).toBe(49.99);
    expect(market.cataloguePrice(money(5000))).toBe(50);
    expect(market.cataloguePrice(money(20001))).toBe(200.01);
  });
});

describe("the price bands a shopper can choose", () => {
  it("are the four the shop shows, in order", () => {
    expect(market.PRICE_BANDS.map((band) => band.key)).toEqual([
      "any",
      "under-50",
      "50-200",
      "over-200",
    ]);
    expect(market.PRICE_BANDS.map((band) => band.label)).toEqual([
      "Any price",
      "Under $50",
      "$50–$200",
      "Over $200",
    ]);
  });

  it("leave $50.00 out of 'under $50' and put it in '$50–$200'", () => {
    // The off-by-one-cent that would be invisible until a product priced at
    // exactly fifty dollars landed on the wrong page.
    expect(market.priceBand("under-50").max).toEqual(money(4999));
    expect(market.priceBand("50-200").min).toEqual(money(5000));
    expect(market.priceBand("50-200").max).toEqual(money(20000));
    expect(market.priceBand("over-200").min).toEqual(money(20001));
  });

  it("is open at both ends for 'any', and for anything the URL invents", () => {
    expect(market.priceBand("any")).toMatchObject({ min: null, max: null });
    expect(market.priceBand(undefined)).toMatchObject({ key: "any", min: null, max: null });
    expect(market.priceBand("cheap")).toMatchObject({ key: "any", min: null, max: null });
  });
});

/* ------------------------------------------------------------------ */
/* Categories                                                          */
/* ------------------------------------------------------------------ */

describe("reading the catalogue's categories", () => {
  it("keeps the slug a link carries, the name a shopper reads, and whether it has children", async () => {
    vi.mocked(fetch).mockResolvedValue(
      reply({
        items: [category("electronics", "Electronics"), category("media", "Media", false)],
        page: 1,
        page_size: 20,
        total: 2,
      }),
    );

    const roots = await market.readCategories();

    expect(roots).toEqual([
      { slug: "electronics", title: "Electronics", hasChildren: true },
      { slug: "media", title: "Media", hasChildren: false },
    ]);
  });

  it("orders them by name, so the shelf is the same shelf on every visit", async () => {
    vi.mocked(fetch).mockResolvedValue(
      reply({
        items: [
          category("toys-games", "Toys & Games"),
          category("apparel-accessories", "Apparel & Accessories"),
          category("electronics", "Electronics"),
        ],
      }),
    );

    const roots = await market.readCategories();

    expect(roots.map((root) => root.title)).toEqual([
      "Apparel & Accessories",
      "Electronics",
      "Toys & Games",
    ]);
  });

  it("drops an entry the catalogue did not name", async () => {
    vi.mocked(fetch).mockResolvedValue(
      reply({ items: [{ slug: "mystery" }, { slug: "media", title: "Media" }] }),
    );

    const roots = await market.readCategories();

    expect(roots.map((root) => root.slug)).toEqual(["media"]);
  });

  it("remembers the taxonomy rather than paying for it on every page", async () => {
    vi.mocked(fetch).mockResolvedValue(reply({ items: [category("cached-cat", "Cached")] }));

    await market.readCategories();
    await market.readCategories();

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("says so when the catalogue answers with a failure", async () => {
    vi.mocked(fetch).mockResolvedValue(reply({ detail: "boom" }, 503));

    await expect(market.readCategories()).rejects.toMatchObject({ name: "MarketError", status: 503 });
  });
});

/* ------------------------------------------------------------------ */
/* Browsing a category                                                 */
/* ------------------------------------------------------------------ */

describe("browsing a category", () => {
  it("asks the catalogue for that category's products, thirty at a time", async () => {
    vi.mocked(fetch).mockResolvedValue(reply({ products: [rawProduct("prd01001")], next_page_token: null }));

    const page = await market.browseMarket("home-garden");

    expect(vi.mocked(fetch).mock.calls[0][0]).toBe("https://api.trychannel3.com/v1/browse");
    expect(sentBody()).toEqual({ filters: { category_ids: ["home-garden"] }, limit: 30 });
    expect(page.products.map((product) => product.id)).toEqual(["prd01001"]);
    expect(page.nextToken).toBeNull();
  });

  it("passes the next page's token back out, untouched", async () => {
    vi.mocked(fetch).mockResolvedValue(
      reply({ products: [rawProduct("prd01002")], next_page_token: "b3BhcXVl+/=token" }),
    );

    const page = await market.browseMarket("toys-games");

    expect(page.nextToken).toBe("b3BhcXVl+/=token");
  });

  it("sends the token it was given, and the narrowings still in force", async () => {
    vi.mocked(fetch).mockResolvedValue(reply({ products: [], next_page_token: null }));

    await market.browseMarket("pet-supplies", { price: "under-50", after: "b3BhcXVl+/=token" });

    expect(sentBody()).toEqual({
      filters: { category_ids: ["pet-supplies"], price: { max_price: 49.99 } },
      limit: 30,
      page_token: "b3BhcXVl+/=token",
    });
  });

  it("states both ends of a band that has both", async () => {
    vi.mocked(fetch).mockResolvedValue(reply({ products: [], next_page_token: null }));

    await market.browseMarket("furniture", { price: "50-200" });

    expect(sentBody().filters).toEqual({
      category_ids: ["furniture"],
      price: { min_price: 50, max_price: 200 },
    });
  });

  it("asks for no price at all when the shopper chose 'any price'", async () => {
    vi.mocked(fetch).mockResolvedValue(reply({ products: [], next_page_token: null }));

    await market.browseMarket("cameras-optics", { price: "any" });

    expect(sentBody().filters).toEqual({ category_ids: ["cameras-optics"] });
  });

  it("keeps only products someone can actually buy, as search does", async () => {
    vi.mocked(fetch).mockResolvedValue(
      reply({
        products: [
          rawProduct("prd01003"),
          rawProduct("prd01004", [rawOffer("shop.example", 19.99, "OutOfStock")]),
          rawProduct("prd01005", []),
        ],
        next_page_token: null,
      }),
    );

    const page = await market.browseMarket("luggage-bags");

    expect(page.products.map((product) => product.id)).toEqual(["prd01003"]);
  });

  it("remembers a page rather than paying for it twice, and keeps pages apart", async () => {
    vi.mocked(fetch).mockResolvedValue(reply({ products: [rawProduct("prd01006")], next_page_token: null }));

    await market.browseMarket("sporting-goods", { price: "over-200" });
    await market.browseMarket("sporting-goods", { price: "over-200" });
    expect(fetch).toHaveBeenCalledTimes(1);

    await market.browseMarket("sporting-goods", { price: "under-50" });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("asks nothing when there is no category to browse", async () => {
    await expect(market.browseMarket("  ")).resolves.toEqual({ products: [], nextToken: null });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("reports the catalogue's own refusal when a token runs past its paging window", async () => {
    // Browse stops at five pages and answers 422 for a sixth; the shop turns
    // that status into a sentence rather than an empty shelf.
    vi.mocked(fetch).mockResolvedValue(reply({ detail: "page token expired" }, 422));

    await expect(market.browseMarket("electronics", { after: "stale-token" })).rejects.toMatchObject({
      name: "MarketError",
      status: 422,
    });
  });

  it("says so when no key is configured, without calling the catalogue", async () => {
    delete process.env.CHANNEL3_API_KEY;

    await expect(market.browseMarket("hardware")).rejects.toThrow(/no product catalogue key/i);
    expect(fetch).not.toHaveBeenCalled();
  });
});

/* ------------------------------------------------------------------ */
/* Searching                                                           */
/* ------------------------------------------------------------------ */

describe("searching, now with a page behind it", () => {
  it("returns the products and the token for the next page", async () => {
    vi.mocked(fetch).mockResolvedValue(
      reply({ products: [rawProduct("prd02001")], next_page_token: "next-token" }),
    );

    const page = await market.searchMarket("query-paged");

    expect(page.products.map((product) => product.id)).toEqual(["prd02001"]);
    expect(page.nextToken).toBe("next-token");
    expect(sentBody()).toEqual({ query: "query-paged", limit: 30 });
  });

  it("carries the price band into the search too", async () => {
    vi.mocked(fetch).mockResolvedValue(reply({ products: [], next_page_token: null }));

    await market.searchMarket("desk lamp", { price: "50-200" });

    expect(sentBody()).toEqual({
      query: "desk lamp",
      limit: 30,
      filters: { price: { min_price: 50, max_price: 200 } },
    });
  });

  it("answers an empty page for a blank query, without asking", async () => {
    await expect(market.searchMarket("   ")).resolves.toEqual({ products: [], nextToken: null });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("still drops a product nobody can buy", async () => {
    vi.mocked(fetch).mockResolvedValue(
      reply({
        products: [rawProduct("prd02002", []), rawProduct("prd02003")],
        next_page_token: null,
      }),
    );

    const page = await market.searchMarket("query-buyable");

    expect(page.products.map((product) => product.id)).toEqual(["prd02003"]);
  });
});

/* ------------------------------------------------------------------ */
/* Looking a pasted link up                                            */
/* ------------------------------------------------------------------ */

describe("looking up a product URL", () => {
  it("answers with the product when the catalogue recognises the page", async () => {
    vi.mocked(fetch).mockResolvedValue(reply({ product: rawProduct("prd03001") }));

    const found = await market.lookupProduct("https://shop.example/products/thing");

    expect(found).toMatchObject({ outcome: "found" });
    expect(found.outcome === "found" && found.product.id).toBe("prd03001");
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe("https://api.trychannel3.com/v1/lookup");
    expect(sentBody()).toEqual({ url: "https://shop.example/products/thing" });
  });

  it("names a URL that is a page but not a product, rather than failing", async () => {
    vi.mocked(fetch).mockResolvedValue(reply({ detail: "Not a product page" }, 422));

    await expect(market.lookupProduct("https://shop.example/collections/all")).resolves.toEqual({
      outcome: "not-a-product",
    });
  });

  it("names a product page the catalogue has never seen, rather than failing", async () => {
    vi.mocked(fetch).mockResolvedValue(reply({ detail: "Not found" }, 404));

    await expect(market.lookupProduct("https://unknown.example/products/ghost")).resolves.toEqual({
      outcome: "not-found",
    });
  });

  it("throws when the catalogue itself could not answer", async () => {
    vi.mocked(fetch).mockResolvedValue(reply({ detail: "boom" }, 500));

    await expect(
      market.lookupProduct("https://shop.example/products/boom"),
    ).rejects.toBeInstanceOf(market.MarketError);
  });

  it("refuses an address that is not an https link, without asking the catalogue", async () => {
    await expect(market.lookupProduct("http://shop.example/products/thing")).resolves.toEqual({
      outcome: "not-a-product",
    });
    await expect(market.lookupProduct("not a url at all")).resolves.toEqual({
      outcome: "not-a-product",
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("refuses an address too long to be a product page", async () => {
    const long = `https://shop.example/products/${"a".repeat(2100)}`;

    await expect(market.lookupProduct(long)).resolves.toEqual({ outcome: "not-a-product" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("treats an answer it cannot read as a URL it cannot open", async () => {
    vi.mocked(fetch).mockResolvedValue(reply({ product: { title: "no id here" } }));

    await expect(market.lookupProduct("https://shop.example/products/unreadable")).resolves.toEqual({
      outcome: "not-found",
    });
  });

  it("remembers a link someone pasted twice", async () => {
    vi.mocked(fetch).mockResolvedValue(reply({ product: rawProduct("prd03002") }));

    await market.lookupProduct("https://shop.example/products/twice");
    await market.lookupProduct("https://shop.example/products/twice");

    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("waits longer than a page read for a shop the catalogue has never met", async () => {
    // Measured 2026-11-12: a product URL the catalogue had not seen took 3.4s,
    // and one that turned out not to be a product page took over nine. An
    // eight-second detail deadline reported a slow answer as no answer.
    vi.useFakeTimers();
    try {
      vi.mocked(fetch).mockImplementation((_url, init) => {
        // A real fetch rejects when its signal aborts; this one does too, which
        // is what makes the deadline observable.
        return new Promise((resolve, reject) => {
          const timer = setTimeout(() => resolve(reply({ product: rawProduct("prd03003") })), 12_000);
          init?.signal?.addEventListener("abort", () => {
            clearTimeout(timer);
            reject(new Error("aborted"));
          });
        });
      });

      const pending = market.lookupProduct("https://shop.example/products/slow");
      await vi.advanceTimersByTimeAsync(12_000);

      await expect(pending).resolves.toMatchObject({ outcome: "found" });
    } finally {
      vi.useRealTimers();
    }
  });
});

/* ------------------------------------------------------------------ */
/* The image a tile shows                                              */
/* ------------------------------------------------------------------ */

describe("the image a card gets", () => {
  it("prefers the cut-out the catalogue made for grids", async () => {
    vi.mocked(fetch).mockResolvedValue(
      reply({
        products: [
          rawProduct("prd04001", undefined, {
            images: [
              {
                url: "https://images.example/raw.jpg",
                cleaned_url: "https://images.example/cleaned.jpg",
                alt_text: "a cleaning",
                is_main_image: true,
              },
            ],
          }),
        ],
        next_page_token: null,
      }),
    );

    const page = await market.browseMarket("office-supplies");

    expect(page.products[0].image?.url).toBe("https://images.example/cleaned.jpg");
  });

  it("falls back to the catalogue's own picture when there is no cut-out", async () => {
    vi.mocked(fetch).mockResolvedValue(
      reply({
        products: [
          rawProduct("prd04002", undefined, {
            images: [{ url: "https://images.example/plain.jpg", alt_text: "plain", is_main_image: true }],
          }),
        ],
        next_page_token: null,
      }),
    );

    const page = await market.browseMarket("vehicles-parts");

    expect(page.products[0].image?.url).toBe("https://images.example/plain.jpg");
  });
});
