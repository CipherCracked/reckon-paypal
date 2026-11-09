import { isModelConfigured } from "@/lib/ai/client";
import { exampleDocuments } from "@/lib/catalog/examples";
import { answerReading } from "./answer";
import { cachedReading } from "./reading-cache";

/**
 * Reads the example documents before anyone clicks one.
 *
 * The reader is the product's only demonstration of AI doing work a script could
 * not, and a visitor will not spend a minute finding out whether it is worth a
 * minute. The example texts never change, so their readings are made once, at
 * start-up, and kept (`reading-cache.ts`).
 *
 * One document at a time, deliberately — the same rule the exit warm-up
 * follows, for the same measured reason: a burst against one free endpoint
 * starves itself, and a warm-up that starves is a warm-up that leaves every
 * button slow.
 *
 * A document that fails is not remembered, so a click retries it rather than
 * serving a stale failure.
 */
export async function warmExampleReadings(): Promise<void> {
  // With no model configured every example would read "could not be
  // interpreted", and remembering that would make the demonstration show the
  // opposite of what it exists to show.
  if (!isModelConfigured()) return;

  for (const example of exampleDocuments) {
    try {
      await cachedReading(example.text, () => answerReading(example.text));
    } catch {
      // `answerReading` reports its own failures as an uninterpreted answer, so
      // reaching here means something outside the reading went wrong. The rest
      // of the examples are still worth reading.
    }
  }
}
