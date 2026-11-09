/**
 * Runs once when the server starts.
 *
 * Both warm-ups exist for the same reason: the slowest thing in this app is a
 * model call, and some of those calls are over text that never changes. Doing
 * them here is the difference between a screen that renders and one that waits
 * most of a minute for an answer the server could already have.
 *
 * The exit readings feed the entrance and the bills; the example documents feed
 * the reader's one-click samples (IPD 22).
 */
export async function register(): Promise<void> {
  const { warmPublishedExits } = await import("@/lib/commitment/warm");
  const { warmExampleReadings } = await import("@/lib/document/warm");

  // Started, not awaited: the reads must not delay the server starting, and a
  // reader who arrives first gets the bounded attempt in `readPublishedExit` or
  // starts the example's reading themselves. Each warm-up works through its
  // texts one at a time, so the two running together is two requests, not eight.
  void warmPublishedExits();
  void warmExampleReadings();
}
