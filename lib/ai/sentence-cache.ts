import type { PlainWordsFacts } from "@/lib/commitment/taken";

/**
 * The sentences the model has written about a record, keyed by the facts they
 * were written from (ITD 38).
 *
 * The record changes only when a payment lands, so the facts are the whole of
 * the state a sentence depends on: a new payment changes the key and earns a
 * new sentence, and a second view of the same state costs nothing. Only
 * successful sentences are kept — a refusal or a timeout is a fact about one
 * attempt, and remembering it would keep the answer a reader did not get.
 *
 * In-flight calls are shared too: a client component's effect runs twice in
 * development, and neither run should pay for a model call.
 *
 * The map lives on `globalThis` for the same reason the other caches do — Next
 * compiles route handlers and pages separately, and a module-level map would be
 * one per bundle.
 */

type Entry = { sentence: string; at: number };

type Store = {
  entries: Map<string, Entry>;
  inFlight: Map<string, Promise<string | null>>;
};

const store = globalThis as unknown as { __recordSentences?: Store };
const cache: Store = (store.__recordSentences ??= { entries: new Map(), inFlight: new Map() });

/** Long enough that a state a demo revisits stays warm, short enough to forget. */
const MAX_AGE_MS = 60 * 60 * 1000;

/** A demo's records, not a service's. The oldest key goes first. */
const MAX_ENTRIES = 200;

/** Test hook: the cache is module state, like the PayPal token cache. */
export function clearSentenceCache(): void {
  cache.entries.clear();
  cache.inFlight.clear();
}

export function sentenceKey(id: string, facts: PlainWordsFacts): string {
  return [
    id,
    facts.count,
    facts.taken.minor,
    facts.termCount,
    facts.acrossTerm.minor,
    facts.stillToCome.minor,
  ].join("|");
}

export function readSentence(key: string): string | null {
  const entry = cache.entries.get(key);
  if (!entry) return null;

  if (Date.now() - entry.at > MAX_AGE_MS) {
    cache.entries.delete(key);
    return null;
  }

  return entry.sentence;
}

export function rememberSentence(key: string, sentence: string): void {
  cache.entries.delete(key);
  cache.entries.set(key, { sentence, at: Date.now() });

  while (cache.entries.size > MAX_ENTRIES) {
    const oldest = cache.entries.keys().next().value;
    if (oldest === undefined) break;
    cache.entries.delete(oldest);
  }
}

/**
 * Runs `work` once per key while it is in flight. A second caller waits on the
 * first call's answer rather than starting another.
 */
export function sharedWork(
  key: string,
  work: () => Promise<string | null>,
): Promise<string | null> {
  const pending = cache.inFlight.get(key);
  if (pending) return pending;

  const promise = work().finally(() => {
    if (cache.inFlight.get(key) === promise) cache.inFlight.delete(key);
  });

  cache.inFlight.set(key, promise);
  return promise;
}
