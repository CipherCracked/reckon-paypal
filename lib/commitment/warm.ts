import { isModelConfigured } from "@/lib/ai/client";
import { bills } from "@/lib/catalog/bills";
import { products } from "@/lib/catalog/products";
import { listingText } from "@/lib/catalog/resolve";
import { readPublishedExit } from "@/lib/commitment/published-exit";
import { readMarketProduct } from "@/lib/market/channel3";
import { LISTED_TERMS } from "@/lib/market/subscriptions";

/**
 * The descriptions behind the curated listings, read from the live catalogue.
 *
 * These are not in `lib/catalog/`: a live listing's words belong to the merchant
 * and change without notice, so the file only records which ids are offered and
 * the sentence a term was read from. The description has to be fetched, which
 * means a listing's exit reading could not be warmed until now — including the
 * front door's, the one screen a shopper sees first.
 *
 * The text is built by `listingText`, the same way the resolver builds it,
 * because the reading is remembered by the string it was read from (IPD 37).
 * A warm-up that read the description alone would fill a key no page asks for,
 * and the front door's term would arrive cold on every start.
 *
 * A catalogue that does not answer is not an error here: the page's own read
 * will say so when someone asks, and a warm-up that threw would take the
 * file's texts down with it.
 */
async function listedTexts(): Promise<string[]> {
  const texts: string[] = [];
  for (const id of Object.keys(LISTED_TERMS)) {
    try {
      const record = await readMarketProduct(`ch3-${id}`);
      if (record) texts.push(listingText(record));
    } catch {
      // No key, or the catalogue is down. The next listing is still worth
      // trying, and the page reports the failure itself.
    }
  }
  return texts;
}

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
 * The listings come first, because in a sequence the order is what decides
 * which reading is ready first. YyLUjLT is the front door's listing.
 *
 * The results land in `readPublishedExit`'s cache, so the first view of a bill
 * is as fast as the tenth. Nothing about a person is involved: the inputs are
 * the seller texts in `lib/catalog/` and the descriptions the catalogue lists.
 */
export async function warmPublishedExits(): Promise<void> {
  // With no model configured every reading would be "could not be read", and
  // remembering that would keep the figure hidden for the cache's lifetime.
  if (!isModelConfigured()) return;

  const marketTexts = await listedTexts();
  const texts = [
    ...new Set([
      ...marketTexts,
      ...[...bills, ...products]
        .filter((entry) => entry.terms.exit.kind === "unknown")
        .map((entry) => entry.description),
    ]),
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
