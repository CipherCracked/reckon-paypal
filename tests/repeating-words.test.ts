import { describe, expect, it } from "vitest";
import { repeatingWords } from "@/lib/commitment/published-term";

/**
 * The shelf's screen (IPD 41, ITD 36).
 *
 * Every fixture below is a real listing read from the catalogue on 2026-11-12,
 * because the point of this function is to behave on the catalogue's own copy —
 * which is written about calendars, warranties and books as often as about
 * anything that charges again.
 */

const listing = (title: string, description: string): string => `${title}\n${description}`;

describe("the words that put a listing on the shelf", () => {
  it("quotes the title when the title states a term", () => {
    expect(
      repeatingWords(
        listing(
          "BARK 3 Month Subscription",
          "A BarkBox based subscription service offering monthly themed dog toys and treats.",
        ),
      ),
    ).toBe("BARK 3 Month Subscription");
  });

  it("falls through to the sentence that names a cadence when no title does", () => {
    expect(
      repeatingWords(
        listing(
          "Bar Soap Subscription",
          "A subscription service providing a 6-pack of Dr. Squatch's natural men's bar soaps, billed and shipped on a quarterly basis. The set includes a variety of scents.",
        ),
      ),
    ).toBe(
      "A subscription service providing a 6-pack of Dr. Squatch's natural men's bar soaps, billed and shipped on a quarterly basis",
    );
  });

  it("does not end a quote on an abbreviation", () => {
    // Read live, this listing's tile said “A quarterly subscription from Dr” —
    // a fragment, because the sentence was cut at a merchant's abbreviation.
    expect(
      repeatingWords(
        listing(
          "Soap Subscription - 9 Bars",
          "A quarterly subscription from Dr. Squatch that delivers 9 bars of men's natural soap. The set includes a variety of scents.",
        ),
      ),
    ).toBe("A quarterly subscription from Dr. Squatch that delivers 9 bars of men's natural soap");
  });

  it("refuses a calendar that says monthly and charges nothing", () => {
    expect(
      repeatingWords(
        listing(
          "2027 Cat in a Box Monthly Wall Calendar",
          "This 12 x 12 calendar features large monthly grids and a different box for each month.",
        ),
      ),
    ).toBeNull();
  });

  it("refuses an extended service plan, which states a period and is not an agreement", () => {
    expect(
      repeatingWords(
        listing(
          "Nikon 2-Year Service Coverage (ESC) for Nikon Coolpix Digital Cameras",
          "It provides an additional two years of coverage for repairs resulting from defects in material or workmanship.",
        ),
      ),
    ).toBeNull();
  });

  it("refuses a book about subscriptions", () => {
    expect(
      repeatingWords(
        listing(
          "The Subscription Boom: Why an Old Business Model is the Future of Commerce",
          "A clear and informed guide to the business model that is set to dominate twenty-first-century commerce.",
        ),
      ),
    ).toBeNull();
  });

  it("refuses a product that is paid once", () => {
    expect(
      repeatingWords(
        listing(
          "Precision Workstation Laptop",
          "A flagship professional workstation laptop designed for high-demand workloads such as CAD design, 3D rendering and software development.",
        ),
      ),
    ).toBeNull();
  });

  it("abridges a clause that runs long, without altering its words", () => {
    const clause =
      "This gift bundle is a twelve month subscription to a monthly delivery of hand poured scented candles wrapped in recyclable paper and shipped from a workshop in Portland Oregon";
    const text = listing("Organic Care Bundle", `${clause} every month.`);

    const quote = repeatingWords(text);

    // The tile has to be readable, so a long clause is cut — but only cut: every
    // word a shopper sees is still the seller's, in the seller's order.
    expect(quote).toMatch(/…$/);
    expect(clause.startsWith((quote ?? "").replace(/…$/, ""))).toBe(true);
  });
});
