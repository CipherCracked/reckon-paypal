import { notFound } from "next/navigation";
import Link from "next/link";
import { BackLink } from "@/components/BackLink";
import { MarketProduct } from "@/components/MarketProduct";
import { ProductScreen } from "@/components/ProductScreen";
import { resolveProduct } from "@/lib/catalog/resolve";
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
import { isMarketSlug, readMarketProduct } from "@/lib/market/channel3";

type PageProps = { params: Promise<{ slug: string }> };

export const dynamic = "force-dynamic";

/**
 * Two kinds of product, resolved by two different rules.
 *
 * A `ch3-` slug names a real retail listing and is read from the live
 * catalogue; any other slug is one of the demo entries, read from PayPal's
 * catalogue when it answers and from the file when it does not (IPD 20). The
 * prefix keeps the two from ever answering for each other.
 */
export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;

  if (isMarketSlug(slug)) {
    let product;
    try {
      product = await readMarketProduct(slug);
    } catch {
      return (
        <div className="page">
          <BackLink href="/shop">Back to the search</BackLink>
          <header className="page-header">
            <p className="eyebrow">A real listing</p>
            <h1>This product could not be read</h1>
          </header>
          <p className="notice" role="status">
            The live catalogue did not answer just now, so there is no price to show. Nothing is
            invented to fill the gap.
          </p>
          <Link className="button-secondary" href={`/product/${encodeURIComponent(slug)}`}>
            Try again
          </Link>
        </div>
      );
    }

    if (!product) notFound();

    return (
      <div className="page">
        <BackLink href="/shop">Back to the search</BackLink>
        <MarketProduct product={product} slug={slug} />
      </div>
    );
  }

  const product = await resolveProduct(slug);

  if (!product) {
    notFound();
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
    <div className="page">
      <BackLink href="/">Back to the ways in</BackLink>

      <ProductScreen
        slug={product.slug}
        name={product.name}
        description={product.description}
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
    </div>
  );
}
