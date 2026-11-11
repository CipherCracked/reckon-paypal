import { cookies } from "next/headers";
import Link from "next/link";
import { CommitmentView } from "@/components/CommitmentView";
import { MarketSearch } from "@/components/MarketSearch";
import { Page } from "@/components/Page";
import { RecordHome } from "@/components/RecordHome";
import { SignInCard } from "@/components/SignInCard";
import { resolveProduct } from "@/lib/catalog/resolve";
import { computeCommitment } from "@/lib/commitment/compute";
import { presentFigures } from "@/lib/commitment/present";
import {
  EXIT_UNREADABLE_NOTE,
  resolveExitTerm,
  type ExitOutcome,
} from "@/lib/commitment/published-exit";
import { describeSchedule } from "@/lib/commitment/schedule";
import { absentFigureNote, describeSources } from "@/lib/commitment/sources";
import { MODEL_READ_DEADLINE_MS, withBudget } from "@/lib/deadline";
import { identityConfigured } from "@/lib/paypal/identity";
import { SESSION_COOKIE, readSession, signInConfigured } from "@/lib/session";

/** The catalogue is read per request, so the front door reflects PayPal rather than a build. */
export const dynamic = "force-dynamic";

/**
 * The sentence that says what the two columns are to each other (IPD 21 §4).
 *
 * It is derived from what actually happened rather than written once and hoped
 * for: the only figure read out of the seller's words is the cost to leave, the
 * other two are arithmetic over the price, and when the reading found nothing
 * the line says that instead of claiming a quote the screen does not show.
 */
function relationshipSentence(outcome: ExitOutcome): string {
  switch (outcome.kind) {
    case "stated":
      return "Cost to leave was read out of the seller's own words above — the reader copies the sentence and this page checks it against the text. The other two figures are arithmetic over the price the seller states, and the line under them says which source that price came from.";
    case "silent":
      return "The seller's words above say nothing about leaving, so the cost to leave reads Not stated rather than a number this page would have had to invent. The other two figures are arithmetic over the price the seller states.";
    case "unreadable":
      return "The seller's words above could not be read just now, so the cost to leave is not shown. A figure is never filled in from a guess.";
  }
}

/**
 * The home screen, in two states (IPD 28).
 *
 * Signed out it is the product's argument: one real commitment worked through,
 * with the seller's own words beside the three figures, and then the two things
 * a person came here to do — see what they have already agreed to, and check
 * something new.
 *
 * Signed in it is the person's own record: what this store holds under their
 * PayPal account, then the same search. One address, one frame, one nav — a
 * person who has an account here is not sent to a second product.
 *
 * The proof is not shown to a signed-in visitor. It was the thing a returning
 * shopper had to scroll past to reach their own business, which is the complaint
 * this decision exists to answer; the link under the search keeps it one click
 * away for anyone who wants to see how a check works.
 */
export default async function Home() {
  const person = readSession((await cookies()).get(SESSION_COOKIE)?.value);

  // The branch is awaited rather than returned as an element: both halves are
  // async, and awaiting here is what makes the page's whole tree come back from
  // `Home()`. A page that only points at another async component cannot be
  // rendered outside the server, which would put the front door's own tests out
  // of reach.
  if (person) return RecordHome({ person });
  return ProofHome({ canSignIn: identityConfigured() && signInConfigured() });
}

/**
 * The entry states the product, then proves it on one real commitment before
 * asking anything (IPD 14).
 *
 * The worked commitment is read the same way every other screen reads one —
 * PayPal first, the catalogue file second (IPD 20) — so the front door cannot
 * be the one surface that quietly disagrees with the consent screen. No PayPal
 * object is created by a visit (ITD 16); a read creates nothing, and the
 * screen says so.
 *
 * Since IPD 21 it also shows the work: the seller's own words on the left, the
 * figures and the sentence behind each on the right, so the transformation the
 * product exists for is visible without a click.
 */
async function ProofHome({ canSignIn }: { canSignIn: boolean }) {
  // The worked subscription is a real listing, read live like every other real
  // product. Its price moves, and a hardcoded one would be the invented figure
  // this entry exists to replace.
  const subscription = await resolveProduct("ch3-YyLUjLT");

  // The third figure is the seller's, so it is read from the seller's words
  // whenever the terms left it unanswered (IPD 19) — the same rule as consent.
  //
  // That reading is a model call, and the model is slow: the sellers' texts are
  // read at start-up, so this is normally a cache hit. When it is not, the front
  // door gives the reading the same budget the bill does rather than holding a
  // visitor for most of a minute — a front door that takes 47 seconds is not a
  // front door (IPD 21).
  //
  // A listing that has gone from the catalogue leaves the entry with nothing
  // honest to work through. It says so below rather than falling back to a
  // figure from the file, which would be about a different product.
  const exitOutcome = subscription
    ? await withBudget(
        resolveExitTerm(
          subscription.terms.exit,
          subscription.description,
          subscription.descriptionLabel,
          { retries: 0 },
        ),
        MODEL_READ_DEADLINE_MS,
        {
          kind: "unreadable",
          exit: { kind: "unknown" },
          note: EXIT_UNREADABLE_NOTE,
          quoted: null,
        } satisfies ExitOutcome,
      )
    : null;
  const terms = subscription && exitOutcome
    ? { ...subscription.terms, exit: exitOutcome.exit }
    : null;

  const translation = terms ? computeCommitment(terms) : null;
  // The seller's sentence and the figure it produced travel together, so the
  // entry can put them side by side without joining anything up itself (ITD 19).
  const figures =
    terms && translation
      ? presentFigures(terms, translation, { sources: { exit: exitOutcome?.quoted ?? null } })
      : null;

  return (
    <Page
      title="What it costs, before you agree to it"
      lede="Three figures for any commitment — what it costs across the whole term, what it costs to leave, and what is charged today — each with the words it was worked out from. Built for adults who find billing language hard, including people with dyscalculia, ADHD and dyslexia."
    >
      {subscription && exitOutcome && terms && translation && figures ? (
        <section className="entry-worked" aria-labelledby="worked-heading">
          <h2 id="worked-heading" className="eyebrow">
            {subscription.name} — one commitment, worked through
          </h2>

          <div className="entry-pair">
            <section className="entry-said" aria-labelledby="said-heading">
              <h2 id="said-heading">What the seller wrote</h2>
              {subscription.description ? (
                // The shop's own copy, unedited and attributed. Never restyled into
                // our voice, because it is evidence, not a summary (IPD 21).
                <blockquote className="entry-words">{subscription.description}</blockquote>
              ) : (
                <p className="entry-words entry-words-absent">
                  This listing has no description, so this screen has no words of the
                  seller&apos;s to quote. The figures beside it come from the price and term the
                  listing states.
                </p>
              )}

              {/* The sentence that says what the two columns are to each other
                  sits under the column it is about, rather than full width below
                  both: it is the reading of these words, and the pair reads as a
                  pair when each side carries its own part. */}
              <p className="entry-relationship" data-entry-relationship={exitOutcome.kind}>
                {relationshipSentence(exitOutcome)}
              </p>

              {/* The next step sits under the reading it follows from, rather
                  than below both columns where it belonged to neither. */}
              <Link className="button-primary entry-action" href={`/product/${subscription.slug}`}>
                Check this commitment
              </Link>
            </section>

            <CommitmentView
              figures={figures}
              breakdown={translation.breakdown}
              labels={{ item: "Each delivery", shipping: "Shipping", tax: "Sales tax" }}
              // No summary here: the seller's sentence is already in the column
              // beside this one, and repeating it word for word made the plain
              // version look identical to the version it exists to explain.
              summary=""
              schedule={describeSchedule(terms)}
              figureNotes={exitOutcome.note ? { exit: exitOutcome.note } : undefined}
              sourceNote={`${describeSources({
                paypal: subscription.sources.paypal,
                published: subscription.sources.published,
                // Only a seller's silence is theirs to report; a read that failed
                // is ours, and the line says which (IPD 19).
                absent: exitOutcome.kind === "unreadable" ? null : absentFigureNote(figures),
                unreadable: exitOutcome.kind === "unreadable" ? "what it costs to leave" : null,
              })} Nothing has been charged and nothing has been created at PayPal.`}
            />
          </div>
        </section>
      ) : (
        <p className="notice" role="status">
          The live subscription listing this screen works through could not be read just now, so
          there is no commitment to show. Nothing is invented to fill the gap — search the shop for
          a real listing in the meantime.
        </p>
      )}

      {/* The two things a person comes here to do, in the order they matter to
          someone deciding whether to trust the page: their own business first
          if they have any, then something new (IPD 28). */}
      <section className="front-doors" aria-labelledby="doors-heading">
        <h2 id="doors-heading" className="eyebrow">
          Where to go from here
        </h2>

        {canSignIn ? <SignInCard /> : null}

        <section aria-labelledby="check-heading" className="check-card">
          <h2 id="check-heading">Check something new</h2>
          <p>
            Any product you are about to buy, and any document someone has sent you, works the same
            way: the seller&apos;s words, then the three figures.
          </p>
          <MarketSearch inputId="home-q" />
          <p className="scope-note">
            <Link href="/read">Or paste a document someone sent you</Link> — a bill, a contract, a
            renewal notice.
          </p>
        </section>
      </section>
    </Page>
  );
}
