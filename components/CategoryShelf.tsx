import Link from "next/link";
import { shopHref } from "@/lib/market/links";
import type { MarketCategory } from "@/lib/market/channel3";

/**
 * The catalogue's own departments (IPD 33).
 *
 * Sixteen words the catalogue harvested from real retailers, each one a link.
 * They are text rather than pictures because the catalogue gives its categories
 * no pictures, and inventing imagery is the one thing this product does not do.
 *
 * It is a `nav` and not a list of buttons: choosing a department navigates, and
 * a screen reader should be able to say so before reading sixteen links.
 */
export function CategoryShelf({ categories }: { categories: MarketCategory[] }) {
  if (categories.length === 0) return null;

  return (
    <nav className="market-shelf" aria-label="Browse the catalogue">
      <ul>
        {categories.map((category) => (
          <li key={category.slug}>
            <Link href={shopHref({ category: category.slug })}>{category.title}</Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
