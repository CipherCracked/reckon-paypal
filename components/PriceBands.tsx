import Link from "next/link";
import { PRICE_BANDS } from "@/lib/market/channel3";
import { shopHref, type ShopParams } from "@/lib/market/links";

/**
 * The only narrowing the shop offers (IPD 34): four words, one click.
 *
 * It is a row of links rather than a pair of number fields because the audience
 * came here to stop doing arithmetic, and because a link can be shared, bookmarked
 * and gone back to — which a form submission cannot.
 *
 * Changing the band starts a new first page, so no paging token is carried over.
 */
export function PriceBands({ params, price }: { params: ShopParams; price: string }) {
  return (
    <nav className="market-bands" aria-label="Price range">
      <ul>
        {PRICE_BANDS.map((band) => (
          <li key={band.key}>
            <Link
              href={shopHref({ ...params, price: band.key, after: null })}
              aria-current={band.key === price ? "page" : undefined}
            >
              {band.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
