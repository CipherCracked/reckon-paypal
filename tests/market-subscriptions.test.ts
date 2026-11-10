import { describe, expect, it } from "vitest";
import { computeCommitment } from "@/lib/commitment/compute";
import { describeSchedule } from "@/lib/commitment/schedule";
import { SUSPEND_AFTER_FAILED_PAYMENTS } from "@/lib/commitment/plan-policy";
import { money } from "@/lib/money";
import {
  LISTED_TERMS,
  curatedTerm,
  subscriptionTerms,
  termIsStated,
} from "@/lib/market/subscriptions";
import { RECORDED_LISTINGS, recordedProduct } from "./fixtures/channel3-listings";

describe("the curated term map", () => {
  it("quotes a sentence that appears in the listing it was read from", () => {
    for (const [id, term] of Object.entries(LISTED_TERMS)) {
      const listing = RECORDED_LISTINGS[id];
      expect(listing, `no recorded listing for ${id}`).toBeDefined();

      const words = `${listing.title}\n${listing.description}`;
      expect(words, `${id} does not contain “${term.quote}”`).toContain(term.quote);
    }
  });

  it("does not treat a rewritten listing as still stating its term", () => {
    const listing = recordedProduct("YyLUjLT");
    const rewritten = {
      title: listing.title,
      description: "A box for dogs. No plan length is stated here.",
    };

    expect(termIsStated(rewritten, curatedTerm("YyLUjLT")!)).toBe(false);
  });

  it("knows nothing about a listing it has not curated", () => {
    expect(curatedTerm("NotAnId")).toBeUndefined();
  });
});

describe("the terms a listed subscription supports", () => {
  it("takes the live offer's price and the merchant's stated term", () => {
    const listing = recordedProduct("YyLUjLT");
    const offer = listing.offers[0];
    const terms = subscriptionTerms(offer, curatedTerm("YyLUjLT")!);

    expect(terms.shape).toBe("recurring");
    expect(terms.itemPrice).toEqual(money(2499));
    expect(terms.recurrence).toEqual({ count: 6, period: "month" });
    expect(terms.failure).toEqual({ suspendAfter: SUSPEND_AFTER_FAILED_PAYMENTS });
    // Not zero: nobody stated what leaving costs, and the merchant's own words
    // are allowed to answer that question instead.
    expect(terms.exit).toEqual({ kind: "unknown" });
    // The offer states neither, and a listing that did not mention shipping has
    // not said shipping is free.
    expect(terms.shipping).toBeNull();
    expect(terms.tax).toBeNull();
  });

  it("repeats the price for the term rather than naming a total", () => {
    const listing = recordedProduct("YyLUjLT");
    const terms = subscriptionTerms(listing.offers[0], curatedTerm("YyLUjLT")!);
    const translation = computeCommitment(terms);

    expect(translation.today).toEqual(money(2499));
    expect(translation.perPeriod).toEqual(money(2499));
    expect(translation.acrossTerm).toEqual(money(14994));
    expect(translation.exit).toBeNull();
    expect(translation.unstated).toEqual(["shipping", "tax"]);
  });

  it("states the six payments and the missed-payment policy in the schedule", () => {
    const listing = recordedProduct("YyLUjLT");
    const terms = subscriptionTerms(listing.offers[0], curatedTerm("YyLUjLT")!);

    expect(describeSchedule(terms)).toBe(
      "6 payments of $24.99, one a month — today's is the first of the 6. If a payment does not go through, PayPal suspends the plan after one failed payment.",
    );
  });

  it("uses the price the live offer carries, not the recorded one", () => {
    const listing = recordedProduct("YyLUjLT");
    const moved = { ...listing.offers[0], price: money(2999) };

    expect(subscriptionTerms(moved, curatedTerm("YyLUjLT")!).itemPrice).toEqual(money(2999));
  });
});
