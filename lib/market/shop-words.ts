/**
 * The sentences the shop's screens say about the catalogue itself.
 *
 * Two screens now show live catalogue listings — the shop and the shelf of
 * things that repeat — and a missing key must not be explained one way on one
 * and another way on the other. The screen-specific sentences stay where they
 * are; only the ones about the catalogue's own state live here.
 */

/** The catalogue was asked and did not answer. */
export const UNREACHABLE =
  "The live product catalogue could not be reached just now. Try again in a moment.";

/** There was nothing to ask: no key on this deployment. */
export const NO_KEY =
  "This deployment has no product catalogue key configured, so there is nothing live to show. See the README for the one variable it needs.";

/** Where every price, photo and link on a catalogue screen came from. */
export const SOURCING =
  "Prices, photos and retailer links are the retailers' own, read live when this page opened.";

/**
 * Which of the two failures a catalogue screen is looking at.
 *
 * The reachability of the catalogue is the only fact either sentence needs, and
 * the key's presence is the one thing that decides it: a configured key says the
 * catalogue was asked and failed, an absent one says it was never asked.
 */
export function catalogueFailure(): string {
  return process.env.CHANNEL3_API_KEY?.trim() ? UNREACHABLE : NO_KEY;
}
