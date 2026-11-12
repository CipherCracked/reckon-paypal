import { findProduct, products, type Product } from "./products";
import { readProductCardFromPayPal, readProductFromPayPal } from "@/lib/paypal/catalog";
import { peekListing, readListing } from "@/lib/commitment/published-exit";
import type { TermFinding } from "@/lib/commitment/published-term";
import { cheapestInStock, isMarketSlug, marketTerms, readMarketProduct } from "@/lib/market/channel3";
import { curatedTerm, subscriptionTerms, termIsStated } from "@/lib/market/subscriptions";
import type { BillingPeriod, CommitmentTerms } from "@/lib/commitment/types";

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

/**
 * What a listing says about how long it runs, and therefore whether a schedule
 * exists at all (IPD 37–40).
 *
 * The states are deliberately not two. A listing that states no term is a price;
 * one whose term cannot be charged monthly must not be scheduled anyway; one that
 * runs until cancelled has no total; and one nobody has read yet is not the same
 * as one that says nothing.
 */
export type TermState =
  | { kind: "structured" }
  | { kind: "stated"; quote: string }
  | { kind: "unschedulable"; reason: "unit" | "cadence"; quote: string }
  | { kind: "ongoing"; quote: string }
  | { kind: "silent" }
  | { kind: "unreadable"; reason: string }
  | { kind: "notRead" };

/**
 * The same decision with the schedule's own numbers on it, while it is being
 * made. The numbers live on `terms` once resolved; `termState` says what the
 * listing said, not twice what it said.
 */
type ListingTerm =
  | { kind: "stated"; count: number; period: BillingPeriod; quote: string }
  | { kind: "unschedulable"; reason: "unit" | "cadence"; quote: string }
  | { kind: "ongoing"; quote: string }
  | { kind: "silent" }
  | { kind: "unreadable"; reason: string }
  | { kind: "notRead" };

export type ResolvedProduct = ResolvedCard & {
  /**
   * The schedule, or null when the listing states nothing that can be
   * scheduled. `termState` says which — a null is never a shape guessed in place
   * of a reading.
   */
  terms: CommitmentTerms | null;
  /** Why there is a schedule, or what the listing said instead. */
  termState: TermState;
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

export type ResolveOptions = {
  /**
   * Whether this caller may spend most of a minute on the model (ITD 34).
   *
   * The default is the cheap one — whatever is remembered, nothing more — so a
   * request that is about to move money never waits on a reading and never
   * starts one. The product page opts in, because the reading is its subject.
   */
  term?: "wait" | "remembered";
};

const FILE_TERMS = "the terms shown on this page";

/**
 * The text a listing is read from: its title and its description, joined.
 *
 * The title carries a term as often as the description does — "The Detox Box
 * 6-Month Subscription" states one in six words — so the reading gets both. It
 * is exported because the reading is remembered by this string: a caller asking
 * the same text a second question (what it costs to leave) must build the key
 * the same way, or it pays for a second model call to hear the same answer.
 */
export function listingText(record: { title: string; description: string }): string {
  return `${record.title}\n${record.description}`;
}

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
 * The term, decided once for every retail listing (ITD 34).
 *
 * The reading wins whenever it produced a fact, because it is the text in front
 * of us. The four curated entries are consulted only when no fact came back —
 * the model found nothing, or could not be reached — and only while the sentence
 * they quote is still in the live record. That is what a fixture may be: a
 * known-good reading that can stop being usable, never one that quietly becomes
 * a lie.
 */
function listingTerm(
  record: { id: string; title: string; description: string },
  finding: TermFinding | null,
): ListingTerm {
  if (finding && finding.kind !== "silent" && finding.kind !== "unreadable") {
    return finding;
  }

  const curated = curatedTerm(record.id);
  if (curated && termIsStated(record, curated)) {
    return {
      kind: "stated",
      count: curated.count,
      period: curated.period,
      quote: curated.quote,
    };
  }

  return finding ?? { kind: "notRead" };
}

/**
 * A product's terms as well — the price and the term, read from its billing
 * plan. This is what a screen that shows figures needs and a listing does not.
 */
export async function resolveProduct(
  slug: string,
  options: ResolveOptions = {},
): Promise<ResolvedProduct | null> {
  // A slug that names a retail listing is answered by the live catalogue and by
  // nothing else. Falling through to the demo file would let a real product id
  // be priced from a constant — the one mismatch this product exists to prevent.
  if (isMarketSlug(slug)) {
    const listed = await readMarketProduct(slug);
    const offer = listed ? cheapestInStock(listed.offers) : null;
    if (!listed || !offer) return null;

    const text = listingText(listed);
    const reading =
      options.term === "wait"
        ? (await readListing(text, { retries: 0 })).term
        : (peekListing(text)?.term ?? null);
    const termState = listingTerm(listed, reading);

    const card = {
      slug,
      name: listed.title,
      description: listed.description,
      descriptionLabel: "the description Channel3 lists for this product",
      listed: true,
    };
    const priceSource = `the price Channel3 lists at ${offer.domain}`;

    if (termState.kind === "stated") {
      return {
        ...card,
        terms: subscriptionTerms(offer, termState),
        termState: { kind: "stated", quote: termState.quote },
        sources: {
          paypal: null,
          published: `${priceSource} and the term the listing states (“${termState.quote}”)`,
        },
      };
    }

    if (termState.kind === "silent") {
      // No term stated anywhere in the listing: it is one charge, and the screen
      // says so on the strength of the listing rather than by default.
      return {
        ...card,
        terms: marketTerms(offer),
        termState,
        sources: { paypal: null, published: priceSource },
      };
    }

    // A stated term this product cannot schedule, a subscription with no end,
    // words nobody could read, or words nobody has read yet. There is a price
    // and there is no schedule, and every caller is told which.
    return {
      ...card,
      terms: null,
      termState,
      sources: { paypal: null, published: priceSource },
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
        termState: { kind: "structured" },
        sources: { paypal: entry.planLabel, published: null },
        descriptionLabel: "the description published with the PayPal product",
        // A billing plan states its own cycle, so no sentence of the seller's
        // produced the term and nothing is quoted for it.
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
    termState: { kind: "structured" },
    descriptionLabel: "the description shown on this page",
  };
}

/**
 * What a lookup concluded, with the three states kept apart.
 *
 * `resolveProduct` answers `null` for a slug no source knows and lets a failed
 * read throw, which is the right contract for a screen that has something else
 * to say. It is the wrong contract for a screen that has nothing else to say:
 * an uncaught throw during a render is a 500, and a 500 tells a visitor the page
 * is broken when the truth is narrower — the catalogue did not answer.
 *
 * The distinction is the one the product already draws everywhere else (IPD 26):
 * *this listing is not there* and *I could not look* are different sentences,
 * and a page that renders one of them as white space with a stack trace is
 * saying neither.
 */
export type ProductLookup =
  | { kind: "found"; product: ResolvedProduct }
  | { kind: "absent" }
  | { kind: "unreadable" };

/**
 * `resolveProduct`, with its failure turned into an answer.
 *
 * Everything the catalogue read can do wrong arrives here as one outcome: no key
 * configured, a non-OK reply, and a deadline that fired all surface as a throw
 * from `readMarketProduct`, and `readMarketProduct` has already reserved `null`
 * for the one case that is not a failure — a product id the catalogue no longer
 * lists. So `null` becomes `absent` and a throw becomes `unreadable`, without
 * this function having to know which of the three happened.
 */
export async function resolveProductOutcome(slug: string): Promise<ProductLookup> {
  try {
    const product = await resolveProduct(slug);
    return product ? { kind: "found", product } : { kind: "absent" };
  } catch (error) {
    // Logged because the operator's view of this is otherwise a page that says
    // "could not be read" for a missing key, an expired key and a dead DNS
    // alike. The visitor gets the same sentence; the log gets the reason.
    console.warn(
      `[catalogue] could not read ${slug}:`,
      error instanceof Error ? error.message : error,
    );
    return { kind: "unreadable" };
  }
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
