import { describe, expect, it } from "vitest";
import { parseCadence, parseStatedLength } from "@/lib/document/parse";

/**
 * A listing states its term in its own words, and those words are what R1 has to
 * read (IPD 37, IPD 38). These are the two readings the term layer needs from a
 * span: how long the agreement runs, and whether the charges fall due monthly.
 *
 * The parser is deliberately the dumb half — it says what the words say. Whether
 * a duration belongs to an agreement at all is the meaning check's job.
 */

describe("a stated length", () => {
  it("reads a count and its unit from a title", () => {
    expect(parseStatedLength("6-Month Subscription")).toEqual({ count: 6, unit: "month" });
    expect(parseStatedLength("3 Month Subscription")).toEqual({ count: 3, unit: "month" });
    expect(parseStatedLength("BARK 12 Month Subscription")).toEqual({ count: 12, unit: "month" });
  });

  it("reads the words the catalogue actually publishes", () => {
    expect(parseStatedLength("This listing is for a 6 month BarkBox plan")).toEqual({
      count: 6,
      unit: "month",
    });
    expect(parseStatedLength("a 9-month plan ensures a consistent supply")).toEqual({
      count: 9,
      unit: "month",
    });
    expect(parseStatedLength("Gift Subscription - Six Month")).toEqual({ count: 6, unit: "month" });
  });

  it("does not read a count that could be either half of a range", () => {
    expect(parseStatedLength("payment 1 of 12 months")).toBeNull();
    expect(parseStatedLength("months 3 and 6 are cheaper")).toBeNull();
  });

  it("reads a year, a week and a day, so the caller can refuse the unit", () => {
    expect(parseStatedLength("3 Year Protection Plan")).toEqual({ count: 3, unit: "year" });
    expect(parseStatedLength("12 weeks of deliveries")).toEqual({ count: 12, unit: "week" });
  });

  it("says nothing when the words state no length", () => {
    expect(parseStatedLength("Seasonal Subscription Box")).toBeNull();
    expect(parseStatedLength("delivered every month")).toBeNull();
  });
});

describe("a stated cadence", () => {
  it("calls a monthly charge monthly", () => {
    expect(parseCadence("billed monthly")).toBe("month");
    expect(parseCadence("a monthly subscription service")).toBe("month");
    expect(parseCadence("delivers one box each month")).toBe("month");
    expect(parseCadence("ships every month")).toBe("month");
  });

  it("refuses to call anything else monthly", () => {
    expect(parseCadence("billed and shipped on a quarterly basis")).toBe("other");
    expect(parseCadence("charged annually")).toBe("other");
    expect(parseCadence("delivered every three months")).toBe("other");
    expect(parseCadence("ships every 90 days")).toBe("other");
    expect(parseCadence("billed every two weeks")).toBe("other");
  });

  it("says nothing when the words name no cadence", () => {
    expect(parseCadence("Seasonal Subscription Box")).toBeNull();
    expect(parseCadence("curated for people who like tea")).toBeNull();
  });
});
