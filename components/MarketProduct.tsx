import Link from "next/link";
import { CommitmentView } from "@/components/CommitmentView";
import { computeCommitment } from "@/lib/commitment/compute";
import { presentFigures } from "@/lib/commitment/present";
import { describeSchedule } from "@/lib/commitment/schedule";
import { describeSources } from "@/lib/commitment/sources";
import {
  cheapestInStock,
  marketTerms,
  MARKET_EXIT_NOTE,
  offerSpread,
  type MarketProduct,
} from "@/lib/market/channel3";
import { formatMoney, type Money } from "@/lib/money";

function extremes(offers: MarketProduct["offers"]): { low: Money; high: Money; count: number } | null {
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
 * The figures are computed here from the cheapest in-stock price and shown
 * before the button, the same rule as every other screen. The offer table is
 * the comparison the catalogue makes possible: one product, several retailers,
 * several prices — stated as a fact, never as advice about which to take.
 */
export function MarketProduct({ product, slug }: { product: MarketProduct; slug: string }) {
  const offer = cheapestInStock(product.offers);
  const spread = offerSpread(product.offers);
  const range = extremes(product.offers);

  const terms = offer ? marketTerms(offer) : null;
  const translation = terms ? computeCommitment(terms) : null;
  const figures =
    terms && translation
      ? presentFigures(terms, translation, { unstatedAt: "checkout" })
      : null;

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

      {offer && terms && figures && translation ? (
        <>
          <CommitmentView
            figures={figures}
            breakdown={translation.breakdown}
            labels={{ item: "The listed price", shipping: "Shipping", tax: "Sales tax" }}
            summary=""
            schedule={describeSchedule(terms, { unstatedAt: "checkout" })}
            unstatedAt="checkout"
            figureNotes={{ exit: MARKET_EXIT_NOTE }}
            sourceNote={describeSources({
              published: `the price ${offer.domain} lists`,
              // The figure's own note already says the listing states no
              // cancellation terms. "Nobody published it" would be a claim about
              // every retailer, not about the one source this page read.
              absent: null,
            })}
          />

          <p className="market-buy-note">
            The check uses the cheapest in-stock offer: {formatMoney(offer.price)} at{" "}
            {offer.domain}. If that offer leaves the catalogue, this page says so rather than
            charging a price nobody is offering.
          </p>

          <Link className="button-primary" href={`/consent/pending?slug=${encodeURIComponent(slug)}`}>
            Check this commitment
          </Link>
        </>
      ) : (
        <p className="notice">
          No in-stock offer to check right now, so there is no price to put in front of you.
        </p>
      )}

      <p className="market-source">
        Prices, photos and retailer links are the retailers&apos; own, read live when this page
        opened.
      </p>
    </article>
  );
}
