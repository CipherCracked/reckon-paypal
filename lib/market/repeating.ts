import { listingText } from "@/lib/catalog/resolve";
import { repeatingWords } from "@/lib/commitment/published-term";
import { searchMarket, type MarketPage, type MarketProduct } from "./channel3";

/**
 * The shelf of things that charge more than once (IPD 41, ITD 36).
 *
 * The catalogue cannot be asked "what is a subscription": its search is a
 * nearest-neighbour match, so the words that surface recurring listings also
 * surface books about them, wall calendars with "monthly" in the title, and
 * extended service plans stating a two-year period. The shelf asks those words
 * anyway — they are the only door — and then screens the results with the
 * reader's own vocabulary (`repeatingWords`), keeping only the listings whose
 * copy states a period in a way that is about an agreement.
 *
 * What comes back is evidence, not a verdict: a product and the clause of its
 * own text that put it on the shelf. No model is called here, so the shelf costs
 * two catalogue searches and no wait, and whatever the tile leads to is read —
 * with a model — when it is opened.
 */

/**
 * The words the shelf asks the catalogue for.
 *
 * Measured on 2026-11-12 against the live catalogue: *monthly subscription box*
 * returned thirty listings, about twenty of them products that charge again;
 * *subscription* alone returned mostly books, forms and warranty extensions. The
 * second query is the shorter form of the first, so it catches listings titled
 * "… Subscription Box" that the longer phrase does not rank.
 */
export const SHELF_QUERIES: readonly string[] = ["monthly subscription box", "subscription box"];

/** One page's worth. The shelf is a shelf, not the catalogue. */
export const SHELF_MAX = 30;

/** A listing that earned its place, and the words it earned it with. */
export type ShelfTile = {
  product: MarketProduct;
  /** A verbatim clause of the listing's title or description. */
  quote: string;
};

/**
 * Reads the shelf: asks the catalogue each query, screens every result with the
 * reader's vocabulary, and keeps the ones that pass.
 *
 * A query that fails does not empty the shelf — the other query's listings are
 * still real — but a shelf where nothing answered throws, because "the catalogue
 * is down" and "nothing in the catalogue charges again" are different sentences
 * and only one of them is true.
 */
export async function readRepeatingShelf(): Promise<ShelfTile[]> {
  const seen = new Set<string>();
  const tiles: ShelfTile[] = [];
  let answered = 0;
  let failure: unknown = null;

  for (const query of SHELF_QUERIES) {
    let page: MarketPage;
    try {
      page = await searchMarket(query);
      answered += 1;
    } catch (error) {
      failure = error;
      continue;
    }

    for (const product of page.products) {
      // Once per listing, whichever query found it first: two queries are one
      // shelf, not two pages stapled together.
      if (seen.has(product.id)) continue;
      seen.add(product.id);

      const quote = repeatingWords(listingText(product));
      if (!quote) continue;

      tiles.push({ product, quote });
      if (tiles.length >= SHELF_MAX) return tiles;
    }
  }

  if (answered === 0) throw failure ?? new Error("The product catalogue did not answer.");
  return tiles;
}
