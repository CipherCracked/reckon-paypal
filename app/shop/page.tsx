import Link from "next/link";
import { BackLink } from "@/components/BackLink";
import {
  cheapestInStock,
  marketSlug,
  matchingCount,
  offerSpread,
  searchMarket,
  type MarketProduct,
} from "@/lib/market/channel3";
import { formatMoney } from "@/lib/money";

/** Prices are live, so the listing is read rather than built. */
export const dynamic = "force-dynamic";

const DEFAULT_QUERY = "headphones";
const SUGGESTIONS = ["headphones", "coffee maker", "running shoes", "desk lamp"];
/** How many results one search can return — the catalogue's own limit. */
const SEARCH_LIMIT = 12;

type PageProps = { searchParams: Promise<{ q?: string }> };

/**
 * What the count line may say.
 *
 * "12 products for ‘zzzqqq’" was a claim the page could not support: the
 * catalogue returns its nearest results for a query it cannot answer, and a
 * full page of them reads as twelve matches. This counts the results that
 * actually contain the shopper's words and says which kind of answer this is.
 */
function resultLine(count: number, matched: number, query: string): string {
  const results = `${count} result${count === 1 ? "" : "s"}`;
  const maybeMore =
    count >= SEARCH_LIMIT ? " One search shows at most 12, so there may be more." : "";

  if (matched === count) {
    return `The catalogue returned ${results} for “${query}”, and every one of them uses your words.${maybeMore}`;
  }

  if (matched === 0) {
    return `Nothing the catalogue returned uses “${query}”. It matches on more than spelling, so these are its nearest results — not a promise that they match.${maybeMore}`;
  }

  return `${matched} of the ${results} the catalogue returned for “${query}” use your words. The rest may be matching something else.${maybeMore}`;
}


/**
 * The shop is a search over a live catalogue, not a shelf we wrote.
 *
 * It deliberately shows no commitment figures: this screen is for choosing, and
 * the figures belong where money is agreed. What it does show is the one thing
 * a listing can say honestly — the price range across the retailers that list
 * the same product.
 */
export default async function Shop({ searchParams }: PageProps) {
  const { q } = await searchParams;
  const query = q?.trim() || DEFAULT_QUERY;

  let products: MarketProduct[] = [];
  let failure: string | null = null;

  try {
    products = await searchMarket(query);
  } catch {
    failure =
      process.env.CHANNEL3_API_KEY?.trim()
        ? "The live product catalogue could not be reached just now. Nothing is invented to fill the gap — search again in a moment."
        : "This deployment has no product catalogue key configured, so there is nothing live to show. See the README for the one variable it needs.";
  }

  return (
    <div className="page">
      <BackLink href="/">Back to the ways in</BackLink>

      <header className="page-header">
        <p className="eyebrow">The shop</p>
        <h1>Search real products</h1>
        <p className="lede">
          Every product below is a real listing, with its real price, read from the live catalogue
          when this page loaded. Pick one to see what the purchase asks of you before you agree to
          it.
        </p>
      </header>

      <form className="market-search" action="/shop" method="get">
        <label htmlFor="market-q">What are you looking for?</label>
        <div className="market-search-row">
          <input
            id="market-q"
            name="q"
            type="search"
            defaultValue={query}
            maxLength={120}
            aria-describedby="market-hint"
          />
          <button type="submit" className="button-primary">
            Search
          </button>
        </div>
        <p id="market-hint" className="field-hint">
          Searching: {SUGGESTIONS.map((suggestion, index) => (
            <span key={suggestion}>
              {index > 0 ? " · " : ""}
              <Link href={`/shop?q=${encodeURIComponent(suggestion)}`}>{suggestion}</Link>
            </span>
          ))}
        </p>
      </form>

      {failure ? (
        <p className="notice" role="status">
          {failure}
        </p>
      ) : products.length === 0 ? (
        <p className="notice" role="status">
          Nothing in the catalogue matched &ldquo;{query}&rdquo;. That is the catalogue&apos;s
          answer, not a guess at something close.
        </p>
      ) : (
        <>
          <p className="scope-note" role="status">
            {resultLine(products.length, matchingCount(products, query), query)}
          </p>

          <ul className="market-list">
            {products.map((product) => (
              <MarketCard key={product.id} product={product} />
            ))}
          </ul>
        </>
      )}

      <p className="scope-note">
        Prices, images and retailer links come from Channel3 and change without notice. Nothing here
        is an offer to sell: this demo does not ship anything, and its checkout runs in PayPal&apos;s
        sandbox.
      </p>
    </div>
  );
}

function MarketCard({ product }: { product: MarketProduct }) {
  const cheapest = cheapestInStock(product.offers);
  const spread = offerSpread(product.offers);
  if (!cheapest) return null;

  const retailers = product.offers.filter((offer) => offer.availability === "InStock").length;

  return (
    <li className="market-card">
      <Link className="market-card-link" href={`/product/${marketSlug(product.id)}`}>
        {product.image ? (
          // The catalogue's own image, at the size it is shown. A plain <img>
          // keeps the catalogue's CDN out of the build's image pipeline.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="market-thumb"
            src={product.image.url}
            alt={product.image.alt}
            width={96}
            height={96}
            loading="lazy"
          />
        ) : (
          <span className="market-thumb market-thumb-empty" aria-hidden="true" />
        )}

        <span className="market-card-body">
          {product.brand ? <span className="market-brand">{product.brand}</span> : null}
          <span className="market-title">{product.title}</span>
          <span className="market-price">
            From {formatMoney(cheapest.price)} at {cheapest.domain}
          </span>
          <span className="market-note">
            {retailers} retailer{retailers === 1 ? "" : "s"} in these results
            {spread ? `, ${formatMoney(spread)} apart` : ""}
          </span>
        </span>
      </Link>
    </li>
  );
}
