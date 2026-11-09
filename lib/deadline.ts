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
