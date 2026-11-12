import type { CommitmentTerms } from "@/lib/commitment/types";
import { DETAIL_READ_DEADLINE_MS, LOOKUP_DEADLINE_MS, withinDeadline } from "@/lib/deadline";
import { fromDecimalString, money, type Money } from "@/lib/money";

/**
 * The live product catalogue.
 *
 * Everything the shop shows about a real product comes from here: a category
 * shelf, a page of a category, a search, one product read back by id, or a
 * product URL looked up. Nothing in this file invents a field — a product with
 * no price, no in-stock offer or no image is returned as such, and the screen
 * says what is missing rather than filling it in.
 *
 * The key is read from the server environment and never travels to the browser:
 * every caller of this module is a server component or a route handler.
 */

const API = "https://api.trychannel3.com";
/** The catalogue's own ceiling for one page of search or browse results. */
const PAGE_LIMIT = 30;
const CACHE_MS = 5 * 60_000;
/** A taxonomy does not change between two page loads the way a price does. */
const CATEGORY_CACHE_MS = 60 * 60_000;
const CACHE_MAX = 48;

export type MarketOffer = {
  /** The retailer's domain, as the catalogue names it. */
  domain: string;
  /** Where that retailer lists the product. */
  url: string;
  price: Money;
  /** The retailer's own "was" price, only when it is higher than `price`. */
  compareAt: Money | null;
  availability: string;
};

export type MarketProduct = {
  id: string;
  title: string;
  description: string;
  brand: string | null;
  image: { url: string; alt: string } | null;
  rating: { value: number; count: number } | null;
  offers: MarketOffer[];
};

/** One page of the catalogue, as search and browse both answer. */
export type MarketPage = {
  products: MarketProduct[];
  /**
   * The catalogue's own token for the next page, passed back untouched. Its
   * format is not ours to understand; it is opaque and it belongs in the URL.
   */
  nextToken: string | null;
};

/** A top-level category: the word a shopper clicks and the slug the link carries. */
export type MarketCategory = {
  slug: string;
  title: string;
  hasChildren: boolean;
};

/** What the shop's URL says about a page of results. */
export type MarketPageQuery = {
  /** A price band key as it appears in the URL; an unknown one means "any". */
  price?: string | null;
  /** The opaque `next_page_token` from the page the shopper was on. */
  after?: string | null;
};

/**
 * What came of a pasted link. Three outcomes, because the shop says three
 * different things: the address is not a product page, the catalogue has never
 * seen it, or here is the product. Anything worse than that — silence, a
 * timeout, a 500 — is the catalogue failing, and throws.
 */
export type MarketLookup =
  | { outcome: "found"; product: MarketProduct }
  | { outcome: "not-a-product" }
  | { outcome: "not-found" };

/** Thrown when the catalogue cannot answer, so a caller can tell silence from failure. */
export class MarketError extends Error {
  /** The HTTP status the catalogue returned, when the failure was an answer. */
  readonly status: number | null;

  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = "MarketError";
    this.status = status;
  }
}

const SLUG = /^ch3-([A-Za-z0-9]{4,16})$/;

/** True when a slug names a real product rather than one of the demo entries. */
export function isMarketSlug(slug: string): boolean {
  return SLUG.test(slug);
}

export function marketSlug(productId: string): string {
  return `ch3-${productId}`;
}

export function marketProductId(slug: string): string | null {
  const match = SLUG.exec(slug);
  return match ? match[1] : null;
}

/**
 * What a listing can say about leaving.
 *
 * It said "Channel3 does not carry cancellation or return terms for this
 * listing", which is true and useless: it explains the data vendor to a shopper
 * and leaves the third figure empty on every real product in the shop. The
 * figure is not actually unknown. A listing offers one payment, so once it is
 * paid there is no continuing agreement to leave — that follows from the shape
 * of the purchase, not from a seller's copy, and the demo product of the same
 * shape has always shown it. What the retailer charges to *return* the item is a
 * different question, and this sentence does not pretend to answer it.
 */
export const MARKET_EXIT_NOTE =
  "Paid once, so there is nothing to cancel. A return is a different question, and this listing does not state its terms.";

/**
 * The offer a purchase would use: the cheapest one the retailer says is in
 * stock. Out-of-stock and non-USD offers are not candidates — quoting one would
 * put a price on the screen that cannot be bought.
 */
export function cheapestInStock(offers: MarketOffer[]): MarketOffer | null {
  const usable = offers
    .filter((offer) => offer.availability === "InStock" && offer.price.currency === "USD")
    .sort((a, b) => a.price.minor - b.price.minor || a.domain.localeCompare(b.domain));

  return usable[0] ?? null;
}

/**
 * The terms a listed price supports: one charge of that price, and nothing else
 * the catalogue can vouch for. Shipping and tax are `null` — not zero — because
 * the offer states neither, and a retailer that says nothing about shipping has
 * not said shipping is free. The totals built over these terms are therefore
 * floors, and the screen prints them as such.
 *
 * The exit is `none` rather than `unknown`: one payment ends the agreement, so
 * there is nothing to leave. That is a fact about the shape, not a claim about
 * the retailer's return policy, which the listing does not state and this page
 * does not invent.
 */
export function marketTerms(offer: MarketOffer): CommitmentTerms {
  return {
    shape: "one_time",
    itemPrice: offer.price,
    shipping: null,
    tax: null,
    exit: { kind: "none" },
  };
}

/**
 * How many results actually use the words the shopper typed.
 *
 * The catalogue matches on more than spelling — a query it cannot answer can
 * still come back with a full page of products whose names merely start with
 * the same letter. Counting the results that contain the words is the only way
 * this screen can tell an answer from a near miss without guessing at either.
 */
export function matchingCount(products: MarketProduct[], query: string): number {
  const words = query
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length > 2);
  if (words.length === 0) return products.length;

  return products.filter((product) => {
    const haystack = `${product.title} ${product.brand ?? ""} ${product.description}`.toLowerCase();
    return words.every((word) => haystack.includes(word));
  }).length;
}

/** The spread between the cheapest and dearest in-stock offer, when there are two. */
export function offerSpread(offers: MarketOffer[]): Money | null {
  const prices = offers
    .filter((offer) => offer.availability === "InStock")
    .map((offer) => offer.price.minor);
  if (prices.length < 2) return null;
  const spread = Math.max(...prices) - Math.min(...prices);
  return spread > 0 ? { currency: "USD", minor: spread } : null;
}

/* ------------------------------------------------------------------ */
/* The price boundary                                                  */
/* ------------------------------------------------------------------ */

/**
 * The catalogue takes dollars and cents as a number; every amount in this app
 * is an integer number of cents. This is the only place the two meet, because a
 * band boundary off by one cent is invisible until a product priced at exactly
 * fifty dollars lands on the wrong page.
 */
export function cataloguePrice(amount: Money): number {
  return Number((amount.minor / 100).toFixed(2));
}

export type PriceBandKey = "any" | "under-50" | "50-200" | "over-200";

/** A narrowing a shopper can click: the words, and the bounds the catalogue gets. */
export type PriceBand = {
  key: PriceBandKey;
  label: string;
  /** Inclusive, in cents. `null` is an open end. */
  min: Money | null;
  max: Money | null;
};

/**
 * Three bands, because a person who is avoiding arithmetic should not be asked
 * for two numbers. The bounds are inclusive at the catalogue and exclusive
 * where the shopper reads them: $50.00 is in "$50–$200", not "Under $50".
 */
export const PRICE_BANDS: PriceBand[] = [
  { key: "any", label: "Any price", min: null, max: null },
  { key: "under-50", label: "Under $50", min: null, max: money(4999) },
  { key: "50-200", label: "$50–$200", min: money(5000), max: money(20000) },
  { key: "over-200", label: "Over $200", min: money(20001), max: null },
];

/** The band a URL names; anything unrecognised is "any", so a bad link still works. */
export function priceBand(key: string | null | undefined): PriceBand {
  return PRICE_BANDS.find((band) => band.key === key) ?? PRICE_BANDS[0];
}

/** Only the ends a band actually has, so the catalogue is not told the rest. */
function priceFilter(band: PriceBand): Record<string, number> | null {
  if (band.min === null && band.max === null) return null;
  return {
    ...(band.min === null ? {} : { min_price: cataloguePrice(band.min) }),
    ...(band.max === null ? {} : { max_price: cataloguePrice(band.max) }),
  };
}

/* ------------------------------------------------------------------ */
/* Reading the catalogue                                               */
/* ------------------------------------------------------------------ */

/**
 * One cache per thing that can be asked for, keyed by the request that asked
 * for it — so a page is exactly as cacheable as the link that produced it.
 */
const pages = new Map<string, { at: number; page: MarketPage }>();
const products = new Map<string, { at: number; product: MarketProduct }>();
const lookups = new Map<string, { at: number; lookup: MarketLookup }>();
let categories: { at: number; categories: MarketCategory[] } | null = null;

function fresh<T extends { at: number }>(entry: T | undefined): T | null {
  return entry && Date.now() - entry.at < CACHE_MS ? entry : null;
}

function trim<K, V>(map: Map<K, V>): void {
  while (map.size > CACHE_MAX) {
    const oldest = map.keys().next().value;
    if (oldest === undefined) return;
    map.delete(oldest);
  }
}

function apiKey(): string {
  const key = process.env.CHANNEL3_API_KEY?.trim();
  if (!key) throw new MarketError("No product catalogue key is configured.");
  return key;
}

async function request(
  path: string,
  init: RequestInit,
  deadline: number = DETAIL_READ_DEADLINE_MS,
): Promise<unknown> {
  const response = await withinDeadline(
    (signal) =>
      fetch(`${API}${path}`, {
        ...init,
        signal,
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey(),
          ...(init.headers as Record<string, string> | undefined),
        },
      }),
    deadline,
  );

  if (!response.ok) {
    throw new MarketError(`The product catalogue answered ${response.status}.`, response.status);
  }

  return response.json() as Promise<unknown>;
}

/** Only the catalogue's own https image and offer links are kept. */
function httpsUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function moneyFrom(value: unknown, currency: unknown): Money | null {
  if (currency !== "USD") return null;
  const text =
    typeof value === "number" && Number.isFinite(value)
      ? String(value)
      : typeof value === "string"
        ? value.trim()
        : "";
  if (!text) return null;

  try {
    return fromDecimalString(text);
  } catch {
    // A price the parser refuses (more than two decimal places, no digits) is a
    // price this screen cannot state exactly, so the offer is dropped.
    return null;
  }
}

function offerFrom(raw: unknown): MarketOffer | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const domain = typeof record.domain === "string" ? record.domain : null;
  const url = httpsUrl(record.url);
  const priceRecord =
    record.price && typeof record.price === "object"
      ? (record.price as Record<string, unknown>)
      : null;
  const price = priceRecord ? moneyFrom(priceRecord.price, priceRecord.currency) : null;
  if (!domain || !url || !price) return null;

  const compareAt = priceRecord ? moneyFrom(priceRecord.compare_at_price, priceRecord.currency) : null;

  return {
    domain,
    url,
    price,
    compareAt: compareAt && compareAt.minor > price.minor ? compareAt : null,
    availability: typeof record.availability === "string" ? record.availability : "Unknown",
  };
}

/**
 * The picture a card shows: the catalogue's cut-out when it made one — it is
 * trimmed for exactly this grid — and its own photograph otherwise. Both must
 * be https, because a mixed-content image is one the shop cannot show at all.
 */
function imageOf(record: Record<string, unknown>): string | null {
  return httpsUrl(record.cleaned_url) ?? httpsUrl(record.url);
}

function imageFrom(images: unknown, title: string): { url: string; alt: string } | null {
  const candidates = Array.isArray(images)
    ? images.filter(
        (image): image is Record<string, unknown> => !!image && typeof image === "object",
      )
    : [];

  const chosen =
    candidates.find((image) => image.is_main_image === true && imageOf(image) !== null) ??
    candidates.find((image) => imageOf(image) !== null);
  if (!chosen) return null;

  const url = imageOf(chosen);
  if (!url) return null;

  return {
    url,
    alt:
      typeof chosen.alt_text === "string" && chosen.alt_text.trim() ? chosen.alt_text : title,
  };
}

function productFrom(raw: unknown): MarketProduct | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const id = typeof record.id === "string" ? record.id : null;
  const title = typeof record.title === "string" ? record.title : null;
  if (!id || !title) return null;

  const offers = Array.isArray(record.offers)
    ? record.offers.map(offerFrom).filter((offer): offer is MarketOffer => offer !== null)
    : [];

  const brandRecord = Array.isArray(record.brands) ? (record.brands[0] as Record<string, unknown>) : null;
  const brand = brandRecord && typeof brandRecord.name === "string" ? brandRecord.name : null;

  const ratingRecord =
    record.ratings && typeof record.ratings === "object"
      ? (record.ratings as Record<string, unknown>)
      : null;
  const ratingValue = typeof ratingRecord?.value === "number" ? ratingRecord.value : null;
  const ratingCount = typeof ratingRecord?.count === "number" ? ratingRecord.count : null;

  return {
    id,
    title,
    description: typeof record.description === "string" ? record.description : "",
    brand,
    image: imageFrom(record.images, title),
    rating:
      ratingValue !== null && ratingCount !== null
        ? { value: ratingValue, count: ratingCount }
        : null,
    offers,
  };
}

/** Products with a price someone can actually pay, in the catalogue's order. */
function buyable(product: MarketProduct): boolean {
  return cheapestInStock(product.offers) !== null;
}

/** A page that says nothing exists, without asking the catalogue. */
function emptyPage(): MarketPage {
  return { products: [], nextToken: null };
}

/**
 * One page of the catalogue, from either endpoint that answers pages.
 *
 * The cache key is the request itself: two visitors who clicked the same link
 * share one catalogue call, and a different price band or page is a different
 * entry. The token in the answer is handed back exactly as the catalogue sent
 * it — its format is not ours, and the URL carries it verbatim.
 */
async function pageCall(path: string, body: Record<string, unknown>): Promise<MarketPage> {
  const key = `${path}:${JSON.stringify(body)}`;
  const cached = fresh(pages.get(key));
  if (cached) return cached.page;

  const answer = await request(path, { method: "POST", body: JSON.stringify(body) });
  const record = answer && typeof answer === "object" ? (answer as Record<string, unknown>) : {};
  const parsed = Array.isArray(record.products)
    ? record.products.map(productFrom).filter((product): product is MarketProduct => product !== null)
    : [];

  const page: MarketPage = {
    products: parsed.filter(buyable),
    nextToken:
      typeof record.next_page_token === "string" && record.next_page_token
        ? record.next_page_token
        : null,
  };

  pages.set(key, { at: Date.now(), page });
  trim(pages);

  return page;
}

/**
 * Searches the live catalogue. Throws `MarketError` when it cannot answer, so
 * the shop says so instead of rendering an empty shelf as if nothing existed.
 */
export async function searchMarket(
  query: string,
  options: MarketPageQuery = {},
): Promise<MarketPage> {
  const text = query.trim().slice(0, 120);
  if (!text) return emptyPage();

  const filter = priceFilter(priceBand(options.price));
  const body: Record<string, unknown> = { query: text, limit: PAGE_LIMIT };
  if (filter) body.filters = { price: filter };
  if (options.after) body.page_token = options.after;

  return pageCall("/v1/search", body);
}

/**
 * One page of a category. A root category browses its whole subtree, which is
 * what lets a shelf of sixteen words stand in front of a catalogue this size;
 * the catalogue refuses an unscoped browse, so the category is not optional.
 */
export async function browseMarket(
  category: string,
  options: MarketPageQuery = {},
): Promise<MarketPage> {
  const slug = category.trim().slice(0, 120);
  if (!slug) return emptyPage();

  const filter = priceFilter(priceBand(options.price));
  const body: Record<string, unknown> = {
    filters: { category_ids: [slug], ...(filter ? { price: filter } : {}) },
    limit: PAGE_LIMIT,
  };
  if (options.after) body.page_token = options.after;

  return pageCall("/v1/browse", body);
}

/**
 * The catalogue's sixteen top-level categories, by name.
 *
 * Sorted here rather than in the screen: a shelf that reorders itself between
 * visits is a shelf a person has to re-read. The catalogue's own order is
 * arbitrary; a taxonomy does not change, so it is cached for an hour.
 */
export async function readCategories(): Promise<MarketCategory[]> {
  if (categories && Date.now() - categories.at < CATEGORY_CACHE_MS) return categories.categories;

  const answer = await request("/v1/categories?roots_only=true", { method: "GET" });
  const record = answer && typeof answer === "object" ? (answer as Record<string, unknown>) : {};
  const items = Array.isArray(record.items) ? record.items : [];

  const roots = items
    .map((item): MarketCategory | null => {
      if (!item || typeof item !== "object") return null;
      const entry = item as Record<string, unknown>;
      const slug = typeof entry.slug === "string" ? entry.slug : null;
      const title = typeof entry.title === "string" ? entry.title : null;
      if (!slug || !title) return null;
      return { slug, title, hasChildren: entry.has_children === true };
    })
    .filter((root): root is MarketCategory => root !== null)
    .sort((a, b) => a.title.localeCompare(b.title));

  categories = { at: Date.now(), categories: roots };
  return roots;
}

/** The longest product address worth sending anywhere. */
const MAX_ADDRESS = 2048;

/**
 * Resolves a product URL a shopper pasted.
 *
 * The three outcomes are the three sentences the shop says. `not-a-product` is
 * the catalogue's 422 — a real page that is not a listing — and is also what a
 * junk address gets without spending a request. Anything else is the catalogue
 * failing, which throws, because "we could not ask" is not "your link is bad".
 */
export async function lookupProduct(address: string): Promise<MarketLookup> {
  const url = address.trim();
  if (url.length === 0 || url.length > MAX_ADDRESS) return { outcome: "not-a-product" };

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { outcome: "not-a-product" };
  }
  if (parsed.protocol !== "https:") return { outcome: "not-a-product" };

  const cached = fresh(lookups.get(url));
  if (cached) return cached.lookup;

  let lookup: MarketLookup;
  try {
    const answer = await request(
      "/v1/lookup",
      { method: "POST", body: JSON.stringify({ url }) },
      LOOKUP_DEADLINE_MS,
    );
    const record = answer && typeof answer === "object" ? (answer as Record<string, unknown>) : {};
    const product = productFrom(record.product);
    lookup = product ? { outcome: "found", product } : { outcome: "not-found" };
  } catch (error) {
    if (error instanceof MarketError && error.status === 422) {
      lookup = { outcome: "not-a-product" };
    } else if (error instanceof MarketError && error.status === 404) {
      lookup = { outcome: "not-found" };
    } else {
      throw error;
    }
  }

  lookups.set(url, { at: Date.now(), lookup });
  trim(lookups);

  return lookup;
}

/** Reads one product by its slug; `null` means the catalogue does not list it. */
export async function readMarketProduct(slug: string): Promise<MarketProduct | null> {
  const id = marketProductId(slug);
  if (!id) return null;

  const cached = fresh(products.get(id));
  if (cached) return cached.product;

  let body: unknown;
  try {
    body = await request(`/v1/products/${encodeURIComponent(id)}`, { method: "GET" });
  } catch (error) {
    // A product id that the catalogue no longer lists is a dead link, not a
    // failure of the catalogue: the page answers 404 rather than "try later".
    if (error instanceof MarketError && error.status === 404) return null;
    throw error;
  }

  const product = productFrom(body);
  if (!product) return null;

  products.set(id, { at: Date.now(), product });
  trim(products);

  return product;
}
