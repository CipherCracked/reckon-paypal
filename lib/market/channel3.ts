import type { CommitmentTerms } from "@/lib/commitment/types";
import { DETAIL_READ_DEADLINE_MS, withinDeadline } from "@/lib/deadline";
import { fromDecimalString, type Money } from "@/lib/money";

/**
 * The live product catalogue.
 *
 * Everything the shop shows about a real product comes from here: a search, or
 * one product read back by id. Nothing in this file invents a field — a product
 * with no price, no in-stock offer or no image is returned as such, and the
 * screen says what is missing rather than filling it in.
 *
 * The key is read from the server environment and never travels to the browser:
 * every caller of this module is a server component or a route handler.
 */

const API = "https://api.trychannel3.com";
const SEARCH_LIMIT = 12;
const CACHE_MS = 5 * 60_000;
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
 */
export function marketTerms(offer: MarketOffer): CommitmentTerms {
  return {
    shape: "one_time",
    itemPrice: offer.price,
    shipping: null,
    tax: null,
    exit: { kind: "unknown" },
  };
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
/* Reading the catalogue                                               */
/* ------------------------------------------------------------------ */

const searches = new Map<string, { at: number; products: MarketProduct[] }>();
const products = new Map<string, { at: number; product: MarketProduct }>();

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

async function request(path: string, init: RequestInit): Promise<unknown> {
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
    DETAIL_READ_DEADLINE_MS,
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

function productFrom(raw: unknown): MarketProduct | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const id = typeof record.id === "string" ? record.id : null;
  const title = typeof record.title === "string" ? record.title : null;
  if (!id || !title) return null;

  const offers = Array.isArray(record.offers)
    ? record.offers.map(offerFrom).filter((offer): offer is MarketOffer => offer !== null)
    : [];

  const images = Array.isArray(record.images) ? record.images : [];
  const main =
    images.find((image) => {
      const candidate = image as Record<string, unknown>;
      return candidate?.is_main_image === true && httpsUrl(candidate.url) !== null;
    }) ?? images.find((image) => httpsUrl((image as Record<string, unknown>)?.url) !== null);

  const imageRecord = main as Record<string, unknown> | undefined;
  const imageUrl = imageRecord ? httpsUrl(imageRecord.url) : null;

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
    image: imageUrl
      ? {
          url: imageUrl,
          alt:
            imageRecord && typeof imageRecord.alt_text === "string" && imageRecord.alt_text.trim()
              ? imageRecord.alt_text
              : title,
        }
      : null,
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

/**
 * Searches the live catalogue. Throws `MarketError` when it cannot answer, so
 * the shop says so instead of rendering an empty shelf as if nothing existed.
 */
export async function searchMarket(query: string): Promise<MarketProduct[]> {
  const text = query.trim().slice(0, 120);
  if (!text) return [];

  const cached = fresh(searches.get(text));
  if (cached) return cached.products;

  const body = await request("/v1/search", {
    method: "POST",
    body: JSON.stringify({ query: text, limit: SEARCH_LIMIT }),
  });

  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const parsed = Array.isArray(record.products)
    ? record.products.map(productFrom).filter((product): product is MarketProduct => product !== null)
    : [];

  const buyableNow = parsed.filter(buyable);
  searches.set(text, { at: Date.now(), products: buyableNow });
  trim(searches);

  return buyableNow;
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
