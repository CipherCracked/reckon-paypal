/**
 * A budget for work done while a page is being built.
 *
 * A page may not wait for a third party longer than the fallback would have
 * cost, so every read that decorates a render carries one of these. The
 * fallback is always a statement of what could not be read — never a figure.
 */

/**
 * How long a read made during a page render may take. Past this the caller has
 * waited longer than the fallback would have cost, so the fallback is the better
 * answer.
 */
export const READ_DEADLINE_MS = 2_000;

/**
 * How long a read may take when the page is *about* the thing being read.
 *
 * `READ_DEADLINE_MS` fits a read that decorates a render: a product card PayPal
 * does not answer for still has the catalogue file behind it. A receipt, a bill
 * or a subscription page has no second source — giving up after two seconds
 * shows the visitor an error where a slower, correct answer was available. A
 * cold serverless start can spend longer than that before the first byte, so
 * these reads get a deadline a reader will wait through.
 */
export const DETAIL_READ_DEADLINE_MS = 8_000;

/**
 * How long the catalogue may take to resolve a product URL.
 *
 * A lookup is the one catalogue call whose latency belongs to the retailer, not
 * to the catalogue: a URL it has never met means fetching that shop's page.
 * Measured on 2026-11-12, twice each — 3.4 s for a product page, 7 s and 13.5 s
 * for pages that turned out not to be product pages. The detail deadline
 * reported those as no answer at all, and the shopper was told to try again
 * about a link that was about to say exactly what was wrong with it. Twenty
 * seconds covers the measured worst case; a lookup is the slowest thing this
 * product asks anyone to wait for, and it is asked only of a person who pasted
 * an address and pressed a button.
 */
export const LOOKUP_DEADLINE_MS = 20_000;

/**
 * How long a model read may hold a page render.
 *
 * The model is much slower than PayPal's reads — measured at roughly 47 seconds
 * for one short description on a free endpoint — so waiting for it is not an
 * option. The sellers' texts are read before they are needed
 * (`warmPublishedExits`) and every reading is remembered, so the common case is
 * a cache hit; a page that finds the cache cold gives up quickly rather than
 * holding the reader most of a minute.
 */
export const MODEL_READ_DEADLINE_MS = 3_000;

/**
 * How long the reader page waits for a model to read a pasted document.
 *
 * That read is the page's whole purpose, so it gets longer than a render does —
 * but it does get one. A model endpoint that had stopped answering took two and
 * a half minutes to say so, and the visitor spent all of it on a button reading
 * "Reading…" with no way to tell a slow read from a dead one. A minute is six
 * times the slowest good reading measured here: long enough that a working model
 * always finishes, short enough that a broken one is over.
 */
export const MODEL_ANSWER_DEADLINE_MS = 60_000;

/**
 * Gives a read a deadline, and applies it to the token handshake too: a read is
 * two requests in sequence, so a budget on the second one alone would be a lie.
 */
export async function withinDeadline<T>(
  read: (signal: AbortSignal) => Promise<T>,
  ms: number = READ_DEADLINE_MS,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await read(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Waits for a promise, but not longer than `ms`.
 *
 * Unlike `withinDeadline` this does not cancel the work: a model reading is
 * expensive and its result is worth keeping, so the call is allowed to finish
 * and remember its answer for the next render. Only this caller stops waiting.
 */
export function withBudget<T>(work: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    work
      .then(resolve, () => resolve(fallback))
      .finally(() => clearTimeout(timer));
  });
}
