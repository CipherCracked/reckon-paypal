import { findProduct, products, type Product } from "./products";
import { readProductCardFromPayPal, readProductFromPayPal } from "@/lib/paypal/catalog";
import { cheapestInStock, isMarketSlug, marketTerms, readMarketProduct } from "@/lib/market/channel3";
import { curatedTerm, subscriptionTerms, termIsStated } from "@/lib/market/subscriptions";
import type { CommitmentTerms } from "@/lib/commitment/types";

/**
 * Which catalogue answers: PayPal first, the file second, and the caller is
 * told which one did (IPD 20, rule 1).
 *
 * Every screen that lists a product or shows a commitment goes through here,
 * so "PayPal first" is a property of the product rather than a property of the
 * one screen that was remembered. The file is a fallback, not an error state:
 * when PayPal has no id for a slug, or cannot be reached, this returns the
 * published terms and says so — it never returns null for a product the file
 * knows.
 */

/** Where the entry came from, in the words the screen should use. */
export type CatalogueSources = {
  /** The PayPal object it was read from, or null when the file was used. */
  paypal: string | null;
  /** The seller's words it was computed from, or null when PayPal was used. */
  published: string | null;
};

export type ResolvedCard = {
  slug: string;
  name: string;
  description: string;
  sources: CatalogueSources;
};

export type ResolvedProduct = ResolvedCard & {
  terms: CommitmentTerms;
  /** How to name the description when the exit figure is read out of it (IPD 19). */
  descriptionLabel: string;
  /**
   * True when the terms came from a live retail listing rather than PayPal or
   * the file. A listing's missing parts belong to a checkout, and a listing
   * paid once has no term to leave, so the callers that say those things need
   * to know which source answered without re-parsing the slug.
   */
  listed?: boolean;
};

const FILE_TERMS = "the terms shown on this page";

function cardFromFile(product: Product): ResolvedCard {
  return {
    slug: product.slug,
    name: product.name,
    description: product.description,
    sources: { paypal: null, published: FILE_TERMS },
  };
}

/**
 * A product's name and description, which is all the shop and the product
 * screen show. One PayPal call — a catalog product has no price to read.
 */
export async function resolveProductCard(slug: string): Promise<ResolvedCard | null> {
  const file = findProduct(slug);

  try {
    const card = await readProductCardFromPayPal(slug);
    if (card) {
      return {
        slug: card.slug,
        name: card.name,
        description: card.description,
        sources: { paypal: "PayPal's catalogue", published: null },
      };
    }
  } catch {
    // Unreachable, unconfigured, or unknown to PayPal: none of these is a
    // reason to show a shopper an empty shop.
  }

  return file ? cardFromFile(file) : null;
}

/**
 * A product's terms as well — the price and the term, read from its billing
 * plan. This is what a screen that shows figures needs and a listing does not.
 */
export async function resolveProduct(slug: string): Promise<ResolvedProduct | null> {
  // A slug that names a retail listing is answered by the live catalogue and by
  // nothing else. Falling through to the demo file would let a real product id
  // be priced from a constant — the one mismatch this product exists to prevent.
  if (isMarketSlug(slug)) {
    const listed = await readMarketProduct(slug);
    const offer = listed ? cheapestInStock(listed.offers) : null;
    if (!listed || !offer) return null;

    // A curated listing is a subscription only while it still contains the
    // sentence the term was read from. If the merchant has rewritten it, no
    // price or one-time reading can stand in: the page says the term is no
    // longer stated rather than giving the listing a shape it does not have.
    const term = curatedTerm(listed.id);
    if (term) {
      if (!termIsStated(listed, term)) return null;

      return {
        slug,
        name: listed.title,
        description: listed.description,
        terms: subscriptionTerms(offer, term),
        sources: {
          paypal: null,
          published: `the price Channel3 lists at ${offer.domain} and the term the listing states (“${term.quote}”)`,
        },
        descriptionLabel: "the description Channel3 lists for this product",
        listed: true,
      };
    }

    return {
      slug,
      name: listed.title,
      description: listed.description,
      terms: marketTerms(offer),
      sources: { paypal: null, published: `the price Channel3 lists at ${offer.domain}` },
      descriptionLabel: "the description Channel3 lists for this product",
      listed: true,
    };
  }

  const file = findProduct(slug);

  try {
    const entry = await readProductFromPayPal(slug);
    if (entry) {
      return {
        slug: entry.slug,
        name: entry.name,
        description: entry.description,
        terms: entry.terms,
        sources: { paypal: entry.planLabel, published: null },
        descriptionLabel: "the description published with the PayPal product",
      };
    }
  } catch {
    // Same fallback, same reasoning: the published terms still produce every
    // figure, and the screen says which source it used.
  }

  if (!file) return null;

  return {
    ...cardFromFile(file),
    terms: file.terms,
    descriptionLabel: "the description shown on this page",
  };
}

/**
 * Every product the file knows, each resolved independently: one product
 * answering from PayPal and two falling back is a normal state, not a partial
 * failure, because each card carries its own source.
 */
export async function resolveCatalogue(): Promise<ResolvedCard[]> {
  const resolved = await Promise.all(products.map((product) => resolveProductCard(product.slug)));
  return resolved.flatMap((card) => (card ? [card] : []));
}
