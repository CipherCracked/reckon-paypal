import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Shop from "@/app/shop/page";
import {
  MarketError,
  browseMarket,
  lookupProduct,
  readCategories,
  readMarketProduct,
  searchMarket,
  type MarketCategory,
  type MarketPage,
  type MarketProduct,
} from "@/lib/market/channel3";
import { money } from "@/lib/money";

// `redirect` is how the shop answers a link it resolved; here it throws so the
// test can see where the shopper would have been sent.
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

// Only the catalogue reads are mocked. The price bands, the card and the
// sentences are the real code, so what is asserted here is what a shopper sees.
vi.mock("@/lib/market/channel3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/market/channel3")>();
  return {
    ...actual,
    searchMarket: vi.fn(),
    browseMarket: vi.fn(),
    readCategories: vi.fn(),
    lookupProduct: vi.fn(),
    readMarketProduct: vi.fn(),
  };
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

const two= (id: string): MarketProduct =>
  product(id, {
    offers: [
      { domain: "a.example", url: "https://a.example/p", price: money(1000), compareAt: null, availability: "InStock" },
      { domain: "b.example", url: "https://b.example/p", price: money(3250), compareAt: null, availability: "InStock" },
    ],
  });

const page = (products: MarketProduct[], nextToken: string | null = null): MarketPage => ({
  products,
  nextToken,
});

const roots: MarketCategory[] = [
  { slug: "electronics", title: "Electronics", hasChildren: true },
  { slug: "home-garden", title: "Home & Garden", hasChildren: true },
];

type Params = { q?: string; category?: string; price?: string; after?: string; link?: string };

const shop = (params: Params = {}) => Shop({ searchParams: Promise.resolve(params) });

beforeEach(() => {
  vi.mocked(searchMarket).mockReset().mockResolvedValue(page([]));
  vi.mocked(browseMarket).mockReset().mockResolvedValue(page([]));
  vi.mocked(readCategories).mockReset().mockResolvedValue(roots);
  vi.mocked(lookupProduct).mockReset();
  vi.mocked(readMarketProduct).mockReset();
});

afterEach(() => {
  delete process.env.CHANNEL3_API_KEY;
  delete process.env.APP_ORIGIN;
});

/* ------------------------------------------------------------------ */
/* The shelf                                                           */
/* ------------------------------------------------------------------ */

describe("the shop opens on the catalogue's own shelf (IPD 33)", () => {
  it("shows the categories as links, and searches for nothing on its own", async () => {
    render(await shop());

    expect(screen.getByRole("link", { name: "Electronics" })).toHaveAttribute(
      "href",
      "/shop?category=electronics",
    );
    expect(screen.getByRole("link", { name: "Home & Garden" })).toHaveAttribute(
      "href",
      "/shop?category=home-garden",
    );
    // The old page searched "headphones" for a shopper who had asked nothing.
    expect(searchMarket).not.toHaveBeenCalled();
    expect(browseMarket).not.toHaveBeenCalled();
  });

  it("is a navigation, named for a screen reader", async () => {
    render(await shop());

    expect(screen.getByRole("navigation", { name: /browse the catalogue/i })).toBeInTheDocument();
  });

  it("keeps the search, as the shortcut for a person who already knows", async () => {
    render(await shop());

    expect(screen.getByRole("searchbox", { name: /what are you looking for/i })).toBeInTheDocument();
  });

  it("drops the five suggestion links it used to carry", async () => {
    render(await shop());

    expect(screen.queryByRole("link", { name: "headphones" })).toBeNull();
  });

  it("offers the shelf of things that repeat from beside the departments", async () => {
    // IPD 42: one line under the shelf, not a second grid on the same screen.
    render(await shop());

    expect(screen.getByRole("link", { name: /charges more than once/i })).toHaveAttribute(
      "href",
      "/shop/subscriptions",
    );
  });

  it("says so rather than showing an empty shelf when the catalogue cannot answer", async () => {
    process.env.CHANNEL3_API_KEY = "test-key";
    vi.mocked(readCategories).mockRejectedValue(new MarketError("boom", 500));

    render(await shop());

    expect(screen.getByRole("status")).toHaveTextContent(/could not be reached/);
  });
});

/* ------------------------------------------------------------------ */
/* A category                                                          */
/* ------------------------------------------------------------------ */

describe("a category is browsed, thirty at a time (IPD 34)", () => {
  it("browses the category in the URL and names it on the page", async () => {
    vi.mocked(browseMarket).mockResolvedValue(page([product("prd00001")]));

    render(await shop({ category: "home-garden" }));

    expect(vi.mocked(browseMarket).mock.calls[0][0]).toBe("home-garden");
    expect(screen.getByRole("heading", { name: "Home & Garden" })).toBeInTheDocument();
    expect(screen.getByText("Product prd00001")).toBeInTheDocument();
  });

  it("offers the way back to the shelf instead of the whole shelf again", async () => {
    render(await shop({ category: "home-garden" }));

    expect(screen.getByRole("link", { name: /all categories/i })).toHaveAttribute("href", "/shop");
    expect(screen.queryByRole("navigation", { name: /browse the catalogue/i })).toBeNull();
  });

  it("carries the price band into the catalogue call", async () => {
    render(await shop({ category: "home-garden", price: "under-50" }));

    expect(vi.mocked(browseMarket).mock.calls[0][1]).toMatchObject({ price: "under-50" });
  });
});

/* ------------------------------------------------------------------ */
/* Price bands                                                         */
/* ------------------------------------------------------------------ */

describe("price is the one narrowing, as a row of links (IPD 34)", () => {
  it("offers four words and marks the one in force", async () => {
    render(await shop({ category: "home-garden", price: "under-50" }));

    expect(screen.getByRole("link", { name: "Any price" })).toHaveAttribute(
      "href",
      "/shop?category=home-garden",
    );
    expect(screen.getByRole("link", { name: "Under $50" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "$50–$200" })).toHaveAttribute(
      "href",
      "/shop?category=home-garden&price=50-200",
    );
  });

  it("narrows a search the same way, without losing the words", async () => {
    render(await shop({ q: "desk lamp", price: "over-200" }));

    expect(vi.mocked(searchMarket).mock.calls[0][1]).toMatchObject({ price: "over-200" });
    expect(screen.getByRole("link", { name: "Under $50" })).toHaveAttribute(
      "href",
      "/shop?q=desk+lamp&price=under-50",
    );
  });

  it("is not offered where there is nothing yet to narrow", async () => {
    render(await shop());

    expect(screen.queryByRole("navigation", { name: /price/i })).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* Paging                                                              */
/* ------------------------------------------------------------------ */

describe("paging says when it ends (IPD 34)", () => {
  it("offers the next thirty, keeping every choice in the link", async () => {
    vi.mocked(browseMarket).mockResolvedValue(page([product("prd00002")], "page-two"));

    render(await shop({ category: "home-garden", price: "under-50" }));

    expect(screen.getByRole("link", { name: /show 30 more/i })).toHaveAttribute(
      "href",
      "/shop?category=home-garden&price=under-50&after=page-two",
    );
  });

  it("passes the token back to the catalogue", async () => {
    render(await shop({ category: "home-garden", after: "page-two" }));

    expect(vi.mocked(browseMarket).mock.calls[0][1]).toMatchObject({ after: "page-two" });
  });

  it("offers no next page on the last one", async () => {
    vi.mocked(browseMarket).mockResolvedValue(page([product("prd00003")], null));

    render(await shop({ category: "home-garden" }));

    expect(screen.queryByRole("link", { name: /show 30 more/i })).toBeNull();
  });

  it("says where the catalogue stops rather than pretending it ended", async () => {
    // Browse refuses a sixth page: the shopper followed the link and the
    // catalogue said "no more", which is not the same as "nothing here".
    vi.mocked(browseMarket).mockRejectedValue(new MarketError("too deep", 422));

    render(await shop({ category: "home-garden", after: "too-far" }));

    expect(screen.getByRole("status")).toHaveTextContent(/at most 150/);
  });
});

/* ------------------------------------------------------------------ */
/* The grid                                                            */
/* ------------------------------------------------------------------ */

describe("a card describes the thing (IPD 35)", () => {
  it("shows a brand, a title, the cheapest price and whose it is", async () => {
    vi.mocked(searchMarket).mockResolvedValue(page([product("prd00010")]));

    render(await shop({ q: "lamp" }));

    expect(screen.getByText("A brand")).toBeInTheDocument();
    expect(screen.getByText("Product prd00010")).toBeInTheDocument();
    expect(screen.getByText("From $19.99 at shop.example")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Product prd00010/ })).toHaveAttribute(
      "href",
      "/product/ch3-prd00010",
    );
  });

  it("says how many retailers only when there is more than one", async () => {
    vi.mocked(searchMarket).mockResolvedValue(page([two("prd00011"), product("prd00012")]));

    render(await shop({ q: "lamp" }));

    expect(screen.getByText("2 retailers")).toBeInTheDocument();
    expect(screen.queryByText("1 retailer")).toBeNull();
    // The spread and the retailer count are the product page's job now.
    expect(screen.queryByText(/\$22\.50 apart/)).toBeNull();
  });

  it("shows none of the three commitment figures", async () => {
    vi.mocked(searchMarket).mockResolvedValue(page([product("prd00013")]));

    render(await shop({ q: "lamp" }));

    expect(screen.queryByText(/cost to leave/i)).toBeNull();
    expect(screen.queryByText(/charged today/i)).toBeNull();
  });
});

/* ------------------------------------------------------------------ */
/* What the page says about its own answer                             */
/* ------------------------------------------------------------------ */

describe("the page names its answer, not its machinery", () => {
  it("says when the results do not use the shopper's words", async () => {
    vi.mocked(searchMarket).mockResolvedValue(
      page([product("prd00020", { title: "Z Shape Bracket", brand: null })]),
    );

    render(await shop({ q: "coffee machine" }));

    expect(screen.getByRole("status")).toHaveTextContent(
      "Nothing here uses “coffee machine”. These are the closest listings the catalogue has.",
    );
  });

  it("counts the results that do use them", async () => {
    vi.mocked(searchMarket).mockResolvedValue(
      page([product("prd00021", { title: "Desk Lamp" }), product("prd00022", { title: "Z Shape Bracket" })]),
    );

    render(await shop({ q: "lamp" }));

    expect(screen.getByRole("status")).toHaveTextContent(/1 of the 2 results for “lamp” use your words/);
  });

  it("says nothing came back with a price it can state", async () => {
    vi.mocked(searchMarket).mockResolvedValue(page([]));

    render(await shop({ q: "a thing that does not exist" }));

    expect(screen.getByRole("status")).toHaveTextContent(
      "Nothing for “a thing that does not exist” with a price someone can pay.",
    );
  });

  it("offers the way out of an empty price band", async () => {
    render(await shop({ category: "home-garden", price: "under-50" }));

    expect(screen.getByRole("status")).toHaveTextContent(
      "Nothing in Home & Garden under $50 has a price someone can pay.",
    );
    // The way out is the same control that widened it: "Any price", one click.
    expect(screen.getByRole("link", { name: "Any price" })).toHaveAttribute(
      "href",
      "/shop?category=home-garden",
    );
  });

  it("carries one sourcing line and no vendor name", async () => {
    vi.mocked(searchMarket).mockResolvedValue(page([product("prd00023")]));

    render(await shop({ q: "lamp" }));

    expect(
      screen.getByText(
        "Prices, photos and retailer links are the retailers' own, read live when this page opened.",
      ),
    ).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/channel3/i);
  });

  it("names a missing key as the reason there is nothing live to show", async () => {
    vi.mocked(readCategories).mockRejectedValue(new MarketError("No product catalogue key is configured."));

    render(await shop());

    expect(screen.getByRole("status")).toHaveTextContent(/no product catalogue key/i);
  });
});

/* ------------------------------------------------------------------ */
/* What the page puts first                                            */
/* ------------------------------------------------------------------ */

/*
 * The shop's own subject is the catalogue. A phone screenshot of a browsed
 * category showed the first screen holding a heading, a paragraph, two forms and
 * two buttons and not one product — which is the "amateur" shape this rebuild
 * exists to end (IPD 33: categories navigate, search is the shortcut beneath;
 * IPD 35: one sourcing line). These three assertions are the composition, not
 * the styling.
 */
describe("a browsed category opens on its products", () => {
  it("does not repeat the shop's own paragraph above them", async () => {
    vi.mocked(browseMarket).mockResolvedValue(page([product("prd00030")]));

    render(await shop({ category: "home-garden" }));

    // The h1 still says what page this is; a paragraph explaining the shop again
    // is what pushed the products off the first screen.
    expect(document.querySelector(".lede")).toBeNull();
  });

  it("puts the results above the field for a link someone sent", async () => {
    vi.mocked(browseMarket).mockResolvedValue(page([product("prd00031")]));

    render(await shop({ category: "home-garden" }));

    const results = screen.getByRole("heading", { name: "Home & Garden" });
    const field = screen.getByLabelText(/paste the product page/i);

    // A person browsing a department is not pasting a link; the field is the
    // secondary thing and belongs under the catalogue (IPD 36).
    expect(results.compareDocumentPosition(field) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("still offers the field on the shelf, under the search", async () => {
    render(await shop());

    const search = screen.getByRole("searchbox", { name: /what are you looking for/i });
    const field = screen.getByLabelText(/paste the product page/i);

    expect(search.compareDocumentPosition(field) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

describe("the page states the prices are live once", () => {
  it("does not say it twice on one screen", async () => {
    vi.mocked(browseMarket).mockResolvedValue(page([product("prd00032")]));

    render(await shop({ category: "home-garden" }));

    // The standing line at the foot owns this claim (IPD 35). Saying it in the
    // lede as well is the repetition that decision removed.
    const said = document.body.textContent?.match(/when this page opened/gi) ?? [];
    expect(said).toHaveLength(1);
  });
});

/* ------------------------------------------------------------------ */
/* A link someone sent                                                 */
/* ------------------------------------------------------------------ */

describe("a pasted link opens the product it names (IPD 36, ITD 32)", () => {
  const address = "https://shop.example/products/thing";

  it("reads the product back by id before it sends anyone to it", async () => {
    vi.mocked(lookupProduct).mockResolvedValue({ outcome: "found", product: product("prd9") });
    vi.mocked(readMarketProduct).mockResolvedValue(product("prd9"));

    await expect(shop({ link: address })).rejects.toThrow("REDIRECT:/product/ch3-prd9");
    expect(readMarketProduct).toHaveBeenCalledWith("ch3-prd9");
  });

  it("says so when the link resolved but this app cannot open the product", async () => {
    vi.mocked(lookupProduct).mockResolvedValue({ outcome: "found", product: product("prd9") });
    vi.mocked(readMarketProduct).mockResolvedValue(null);

    render(await shop({ link: address }));

    expect(screen.getByRole("status")).toHaveTextContent(/cannot open/);
    expect(screen.getByLabelText(/paste the product page/i)).toHaveValue(address);
  });

  it("says the address is not a product page", async () => {
    vi.mocked(lookupProduct).mockResolvedValue({ outcome: "not-a-product" });

    render(await shop({ link: address }));

    expect(screen.getByRole("status")).toHaveTextContent(/not a product page/);
  });

  it("says the catalogue has no product at that address", async () => {
    vi.mocked(lookupProduct).mockResolvedValue({ outcome: "not-found" });

    render(await shop({ link: address }));

    expect(screen.getByRole("status")).toHaveTextContent(/may be gone/);
  });

  it("says the catalogue did not answer, rather than that the link is bad", async () => {
    vi.mocked(lookupProduct).mockRejectedValue(new MarketError("timeout"));

    render(await shop({ link: address }));

    expect(screen.getByRole("status")).toHaveTextContent(/did not answer/);
  });

  it("keeps the field filled so the address can be corrected", async () => {
    vi.mocked(lookupProduct).mockResolvedValue({ outcome: "not-found" });

    render(await shop({ link: address }));

    expect(screen.getByLabelText(/paste the product page/i)).toHaveValue(address);
  });

  it("refuses this app's own address without asking the catalogue", async () => {
    process.env.APP_ORIGIN = "https://app.example";

    render(await shop({ link: "https://app.example/product/ch3-prd9" }));

    expect(lookupProduct).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent(/not a product page/);
  });

  it("refuses an address that is not https without asking the catalogue", async () => {
    render(await shop({ link: "http://shop.example/products/thing" }));

    expect(lookupProduct).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent(/not a product page/);
  });
});
