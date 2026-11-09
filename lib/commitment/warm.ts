import { isModelConfigured } from "@/lib/ai/client";
import { bills } from "@/lib/catalog/bills";
import { products } from "@/lib/catalog/products";
import { readPublishedExit } from "@/lib/commitment/published-exit";

/**
 * Reads the sellers' exit terms before anyone asks for them.
 *
 * The reading is a model call, and the model is the slowest thing in the app by
 * an order of magnitude — measured at roughly 40 seconds for one short
 * description on a free endpoint. A page render cannot wait for that, and the
 * figure it produces is a fact about a static sentence that never changes, so
 * the work belongs at start-up rather than at the reader's expense.
 *
 * One text at a time, deliberately. Four descriptions sent at once to a free
 * endpoint is four requests against one small quota: measured live, one came
 * back in 37 seconds and the other three were still waiting a minute later,
 * which is a warm-up that never warms. In sequence each call gets the quota to
 * itself, and a reading that lands late is still worth having — the cache keeps
 * it (`readPublishedExit`).
 *
 * The results land in `readPublishedExit`'s cache, so the first view of a bill
 * is as fast as the tenth. Nothing about a person is involved: the inputs are
 * the seller texts in `lib/catalog/`.
 */
export async function warmPublishedExits(): Promise<void> {
  // With no model configured every reading would be "could not be read", and
  // remembering that would keep the figure hidden for the cache's lifetime.
  if (!isModelConfigured()) return;

  const texts = [
    ...new Set(
      [...bills, ...products]
        .filter((entry) => entry.terms.exit.kind === "unknown")
        .map((entry) => entry.description),
    ),
  ];

  for (const text of texts) {
    // One failing text must not stop the rest: the loop exists to give each
    // reading its turn, not to fail as a group.
    try {
      await readPublishedExit(text);
    } catch {
      // `readPublishedExit` reports its own failures as "unreadable", so
      // reaching here means something outside the reading went wrong. The next
      // text is still worth reading.
    }
  }
}
