import Link from "next/link";
import { redirect } from "next/navigation";
import { CategoryShelf } from "@/components/CategoryShelf";
import { MarketCard } from "@/components/MarketCard";
import { MarketLinkLookup } from "@/components/MarketLinkLookup";
import { MarketSearch } from "@/components/MarketSearch";
import { Page } from "@/components/Page";
import { PriceBands } from "@/components/PriceBands";
import {
  MarketError,
  browseMarket,
  lookupProduct,
  marketSlug,
  matchingCount,
  priceBand,
  readCategories,
  readMarketProduct,
  searchMarket,
  type MarketCategory,
  type MarketPage,
  type MarketProduct,
} from "@/lib/market/channel3";
import { shopHref } from "@/lib/market/links";
import { SOURCING, catalogueFailure } from "@/lib/market/shop-words";

/** Prices are live, so what is on the screen is read rather than built. */
export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    q?: string;
    category?: string;
    price?: string;
    after?: string;
    link?: string;
  }>;
};

const STOPPED =
  "The catalogue shows at most 150 of these. Choose a narrower category, or search for the thing by name.";

/* ------------------------------------------------------------------ */
/* Where a pasted link goes                                            */
/* ------------------------------------------------------------------ */

const NOT_A_PRODUCT =
  "That address is not a product page. Try the page the product itself is sold on, rather than a category or a home page.";
const NOT_FOUND = "The catalogue has no product at that address. The listing may be gone.";
const DID_NOT_ANSWER = "The catalogue did not answer in time. Try that link again in a moment.";
const CANNOT_OPEN =
  "That link resolved to a product this page cannot open. Nothing was shown rather than something wrong.";

/** True when the address points at this app rather than at a shop. */
function pointsBackHere(address: URL): boolean {
  const own = [process.env.APP_ORIGIN, process.env.PAYPAL_RETURN_ORIGIN].filter(
    (origin): origin is string => Boolean(origin && origin.trim()),
  );

  return own.some((origin) => {
    try {
      return new URL(origin).host === address.host;
    } catch {
      return false;
    }
  });
}

/**
 * Turns a pasted address into a product page, or into the sentence that says
 * why it did not (ITD 32).
 *
 * The redirect is the last step, never the second: sending someone to a product
 * page is a promise that the page exists, so the product is read back by id
 * first — the same read the product page would make a moment later — and only a
 * product that came back is followed. Anything that goes wrong is a sentence on
 * the shop with the address still in the field.
 */
async function resolveLink(address: string): Promise<string> {
  let parsed: URL;
  try {
    parsed = new URL(address);
  } catch {
    return NOT_A_PRODUCT;
  }
  if (parsed.protocol !== "https:") return NOT_A_PRODUCT;
  if (pointsBackHere(parsed)) return NOT_A_PRODUCT;

  let looked;
  try {
    looked = await lookupProduct(address);
  } catch {
    return DID_NOT_ANSWER;
  }

  if (looked.outcome === "not-a-product") return NOT_A_PRODUCT;
  if (looked.outcome === "not-found") return NOT_FOUND;

  const slug = marketSlug(looked.product.id);
  let opened: MarketProduct | null;
  try {
    opened = await readMarketProduct(slug);
  } catch {
    return DID_NOT_ANSWER;
  }
  if (!opened) return CANNOT_OPEN;

  redirect(`/product/${slug}`);
  return CANNOT_OPEN;
}

/* ------------------------------------------------------------------ */
/* What the page says about the answer it has                          */
/* ------------------------------------------------------------------ */

/**
 * The count line (IPD 35).
 *
 * The catalogue matches on more than spelling, so a query it cannot answer can
 * still come back full. This says which kind of answer arrived — every result
 * uses the shopper's words, none of them do, or some do — without explaining
 * the catalogue's engine to the person reading.
 */
function resultLine(count: number, matched: number, query: string): string {
  const results = `${count} result${count === 1 ? "" : "s"}`;

  if (matched === count) {
    return `${results} for “${query}” — every one uses your words.`;
  }
  if (matched === 0) {
    return `Nothing here uses “${query}”. These are the closest listings the catalogue has.`;
  }
  return `${matched} of the ${results} for “${query}” use your words; the rest may match something else.`;
}

function failureSentence(error: unknown, deep: boolean): string {
  if (deep && error instanceof MarketError && error.status === 422) return STOPPED;
  return catalogueFailure();
}

/* ------------------------------------------------------------------ */
/* The shop                                                            */
/* ------------------------------------------------------------------ */

/**
 * The shop opens on the catalogue's own shelf (IPD 33).
 *
 * Sixteen departments, the search beneath them for a person who already knows
 * the name, and a field for a link someone sent. Every choice is in the URL, so
 * back, reload and a copied link all behave. Nothing here is merchandising we
 * wrote: the departments, the products, the prices and the photos are the
 * catalogue's, read when the page opened.
 */
export default async function Shop({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const categorySlug = params.category?.trim() ?? "";
  const bandKey = params.price ?? "any";
  const after = params.after ?? null;
  const link = params.link?.trim() ?? "";

  const linkFailure = link ? await resolveLink(link) : null;

  const browsing = Boolean(query || categorySlug);

  // The taxonomy is only needed where it is shown: on the shelf, and to name
  // the department a deep link points at.
  let roots: MarketCategory[] | null = null;
  let shelfFailure = false;
  if (!query) {
    try {
      roots = await readCategories();
    } catch {
      shelfFailure = true;
    }
  }

  const category = roots?.find((root) => root.slug === categorySlug) ?? null;
  const categoryTitle = category?.title ?? categorySlug;

  let result: MarketPage | null = null;
  let failure: string | null = null;

  if (query || categorySlug) {
    try {
      result = query
        ? await searchMarket(query, { price: bandKey, after })
        : await browseMarket(categorySlug, { price: bandKey, after });
    } catch (error) {
      failure = failureSentence(error, Boolean(after));
    }
  }

  const heading = query ? `Results for “${query}”` : categoryTitle;
  const products = result?.products ?? [];

  return (
    <Page
      back={{ href: "/", label: "Back to the start" }}
      eyebrow="The shop"
      title="Browse real products"
      /*
       * A browsed department opens on its products, not on a paragraph about the
       * shop. The first phone screenshot of this screen had a heading, a lede,
       * two forms and two buttons above the first tile, and the paragraph also
       * claimed the prices were read live when this page opened — which the
       * standing line at the foot already says (IPD 35). The shelf keeps a lede
       * because on the shelf the paragraph is all there is to say what the
       * sixteen tiles are; a department's own heading does that job itself.
       */
      lede={
        browsing
          ? undefined
          : "Every listing is a real product at a real price. Pick one to see what agreeing to it would cost."
      }
      wide
    >
      {browsing ? null : (
        <>
          {shelfFailure ? (
            <p className="notice" role="status">
              {catalogueFailure()}
            </p>
          ) : (
            <CategoryShelf categories={roots ?? []} />
          )}

          {/* One line beneath the departments (IPD 42): the shop asks which
              department, the shelf asks which commitment, and a screen that
              asks both at once is the thing IPD 33 was written to avoid. */}
          <p className="market-shelf-link">
            <Link href="/shop/subscriptions">See what charges more than once</Link>
          </p>
        </>
      )}

      <MarketSearch query={query || undefined} />

      {browsing ? (
        <section className="market-results" aria-labelledby="market-heading">
          <div className="market-toolbar">
            <div className="market-heading">
              {categorySlug ? (
                <Link className="market-back" href={shopHref()}>
                  All categories
                </Link>
              ) : null}
              <h2 id="market-heading">{heading}</h2>
            </div>
            <PriceBands params={{ q: query, category: categorySlug }} price={bandKey} />
          </div>

          <div aria-live="polite">
            {failure ? (
              <p className="notice" role="status">
                {failure}
              </p>
            ) : products.length === 0 ? (
              <p className="notice" role="status">
                {emptySentence(query, categoryTitle, bandKey)}
              </p>
            ) : (
              <p className="scope-note" role="status">
                {query
                  ? resultLine(products.length, matchingCount(products, query), query)
                  : `${products.length} result${products.length === 1 ? "" : "s"} in ${categoryTitle}, each with a price someone can pay.`}
              </p>
            )}
          </div>

          {products.length > 0 ? (
            <ul className="market-grid">
              {products.map((product) => (
                <MarketCard key={product.id} product={product} />
              ))}
            </ul>
          ) : null}

          {result?.nextToken ? (
            <Link
              className="market-more"
              href={shopHref({ q: query, category: categorySlug, price: bandKey, after: result.nextToken })}
            >
              Show 30 more
            </Link>
          ) : null}
        </section>
      ) : null}

      {/* Under the catalogue, not above it: a person browsing a department is
          not pasting a link, and the field had been taking a button's worth of
          the first screen from the products (IPD 36). */}
      <MarketLinkLookup value={link || undefined} />

      {linkFailure ? (
        <p className="notice" role="status">
          {linkFailure}
        </p>
      ) : null}

      <p className="market-source">{SOURCING}</p>
    </Page>
  );
}

/**
 * What an empty page says.
 *
 * Products without an in-stock USD offer are dropped before display, so "no
 * results" can mean "nothing came back" or "nothing came back that this page
 * could price". The sentence has to be true of both.
 */
function emptySentence(query: string, categoryTitle: string, bandKey: string): string {
  const band = priceBand(bandKey);

  if (query) {
    return `Nothing for “${query}” with a price someone can pay.`;
  }
  if (band.key !== "any") {
    return `Nothing in ${categoryTitle} ${band.label.toLowerCase()} has a price someone can pay.`;
  }
  return `Nothing in ${categoryTitle} came back with a price someone can pay.`;
}
