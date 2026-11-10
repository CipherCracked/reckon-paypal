import { computeCommitment } from "@/lib/commitment/compute";
import { presentFigures } from "@/lib/commitment/present";
import { describeSchedule } from "@/lib/commitment/schedule";
import { resolveProduct } from "@/lib/catalog/resolve";
import {
  EXIT_UNREADABLE_NOTE,
  resolveExitTerm,
  type ExitOutcome,
} from "@/lib/commitment/published-exit";
import { isMarketSlug, MARKET_EXIT_NOTE } from "@/lib/market/channel3";
import type { CommitmentTerms } from "@/lib/commitment/types";

type RouteContext = { params: Promise<{ orderId: string }> };

/**
 * The figures for one purchase, computed from the terms and nothing else.
 *
 * This route used to ask a model for a plain-language summary and for its own
 * names for the three parts. On this machine that call took about eleven
 * seconds, on the screen immediately before the money, to decorate figures the
 * server had already worked out. The figures need no model: they are arithmetic
 * over the price and the term. The plain-language sentence is the schedule,
 * which is derived from the same terms. So the model is gone from this path,
 * and with it the wait and the last thing on the screen that changed between
 * two loads of the same URL.
 *
 * The exit figure is still read from the seller's published words when the
 * terms leave it unanswered — that reading is the one place a model knows
 * something the arithmetic cannot.
 */
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

  // A retail listing's description is the manufacturer's marketing copy, not
  // terms. Reading it with a model spends ten seconds to usually hear silence,
  // and the answer is already in the shape: a listing is paid once, so there is
  // no continuing agreement to leave. The note says that, rather than naming the
  // data vendor that does not carry a column for it.
  const exitOutcome: ExitOutcome =
    slug && isMarketSlug(slug)
      ? { kind: "silent", exit: resolved.terms.exit, note: MARKET_EXIT_NOTE, quoted: null }
      : await readExit(resolved.terms.exit, description, descriptionLabel);

  const terms: CommitmentTerms = { ...resolved.terms, exit: exitOutcome.exit };
  const translation = computeCommitment(terms);
  // A real listing's missing parts are added at a checkout, and saying so is a
  // scope every shop states; a demo entry's terms are complete, so the flag
  // never reaches a figure there.
  const unstatedAt = slug && isMarketSlug(slug) ? ("checkout" as const) : null;
  // The ordering and the arithmetic are derived here, from the same terms the
  // totals came from, so the screen never decides either. The verified sentence
  // rides on the figure it produced (ITD 19), so there is no second field for a
  // screen to join back up — or to forget to.
  const figures = presentFigures(terms, translation, {
    sources: { exit: exitOutcome.quoted },
    unstatedAt,
  });
  const schedule = describeSchedule(terms, { unstatedAt });

  // The three parts have one name each, and the screen prints those names in
  // the provenance table a reader is told to rely on. A model is good at a
  // sentence and bad at a name: left to choose, it called the same item
  // "headphones" on one load and by its full title on the next, so the table
  // changed under the reader without a word of explanation. Naming a part is
  // this route's decision, not wording to be invented.
  const labels = { item: name, shipping: "Shipping", tax: "Sales tax" };

  return Response.json({
    orderId,
    shape: terms.shape,
    translation,
    figures,
    schedule,
    labels,
    // Where the parts this listing does not state are added, so the screen's
    // rows say "At checkout" rather than "Not stated" for a shop.
    unstatedAt,
    // No sequence of words is worth this screen's latency. The schedule above
    // is the plain-language sentence, and it is derived from the terms.
    summary: "",
    sources,
    exitNote: exitOutcome.note,
    // Whether the absence is the seller's or ours. The screen states it, because
    // a screen may not decide a source's silence for itself (IPD 18, IPD 19).
    exitUnreadable: exitOutcome.kind === "unreadable",
    degraded: false,
  });
}

/**
 * The exit figure, or the reason there is none. A failed read may not fail the
 * screen: a missing exit leaves the third line saying why (IPD 19, ITD 18).
 */
async function readExit(
  exit: CommitmentTerms["exit"],
  description: string,
  descriptionLabel: string,
): Promise<ExitOutcome> {
  try {
    return await resolveExitTerm(exit, description, descriptionLabel);
  } catch {
    return {
      kind: "unreadable",
      exit: { kind: "unknown" },
      note: EXIT_UNREADABLE_NOTE,
      quoted: null,
    };
  }
}
