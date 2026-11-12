import Link from "next/link";
import { cheapestInStock, marketSlug, type MarketProduct } from "@/lib/market/channel3";
import { formatMoney } from "@/lib/money";

/**
 * One tile in the shop's grid (IPD 35).
 *
 * Four facts and a picture: the brand, the thing, the lowest price someone can
 * actually pay, and — only when there is more than one — how many shops list it.
 * None of the three commitment figures appear here: a grid is where a product is
 * recognised, and the figures belong where the money is agreed.
 *
 * The whole tile is one link, named by everything in it, so a screen reader
 * reads a card as one thing rather than four fragments.
 *
 * `evidence` is the one thing a tile on the shelf of things that repeat adds
 * (IPD 41): the listing's own words that earned it a place there, printed as the
 * seller's words rather than as this page's verdict. A tile without it is the
 * shop's card, unchanged.
 */
export function MarketCard({
  product,
  evidence,
}: {
  product: MarketProduct;
  /** A verbatim clause of the listing, for the shelf of things that repeat. */
  evidence?: string;
}) {
  const cheapest = cheapestInStock(product.offers);
  // A tile is one link, so a product the shop cannot address has no tile: an id
  // the slug grammar cannot hold would render a card that opens nothing.
  const slug = marketSlug(product.id);
  if (!cheapest || !slug) return null;

  const retailers = product.offers.filter((offer) => offer.availability === "InStock").length;

  return (
    <li className="market-card">
      <Link className="market-card-link" href={`/product/${slug}`}>
        {product.image ? (
          // The catalogue's own image, at the size it is shown. A plain <img>
          // keeps the catalogue's CDN out of the build's image pipeline.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="market-thumb"
            src={product.image.url}
            alt={product.image.alt}
            width={320}
            height={320}
            loading="lazy"
          />
        ) : (
          <span className="market-thumb market-thumb-empty" aria-hidden="true" />
        )}

        {product.brand ? <span className="market-brand">{product.brand}</span> : null}
        <span className="market-title">{product.title}</span>
        <span className="market-price">
          From {formatMoney(cheapest.price)} at {cheapest.domain}
        </span>
        {evidence ? (
          <span className="market-evidence">The listing says “{evidence}”.</span>
        ) : null}
        {retailers > 1 ? (
          <span className="market-note">
            {retailers} retailers
          </span>
        ) : null}
      </Link>
    </li>
  );
}
