import { MarketCard } from "@/components/MarketCard";
import { Page } from "@/components/Page";
import { readRepeatingShelf, type ShelfTile } from "@/lib/market/repeating";
import { SOURCING, catalogueFailure } from "@/lib/market/shop-words";

/** A price and a seller's words are both live, so neither is built ahead of time. */
export const dynamic = "force-dynamic";

/**
 * What the shelf is, in the shelf's own words (IPD 41, IPD 42).
 *
 * The second sentence is the one that keeps the tiles honest: a tile is the
 * listing's phrase, not this page's judgement, and the term itself is read when
 * a tile is opened. Without it a grid of quoted clauses would read as a claim
 * about what each listing costs.
 */
const LEDE =
  "Every tile here is a listing whose own words say it charges more than once. The phrase that says so is quoted from the listing; open one and this page reads its term.";

/**
 * What an empty shelf says.
 *
 * The catalogue answered — otherwise the failure sentence would be showing — and
 * nothing it returned names a period in words the reader recognises. That is not
 * the same as the catalogue holding no subscriptions, so the sentence offers the
 * two doors the shop actually has.
 */
const EMPTY =
  "The catalogue answered, but none of the listings it returned say they charge more than once. Try a department, or search for the thing by name.";

/**
 * The shelf of things that charge more than once.
 *
 * Its own screen rather than a section of the shop: the shop's opening screen
 * asks which department, and this asks which commitment — two questions on one
 * screen is the thing IPD 33 was written to avoid. Nothing here is read by a
 * model, so the page costs two catalogue searches and no wait.
 */
export default async function Subscriptions() {
  let tiles: ShelfTile[] = [];
  let failure: string | null = null;

  try {
    tiles = await readRepeatingShelf();
  } catch {
    failure = catalogueFailure();
  }

  return (
    <Page
      back={{ href: "/shop", label: "Back to the shop" }}
      eyebrow="The shop"
      title="What charges more than once"
      lede={LEDE}
      wide
    >
      {failure ? (
        <p className="notice" role="status">
          {failure}
        </p>
      ) : tiles.length === 0 ? (
        <p className="notice" role="status">
          {EMPTY}
        </p>
      ) : (
        <>
          <p className="scope-note" role="status">
            {tiles.length} listing{tiles.length === 1 ? "" : "s"} whose own words say they charge
            more than once, each with a price someone can pay.
          </p>
          <ul className="market-grid">
            {tiles.map((tile) => (
              <MarketCard key={tile.product.id} product={tile.product} evidence={tile.quote} />
            ))}
          </ul>
        </>
      )}

      <p className="market-source">{SOURCING}</p>
    </Page>
  );
}
