import type { ReactNode } from "react";
import { offerSpread, type MarketProduct as MarketRecord } from "@/lib/market/channel3";
import { formatMoney, type Money } from "@/lib/money";

function extremes(offers: MarketRecord["offers"]): { low: Money; high: Money; count: number } | null {
  const prices = offers
    .filter((offer) => offer.availability === "InStock")
    .map((offer) => offer.price);
  if (prices.length < 2) return null;

  const sorted = [...prices].sort((a, b) => a.minor - b.minor);
  return { low: sorted[0], high: sorted[sorted.length - 1], count: prices.length };
}

/**
 * A real product, with its real offers.
 *
 * This is the catalogue's half of the page: the name, the photograph, the
 * seller's copy and every retailer quoting a price. It is read in a few hundred
 * milliseconds and is worth showing immediately, so the commitment is passed in
 * as `children` and streams into the place under the offers when the listing's
 * words have been read (IPD 39).
 *
 * The offer table is the comparison the catalogue makes possible: one product,
 * several retailers, several prices — stated as a fact, never as advice about
 * which to take.
 */
export function MarketProduct({
  product,
  children,
}: {
  product: MarketRecord;
  /** The commitment panel, or the wait for it. */
  children: ReactNode;
}) {
  const spread = offerSpread(product.offers);
  const range = extremes(product.offers);

  const offers = [...product.offers].sort(
    (a, b) =>
      Number(b.availability === "InStock") - Number(a.availability === "InStock") ||
      a.price.minor - b.price.minor,
  );

  return (
    <article className="market-product">
      <header className="page-header">
        {product.brand ? <p className="eyebrow">{product.brand}</p> : null}
        <h1>{product.title}</h1>
        {product.rating ? (
          <p className="market-rating">
            Rated {product.rating.value} out of 5 from {product.rating.count.toLocaleString("en-US")}{" "}
            ratings.
          </p>
        ) : null}
      </header>

      <div className="market-hero">
        {product.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="market-hero-image"
            src={product.image.url}
            alt={product.image.alt}
            width={320}
            height={320}
          />
        ) : null}

        <div className="market-hero-body">
          {product.description ? (
            <>
              {/* Whose words these are, before the reader meets them. The
                  description is the retailer's own copy and the hardest text on
                  the site; labelling it keeps it evidence rather than claiming
                  the plain-language voice every other sentence uses. */}
              <p className="field-hint">The seller&apos;s description.</p>
              <p className="market-description">{product.description}</p>
            </>
          ) : null}
          {range ? (
            <p className="market-spread" data-market-spread="true">
              Listed at {formatMoney(range.low)} to {formatMoney(range.high)} across{" "}
              {range.count} retailers
              {spread ? ` — ${formatMoney(spread)} between the lowest and the highest` : ""}.
            </p>
          ) : null}
        </div>
      </div>

      <section aria-labelledby="offers-heading">
        <h2 id="offers-heading">Where it is listed</h2>
        <ul className="market-offers">
          {offers.map((candidate) => (
            <li key={`${candidate.domain}-${candidate.url}`} className="market-offer">
              <span className="market-offer-domain">{candidate.domain}</span>
              <span className="market-offer-price">
                {formatMoney(candidate.price)}
                {candidate.compareAt ? (
                  <span className="market-was"> was {formatMoney(candidate.compareAt)}</span>
                ) : null}
              </span>
              <span className="market-offer-stock">
                {candidate.availability === "InStock" ? "In stock" : candidate.availability}
              </span>
              <a
                href={candidate.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="market-open"
              >
                Open at {candidate.domain}
                <span className="visually-hidden"> (opens in a new tab)</span>
              </a>
            </li>
          ))}
        </ul>
        {offers.length === 0 ? (
          <p className="notice">The catalogue lists no offer for this product right now.</p>
        ) : null}
      </section>

      {children}

      <p className="market-source">
        Prices, photos and retailer links are the retailers&apos; own, read live when this page
        opened.
      </p>
    </article>
  );
}
