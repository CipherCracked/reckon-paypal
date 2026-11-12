import { paypalRequest } from "./client";

/**
 * Finding a person's records without storing any (ITD 23).
 *
 * PayPal cannot be asked "what did this payer agree to". Order v2 has no list
 * endpoint, and `GET /v1/billing/subscriptions` is the *merchant's* list: it
 * filters by plan, status and date, and every item is just `{ id, status }`.
 * The payer is only on the per-id read, `subscriber.payer_id`.
 *
 * So the route from a signed-in person to their commitments is: enumerate
 * everything this merchant holds, then read each one and keep the matches. That
 * is a scan whose length is set by the merchant's history rather than by the
 * person, which is why every bound below is **visible to the page** — a scan
 * that silently stops is the same failure as an estimate.
 */

/** PayPal's maximum for this endpoint. */
export const PAGE_SIZE = 20;

/** Five pages is a hundred subscriptions: enough for a demo, and a stated limit. */
export const MAX_PAGES = 5;

/**
 * Reads in flight at once. Sandbox rate limits are unforgiving and a 429 is our
 * fault.
 *
 * Exported because the scan is not the only thing that reads one record per id:
 * the home screen renders a row per subscription it finds, and those reads are
 * bounded by the same number for the same reason. A screen that fired every id
 * at once would spend the scan's politeness on its own first render.
 */
export const READ_CONCURRENCY = 5;

/** The whole scan, not one call. A page that waits longer than this says it could not look. */
export const SCAN_DEADLINE_MS = 8_000;

export type FoundSubscription = { id: string; status: string };

export type Discovery =
  | {
      kind: "found";
      records: FoundSubscription[];
      /** How many subscriptions the scan read, matching or not. */
      scanned: number;
      /** True when the page limit was reached — the list may be incomplete. */
      stopped: boolean;
    }
  | { kind: "unavailable" };

type ListBody = { subscriptions?: Array<{ id?: string; status?: string }> };
type SubscriptionBody = { id?: string; status?: string; subscriber?: { payer_id?: string } };

async function listIds(signal: AbortSignal): Promise<{ ids: string[]; stopped: boolean }> {
  const ids: string[] = [];

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const body = await paypalRequest<ListBody>(
      `/v1/billing/subscriptions?page_size=${PAGE_SIZE}&page=${page}`,
      { method: "GET", signal },
    );

    const items = body.subscriptions ?? [];
    for (const item of items) if (item.id) ids.push(item.id);

    // A short page is the end of the list. A full one on the last allowed page
    // is not — there may be more, and the caller has to say so.
    if (items.length < PAGE_SIZE) return { ids, stopped: false };
  }

  return { ids, stopped: true };
}

/** Runs `work` over `items`, at most `limit` at a time, keeping the input order. */
export async function mapLimited<T, R>(
  items: T[],
  limit: number,
  work: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  for (let start = 0; start < items.length; start += limit) {
    const batch = items.slice(start, start + limit);
    results.push(...(await Promise.all(batch.map(work))));
  }
  return results;
}

/**
 * Every subscription this store holds for one PayPal account, as PayPal states
 * it at the moment of asking.
 *
 * `unavailable` is a claim about our own ability to look, never about the
 * person's records, and the page must not render it as "you have none"
 * (IPD 26).
 */
export async function findSubscriptionsFor(payerId: string): Promise<Discovery> {
  const signal = AbortSignal.timeout(SCAN_DEADLINE_MS);

  try {
    const { ids, stopped } = await listIds(signal);

    const reads = await mapLimited(ids, READ_CONCURRENCY, async (id) => {
      const body = await paypalRequest<SubscriptionBody>(
        `/v1/billing/subscriptions/${encodeURIComponent(id)}`,
        { method: "GET", signal },
      ).catch((error: unknown) => {
        // A record we could not read is not a match, but it is also not proof of
        // absence. It is dropped from the list and counted in `scanned`. Bad
        // credentials are the exception: they fail the whole scan, because a
        // scan that could not authenticate learned nothing about anyone.
        if ((error as { status?: unknown } | null)?.status === 401) throw error;
        return null;
      });

      if (!body || body.subscriber?.payer_id !== payerId) return null;
      return { id, status: body.status ?? "UNKNOWN" } satisfies FoundSubscription;
    });

    return {
      kind: "found",
      records: reads.filter((record): record is FoundSubscription => record !== null),
      scanned: ids.length,
      stopped,
    };
  } catch {
    // Credentials wrong, PayPal unreachable, or the scan outlived its budget.
    // All three are "we could not look", and none of them is "you have none".
    return { kind: "unavailable" };
  }
}
