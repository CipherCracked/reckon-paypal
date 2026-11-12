import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ListedCommitment, ReadingWords } from "@/components/ListedCommitment";
import { MarketProduct } from "@/components/MarketProduct";
import { Page } from "@/components/Page";
import { ProductScreen } from "@/components/ProductScreen";
import { resolveProduct } from "@/lib/catalog/resolve";
import { noScheduleSentence } from "@/lib/catalog/term-state";
import { computeCommitment } from "@/lib/commitment/compute";
import { presentFigures } from "@/lib/commitment/present";
import { describeSchedule } from "@/lib/commitment/schedule";
import {
  EXIT_UNREADABLE_NOTE,
  resolveExitTerm,
  type ExitOutcome,
} from "@/lib/commitment/published-exit";
import { absentFigureNote, describeSources } from "@/lib/commitment/sources";
import { MODEL_READ_DEADLINE_MS, withBudget } from "@/lib/deadline";
import { cheapestInStock, isMarketSlug, readMarketProduct } from "@/lib/market/channel3";

type PageProps = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

/**
 * Two kinds of product, resolved by two different rules.
 *
 * A `ch3-` slug names a real retail listing and is read from the live
 * catalogue; any other slug is one of the demo entries, read from PayPal's
 * catalogue when it answers and from the file when it does not (IPD 20). The
 * prefix keeps the two from ever answering for each other.
 *
 * A listing's shape is read from its own words (IPD 37). The catalogue answers
 * first — the name, the photograph, the offers — because that half of the page
 * is a few hundred milliseconds' work and the reading is not; the commitment
 * streams in underneath it, in a boundary that says whose words are being read
 * (IPD 39), and lands in one of five states (IPD 40).
 */
export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;

  if (isMarketSlug(slug)) {
    let product;
    try {
      product = await readMarketProduct(slug);
    } catch {
      return (
        <Page back={{ href: "/shop", label: "Back to the shop" }}>
          <header className="page-header">
            <p className="eyebrow">A real listing</p>
            <h1>This product could not be read</h1>
          </header>
          <p className="notice" role="status">
            The live catalogue did not answer just now, so there is no price to show.
          </p>
          <Link className="button-secondary" href={`/product/${encodeURIComponent(slug)}`}>
            Try again
          </Link>
        </Page>
      );
    }

    if (!product) notFound();

    // One offer is enough to have a price; the panel decides whether that price
    // has a term. Nothing about the shape is read here (IPD 40).
    const offer = cheapestInStock(product.offers);

    return (
      <Page back={{ href: "/shop", label: "Back to the shop" }}>
        <MarketProduct product={product}>
          {offer ? (
            <Suspense fallback={<ReadingWords />}>
              <ListedCommitment slug={slug} offer={offer} />
            </Suspense>
          ) : (
            <p className="notice" role="status">
              The catalogue lists this product with no offer anyone can buy right now, so there is
              no price to show.
            </p>
          )}
        </MarketProduct>
      </Page>
    );
  }

  const product = await resolveProduct(slug);

  if (!product) {
    notFound();
  }

  // A demo entry always has terms — they are a file or a billing plan, not a
  // reading — so this is a guard rather than a state. It refuses in words rather
  // than rendering figures from terms that are not there.
  if (!product.terms) {
    return (
      <Page back={{ href: "/", label: "Back to the start" }}>
        <header className="page-header">
          <p className="eyebrow">Product</p>
          <h1>{product.name}</h1>
        </header>
        <p className="notice" role="status">
          {noScheduleSentence(product.termState)}
        </p>
      </Page>
    );
  }

  // The figures belong on this page too. The home page works the subscription
  // through in full and then the button led to a screen with a name, a
  // sentence and no number at all — the one commitment the visitor had just
  // been shown, stripped of its figures one click before the money.
  //
  // The third figure is read exactly as the consent screen reads it, so the two
  // screens cannot disagree about what leaving costs.
  const exitOutcome = await withBudget(
    resolveExitTerm(product.terms.exit, product.description, product.descriptionLabel, {
      retries: 0,
    }),
    MODEL_READ_DEADLINE_MS,
    {
      kind: "unreadable",
      exit: { kind: "unknown" },
      note: EXIT_UNREADABLE_NOTE,
      quoted: null,
    } satisfies ExitOutcome,
  );
  const terms = { ...product.terms, exit: exitOutcome.exit };
  const translation = computeCommitment(terms);
  const figures = presentFigures(terms, translation, { sources: { exit: exitOutcome.quoted } });

  return (
    <Page back={{ href: "/", label: "Back to the start" }}>
      <ProductScreen
        slug={product.slug}
        name={product.name}
        description={product.description}
        quoteSpans={[exitOutcome.quoted?.span]}
        figures={figures}
        breakdown={translation.breakdown}
        schedule={describeSchedule(terms)}
        exitNote={exitOutcome.note}
        sourceNote={describeSources({
          paypal: product.sources.paypal,
          published: product.sources.published,
          absent: exitOutcome.kind === "unreadable" ? null : absentFigureNote(figures),
          unreadable: exitOutcome.kind === "unreadable" ? "what it costs to leave" : null,
        })}
      />
    </Page>
  );
}
