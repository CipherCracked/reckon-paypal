import { exampleDocuments } from "@/lib/catalog/examples";
import type { Attempt, ReadingAnswer } from "./answer";
import { normaliseText } from "./normalise";

/**
 * Readings the server has already made, kept by the exact text they were read
 * from (ITD 20).
 *
 * A reading of a document is a fact about that document, so doing it twice for
 * the same words is a second model call to hear the same answer — and the model
 * does not answer in milliseconds. A cached answer is still a real reading; it
 * simply happened earlier, which is why nothing on the screen may claim the
 * model ran in the last second.
 *
 * The maps live on `globalThis` for the same reason the exit cache does: Next
 * compiles the start-up hook and the routes into separate module graphs, so a
 * module-level map here would be two maps and the warm-up would fill one that no
 * request ever reads.
 */
type Entry = {
  answer: ReadingAnswer;
  at: number;
  /** Example texts are content: their reading is made once and kept. */
  permanent: boolean;
};

type Store = {
  entries: Map<string, Entry>;
  /** Requests that arrive while a reading is running wait on it, not beside it. */
  inFlight: Map<string, Promise<Attempt>>;
};

const store = globalThis as unknown as { __readingCache?: Store };
const cache: Store = (store.__readingCache ??= { entries: new Map(), inFlight: new Map() });

/**
 * The shape of the answer this code produces, as a cache-key prefix.
 *
 * The cache lives on `globalThis`, so it outlives a recompile: a dev server that
 * has been up all day still holds answers built by the code from this morning.
 * That is invisible until one of those answers is rendered by a screen that has
 * moved on — which is exactly what happened when the breakdown gained its
 * opening-fee row, and three example documents began crashing the reader on a
 * figure that was simply absent from the cached payload.
 *
 * Bump it whenever `ReadingAnswer` gains, loses, or renames a field. The cost is
 * one model call per example document after the change; the alternative is a
 * page that fails on data from an older build.
 */
const ANSWER_VERSION = 2;

/**
 * How long a visitor's own document is kept: long enough to spare a second look
 * at the same paste, and not a record of anything. A time limit alone bounds
 * age, not growth — see `MAX_ENTRIES`.
 */
const VISITOR_TTL_MS = 10 * 60 * 1000;

/** Count is the bound that actually holds on a busy server. */
const MAX_ENTRIES = 50;

const PERMANENT: ReadonlySet<string> = new Set(
  exampleDocuments.map((example) => cacheKey(normaliseText(example.text))),
);

/** The text, and the shape of answer this build knows how to read back. */
function cacheKey(normalised: string): string {
  return `${ANSWER_VERSION}:${normalised}`;
}

/** Test hook: the cache is module state, like the PayPal token cache. */
export function clearReadingCache(): void {
  cache.entries.clear();
  cache.inFlight.clear();
}

/**
 * The answer for this text: remembered if it has been read, otherwise read by
 * `work` — and never read twice at once for the same text.
 *
 * A failure is not remembered, because a timeout is a fact about one attempt and
 * the next click should not inherit it.
 */
export async function cachedReading(
  text: string,
  work: () => Promise<Attempt>,
): Promise<ReadingAnswer> {
  const key = cacheKey(normaliseText(text));
  const remembered = cache.entries.get(key);

  if (remembered) {
    if (remembered.permanent || Date.now() - remembered.at < VISITOR_TTL_MS) {
      return remembered.answer;
    }
    // Serving an aged reading while a fresh one is made behind the reader: the
    // same document has not changed, and a second visit is not a reason to wait
    // for the same answer twice.
    void start(key, work);
    return remembered.answer;
  }

  const running = await start(key, work);
  return running.answer;
}

function start(key: string, work: () => Promise<Attempt>): Promise<Attempt> {
  const pending = cache.inFlight.get(key);
  if (pending) return pending;

  // `Promise.resolve().then` so a synchronous throw from `work` is a rejection
  // like any other rather than escaping before the slot is released.
  const running = Promise.resolve()
    .then(work)
    .then((result) => {
      if (result.keep) remember(key, result.answer);
      return result;
    })
    .finally(() => {
      // Only if this is still the attempt holding the slot: it may have been
      // replaced, and the replacement must not be evicted by the attempt it
      // replaced.
      if (cache.inFlight.get(key) === running) cache.inFlight.delete(key);
    });

  cache.inFlight.set(key, running);
  return running;
}

function remember(key: string, answer: ReadingAnswer): void {
  cache.entries.set(key, {
    answer,
    at: Date.now(),
    permanent: PERMANENT.has(key),
  });

  if (cache.entries.size <= MAX_ENTRIES) return;

  // The oldest visitor document goes. Examples are never the thing dropped: they
  // are the demonstration, and there are fewer of them than the bound.
  let oldest: [string, Entry] | null = null;
  for (const entry of cache.entries) {
    if (entry[1].permanent) continue;
    if (!oldest || entry[1].at < oldest[1].at) oldest = entry;
  }
  if (oldest) cache.entries.delete(oldest[0]);
}
