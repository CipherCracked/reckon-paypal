import { computeCommitment } from "@/lib/commitment/compute";
import { presentFigures } from "@/lib/commitment/present";
import { describeSchedule } from "@/lib/commitment/schedule";
import { findProduct } from "@/lib/catalog/products";
import { readProductFromPayPal } from "@/lib/paypal/catalog";
import {
  EXIT_UNREADABLE_NOTE,
  resolveExitTerm,
  type ExitOutcome,
} from "@/lib/commitment/published-exit";
import { extractTerms } from "@/lib/ai/extract-terms";
import type { CommitmentTerms } from "@/lib/commitment/types";

type RouteContext = { params: Promise<{ orderId: string }> };

type Sources = { paypal: string | null; published: string | null };

type Resolved = {
  name: string;
  description: string;
  /** How the screen names the description, when the exit figure is read from it. */
  descriptionLabel: string;
  terms: CommitmentTerms;
  sources: Sources;
};

/**
 * PayPal first, the catalogue file second, and the response says which was
 * used (ITD 17, IPD 20). The figure's provenance is part of the payload, not
 * something the screen infers, so the screen cannot claim a source the route
 * did not read.
 */
async function resolveTerms(slug: string): Promise<Resolved | null> {
  try {
    const fromPayPal = await readProductFromPayPal(slug);
    if (fromPayPal) {
      return {
        name: fromPayPal.name,
        description: fromPayPal.description,
        descriptionLabel: "the description published with the PayPal product",
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
    descriptionLabel: "the description shown on this page",
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

  const { name, description, descriptionLabel, sources } = resolved;

  // Two independent reads of the same short text. Neither can fail the screen:
  // a missing word leaves a figure absent, and a missing exit leaves the third
  // line saying why (IPD 19, ITD 18).
  const settled = await Promise.allSettled([
    resolveExitTerm(resolved.terms.exit, description, descriptionLabel),
    extractTerms({ productText: description }),
  ]);

  const exitOutcome: ExitOutcome =
    settled[0].status === "fulfilled"
      ? settled[0].value
      : { exit: { kind: "unknown" }, note: EXIT_UNREADABLE_NOTE, quoted: null };

  const terms: CommitmentTerms = { ...resolved.terms, exit: exitOutcome.exit };
  const translation = computeCommitment(terms);
  // The ordering and the arithmetic are derived here, from the same terms the
  // totals came from, so the screen never decides either.
  const figures = presentFigures(terms, translation);
  const schedule = describeSchedule(terms);

  const wording = settled[1].status === "fulfilled" ? settled[1].value : null;

  return Response.json({
    orderId,
    shape: terms.shape,
    translation,
    figures,
    schedule,
    labels: wording?.labels ?? { item: name, shipping: "Shipping", tax: "Sales tax" },
    summary: wording?.summary ?? "",
    sources,
    exitNote: exitOutcome.note,
    quotedExit: exitOutcome.quoted,
    // Only the wording is missing when the model is unavailable; the figures
    // are computed from the terms that were read and are still true.
    degraded: wording === null,
  });
}
