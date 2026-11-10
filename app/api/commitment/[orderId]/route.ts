import { computeCommitment } from "@/lib/commitment/compute";
import { presentFigures } from "@/lib/commitment/present";
import { describeSchedule } from "@/lib/commitment/schedule";
import { resolveProduct } from "@/lib/catalog/resolve";
import {
  EXIT_UNREADABLE_NOTE,
  resolveExitTerm,
  type ExitOutcome,
} from "@/lib/commitment/published-exit";
import { extractTerms } from "@/lib/ai/extract-terms";
import type { CommitmentTerms } from "@/lib/commitment/types";

type RouteContext = { params: Promise<{ orderId: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { orderId } = await context.params;
  const slug = new URL(request.url).searchParams.get("slug");

  // One resolver for every screen (IPD 20). The figure's provenance is part of
  // the payload, not something the screen infers, so the screen cannot claim a
  // source the route did not read.
  const resolved = slug ? await resolveProduct(slug) : null;

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
      : {
          kind: "unreadable",
          exit: { kind: "unknown" },
          note: EXIT_UNREADABLE_NOTE,
          quoted: null,
        };

  const terms: CommitmentTerms = { ...resolved.terms, exit: exitOutcome.exit };
  const translation = computeCommitment(terms);
  // The ordering and the arithmetic are derived here, from the same terms the
  // totals came from, so the screen never decides either. The verified sentence
  // rides on the figure it produced (ITD 19), so there is no second field for a
  // screen to join back up — or to forget to.
  const figures = presentFigures(terms, translation, { sources: { exit: exitOutcome.quoted } });
  const schedule = describeSchedule(terms);

  const wording = settled[1].status === "fulfilled" ? settled[1].value : null;

  // A label the model left blank is a label the screen cannot print, so each
  // part falls back on its own: a blank item label does not cost the shipping
  // one, and an unreadable model does not cost the product its name.
  const fallbackLabels = { item: name, shipping: "Shipping", tax: "Sales tax" };
  const labels = {
    item: wording?.labels.item || fallbackLabels.item,
    shipping: wording?.labels.shipping || fallbackLabels.shipping,
    tax: wording?.labels.tax || fallbackLabels.tax,
  };

  return Response.json({
    orderId,
    shape: terms.shape,
    translation,
    figures,
    schedule,
    labels,
    summary: wording?.summary ?? "",
    sources,
    exitNote: exitOutcome.note,
    // Whether the absence is the seller's or ours. The screen states it, because
    // a screen may not decide a source's silence for itself (IPD 18, IPD 19).
    exitUnreadable: exitOutcome.kind === "unreadable",
    // Only the wording is missing when the model is unavailable; the figures
    // are computed from the terms that were read and are still true.
    degraded: wording === null,
  });
}
