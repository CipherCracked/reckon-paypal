import { computeCommitment } from "@/lib/commitment/compute";
import { presentFigures } from "@/lib/commitment/present";
import { describeSchedule } from "@/lib/commitment/schedule";
import { findProduct } from "@/lib/catalog/products";
import { readProductFromPayPal } from "@/lib/paypal/catalog";
import { extractTerms } from "@/lib/ai/extract-terms";
import type { CommitmentTerms } from "@/lib/commitment/types";

type RouteContext = { params: Promise<{ orderId: string }> };

type Sources = { paypal: string | null; published: string | null };

/**
 * PayPal first, the catalogue file second, and the response says which was
 * used (ITD 17, IPD 20). The figure's provenance is part of the payload, not
 * something the screen infers, so the screen cannot claim a source the route
 * did not read.
 */
async function resolveTerms(slug: string): Promise<
  { name: string; description: string; terms: CommitmentTerms; sources: Sources } | null
> {
  try {
    const fromPayPal = await readProductFromPayPal(slug);
    if (fromPayPal) {
      return {
        name: fromPayPal.name,
        description: fromPayPal.description,
        terms: fromPayPal.terms,
        sources: { paypal: fromPayPal.planLabel, published: null },
      };
    }
  } catch {
    // PayPal unreachable or unconfigured is not a failure of the screen: the
    // published terms still produce every figure, and the line says so.
  }

  const product = findProduct(slug);
  if (!product) return null;

  return {
    name: product.name,
    description: product.description,
    terms: product.terms,
    sources: { paypal: null, published: "the terms shown on this page" },
  };
}

export async function GET(request: Request, context: RouteContext) {
  const { orderId } = await context.params;
  const slug = new URL(request.url).searchParams.get("slug");

  const resolved = slug ? await resolveTerms(slug) : null;

  if (!resolved) {
    return Response.json({ error: "Unknown product for this order." }, { status: 404 });
  }

  const { name, description, terms, sources } = resolved;

  const translation = computeCommitment(terms);
  // The ordering and the arithmetic are derived here, from the same terms the
  // totals came from, so the screen never decides either.
  const figures = presentFigures(terms, translation);
  const schedule = describeSchedule(terms);

  try {
    const summary = await extractTerms({ productText: description });
    return Response.json({
      orderId,
      shape: terms.shape,
      translation,
      figures,
      schedule,
      labels: summary.labels,
      summary: summary.summary,
      sources,
      degraded: false,
    });
  } catch {
    // The figures are computed from the terms that were read, so they are still
    // true when the model is unavailable. Only the wording is missing, and the
    // page says so rather than leaving a gap.
    return Response.json({
      orderId,
      shape: terms.shape,
      translation,
      figures,
      schedule,
      labels: { item: name, shipping: "Shipping", tax: "Sales tax" },
      summary: "",
      sources,
      degraded: true,
    });
  }
}
