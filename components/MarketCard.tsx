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
 */
export function MarketCard({ product }: { product: MarketProduct }) {
  const cheapest = cheapestInStock(product.offers);
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
        {retailers > 1 ? (
          <span className="market-note">
            {retailers} retailers
          </span>
        ) : null}
      </Link>
    </li>
  );
}
