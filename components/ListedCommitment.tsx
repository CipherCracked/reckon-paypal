import Link from "next/link";
import { CommitmentView } from "@/components/CommitmentView";
import { listingText, resolveProduct } from "@/lib/catalog/resolve";
import { computeCommitment } from "@/lib/commitment/compute";
import { presentFigures } from "@/lib/commitment/present";
import {
  EXIT_UNREADABLE_NOTE,
  resolveExitTerm,
  type ExitOutcome,
} from "@/lib/commitment/published-exit";
import { describeSchedule } from "@/lib/commitment/schedule";
import { absentFigureNote, describeSources } from "@/lib/commitment/sources";
import type { CommitmentTerms } from "@/lib/commitment/types";
import { MODEL_READ_DEADLINE_MS, withBudget } from "@/lib/deadline";
import { MARKET_EXIT_NOTE, type MarketOffer } from "@/lib/market/channel3";
import { formatMoney } from "@/lib/money";

/**
 * What a real listing is, once its own words have been read (IPD 37–40).
 *
 * The panel is one of five things and says which. A listing that states a term
 * in months gets the three figures and the way to agree to them; a listing whose
 * term this money path cannot express, and a listing that repeats with no end,
 * get a sentence and no way to agree — because a plan built for them would be a
 * plan the shopper was never shown. A listing that states nothing is paid once,
 * and that sentence is now a finding rather than a default. A listing nobody
 * could read says so and offers to try again.
 *
 * The route handlers say the same five things in their own words
 * (`lib/catalog/term-state.ts`). They are not the same sentences because they are
 * about different acts: a route is refusing to start a purchase, this panel is
 * telling a shopper what the page found.
 *
 * The whole read carries `MODEL_ANSWER_DEADLINE_MS` rather than the three-second
 * budget a decorative figure gets: on this page the reading *is* the subject, and
 * the wait is shown rather than hidden (IPD 39).
 */

export type ListedCommitmentProps = {
  slug: string;
  /** The in-stock offer the page already found; its price is the only figure left unscheduled. */
  offer: MarketOffer;
};

/** The panel's own sentence for a term nobody could read. */
const COULD_NOT_READ =
  "We could not read the listing's words just now, so this page cannot say what agreeing to it would cost.";

/**
 * Where the figures will go, while they are being worked out (IPD 39).
 *
 * It says whose words are being read, because the reading is the work: a
 * spinner would hide the one moment a model does something a script could not,
 * and a person who waits most of a minute deserves to know what they waited for.
 */
export function ReadingWords() {
  return (
    <section className="commitment commitment-reading" aria-live="polite" aria-busy="true">
      <h2>What this commitment asks of you</h2>
      <p className="commitment-schedule">
        Reading this listing&apos;s words for its term — the figures appear here when it answers.
      </p>
    </section>
  );
}

/**
 * The cost to leave, read from the same text the term was read from.
 *
 * The text is built the same way the resolver built it, so this is the reading
 * already in hand rather than a second model call: one wait answers both
 * questions, and a listing whose words failed once is not asked again.
 */
async function withExit(
  terms: CommitmentTerms,
  resolved: { description: string; descriptionLabel: string; name: string },
): Promise<ExitOutcome> {
  const unreadable: ExitOutcome = {
    kind: "unreadable",
    exit: { kind: "unknown" },
    note: EXIT_UNREADABLE_NOTE,
    quoted: null,
  };

  try {
    return await withBudget(
      resolveExitTerm(
        terms.exit,
        listingText({ title: resolved.name, description: resolved.description }),
        resolved.descriptionLabel,
        { retries: 0 },
      ),
      MODEL_READ_DEADLINE_MS,
      unreadable,
    );
  } catch {
    return unreadable;
  }
}

/** The figures, the merchant's sentence under the total, and the way to agree. */
function Scheduled({
  slug,
  terms,
  quote,
  offer,
}: {
  slug: string;
  terms: CommitmentTerms;
  quote: string | null;
  offer: MarketOffer;
}) {
  const translation = computeCommitment(terms);
  const figures = presentFigures(terms, translation, {
    sources: {
      acrossTerm: quote ? { label: "the term the listing states", span: quote } : null,
      exit: null,
    },
    unstatedAt: "checkout",
  });

  return (
    <>
      <CommitmentView
        figures={figures}
        breakdown={translation.breakdown}
        labels={{ item: "The listed price", shipping: "Shipping", tax: "Sales tax" }}
        summary=""
        schedule={describeSchedule(terms, { unstatedAt: "checkout" })}
        unstatedAt="checkout"
        sourceNote={describeSources({
          published: quote
            ? `the price ${offer.domain} lists and the term the listing states (“${quote}”)`
            : `the price ${offer.domain} lists`,
          absent: absentFigureNote(figures),
        })}
      />

      {/* Why there is nothing to pay to leave, when the listing's own words said
          nothing about a term. It used to ride on the figure's note, which only
          renders when a figure has no amount — and a one-time purchase's cost to
          leave is $0.00, a fact rather than an absence — so the sentence the
          reading earned was never shown. It is a statement about the purchase,
          so it belongs in the page's standing line (IPD 40). */}
      {terms.shape === "one_time" ? (
        <p className="market-standing">{MARKET_EXIT_NOTE}</p>
      ) : null}

      <p className="market-buy-note">
        The check uses the cheapest in-stock offer: {formatMoney(offer.price)} at {offer.domain}. If
        that offer leaves the catalogue, this page says so rather than charging a price nobody is
        offering.
      </p>

      <Link className="button-primary" href={`/consent/pending?slug=${encodeURIComponent(slug)}`}>
        Check this commitment
      </Link>
    </>
  );
}

/**
 * The two listings with a price and no total.
 *
 * Neither is a one-time purchase — the merchant described a schedule, and this
 * page cannot end it — so neither gets the button. A plan built from here would
 * charge a schedule nobody was shown.
 */
function NoTotal({ offer, sentence }: { offer: MarketOffer; sentence: string }) {
  return (
    <section className="market-no-total" aria-labelledby="no-total-heading">
      <h2 id="no-total-heading">What this listing says</h2>
      <p className="notice" role="status">
        {sentence}
      </p>

      {/* The one figure that survives: what it charges, in the merchant's price.
          The total is the figure this listing does not have, not every figure. */}
      <dl className="commitment-figures">
        <div className="commitment-figure" data-figure="today">
          <dt>Charged today</dt>
          <dd>{formatMoney(offer.price)}</dd>
        </div>
      </dl>

      <p className="commitment-source">
        {describeSources({ published: `the price ${offer.domain} lists` })} Nothing has been
        charged.
      </p>
    </section>
  );
}

/** The panel. `ReadingWords` is its fallback while the reading is in flight. */
export async function ListedCommitment({ slug, offer }: ListedCommitmentProps) {
  const resolved = await resolveProduct(slug, { term: "wait" });
  if (!resolved) return null;

  const { termState, terms } = resolved;

  if (terms && (termState.kind === "stated" || termState.kind === "silent")) {
    const exitOutcome = await withExit(terms, resolved);
    return (
      <Scheduled
        slug={slug}
        terms={{ ...terms, exit: exitOutcome.exit }}
        quote={termState.kind === "stated" ? termState.quote : null}
        offer={offer}
      />
    );
  }

  if (termState.kind === "unschedulable") {
    return (
      <NoTotal
        offer={offer}
        sentence={
          termState.reason === "cadence"
            ? `The listing says “${termState.quote}”, but its charges are not monthly and this page can only total monthly charges. There is no total here — only what it charges today.`
            : `The listing says “${termState.quote}”, and this page can only total a term written in months. There is no total here — only what it charges today.`
        }
      />
    );
  }

  if (termState.kind === "ongoing") {
    return (
      <NoTotal
        offer={offer}
        sentence={`The listing says “${termState.quote}”. It repeats for as long as you keep it, and nothing here says when it stops — so there is no total, only what it charges today.`}
      />
    );
  }

  // Unreadable, or (defensively) not read at all: the same absence to a shopper,
  // and the same way out of it. The retry is a real link, so the page renders
  // again and the reading is attempted again — a cache is not consulted for a
  // failure, so a retry is not the same answer.
  return (
    <section className="market-unread" aria-labelledby="unread-heading">
      <h2 id="unread-heading">What this listing says</h2>
      <p className="notice" role="status">
        {COULD_NOT_READ}
      </p>
      <Link className="button-secondary" href={`/product/${encodeURIComponent(slug)}`}>
        Try again
      </Link>
    </section>
  );
}
