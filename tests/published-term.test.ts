import { describe, expect, it } from "vitest";
import { termFromSpans } from "@/lib/commitment/published-term";
import { normaliseText } from "@/lib/document/normalise";

/**
 * The term, read from the merchant's own sentence (IPD 37, IPD 38).
 *
 * `termFromSpans` is given what the model offered and the text it offered it
 * from, exactly as `exitFromSpans` is, and it answers with one of five facts.
 * The distinction the tests care about most is between a span that *verifies* and
 * a span that *says what it was labelled with*: a warranty is a real sentence
 * about a period, and it must not become a schedule.
 */

const spans = (...pairs: [string, string][]) =>
  pairs.map(([field, quote]) => ({ field: field as never, quote }));

const read = (title: string, description: string, ...pairs: [string, string][]) =>
  termFromSpans(spans(...pairs), normaliseText(`${title}\n${description}`));

const CURATED_TITLE = "Bark Monthly Subscription";
const CURATED_DESCRIPTION =
  "A 12-month BarkBox subscription for dogs, featuring monthly BarkBox dog toys and treats.";

describe("a listing that states a term", () => {
  it("reads the count and the unit out of the merchant's sentence", () => {
    const finding = read(
      CURATED_TITLE,
      CURATED_DESCRIPTION,
      ["termLength", "12-month BarkBox subscription"],
      ["period", "featuring monthly BarkBox dog toys"],
    );

    expect(finding).toEqual({
      kind: "stated",
      count: 12,
      period: "month",
      quote: "12-month BarkBox subscription",
    });
  });

  it("schedules a monthly box with no separate cadence sentence", () => {
    const finding = read(
      "The Detox Box 6-Month Subscription",
      "Six boxes, one a month.",
      ["termLength", "6-Month Subscription"],
    );

    expect(finding).toEqual({
      kind: "stated",
      count: 6,
      period: "month",
      quote: "6-Month Subscription",
    });
  });

  it("reads a spelled number, which real titles use", () => {
    const finding = read(
      "Accessories Set + Gift Subscription - Six Month",
      "A box of accessories.",
      ["termLength", "Gift Subscription - Six Month"],
    );

    expect(finding).toMatchObject({ kind: "stated", count: 6, period: "month" });
  });

  it("reads the term from the title alone", () => {
    const finding = read("BARK 12 Month Subscription", "", [
      "termLength",
      "BARK 12 Month Subscription",
    ]);

    expect(finding).toMatchObject({ kind: "stated", count: 12, period: "month" });
  });
});

describe("a listing that states something other than a monthly term", () => {
  it("will not turn a quarterly charge into monthly payments", () => {
    const finding = read(
      "Coffee Club",
      "Twelve months of coffee club membership, billed and shipped on a quarterly basis.",
      ["termLength", "Twelve months of coffee club membership"],
      ["period", "billed and shipped on a quarterly basis"],
    );

    expect(finding).toEqual({
      kind: "unschedulable",
      reason: "cadence",
      quote: "Twelve months of coffee club membership",
    });
  });

  it("will not turn a term stated in years into months", () => {
    const finding = read("Sony Protect Plus", "A 3 Year Protection Plan for your console.", [
      "termLength",
      "Sony Protect Plus",
    ]);
    // "Sony Protect Plus" states no duration at all, so nothing is read from it.
    expect(finding).toEqual({ kind: "silent" });

    const withYear = read("Extended cover", "This membership runs for 3 year terms.", [
      "termLength",
      "This membership runs for 3 year terms.",
    ]);
    expect(withYear).toEqual({
      kind: "unschedulable",
      reason: "unit",
      quote: "This membership runs for 3 year terms.",
    });
  });

  it("describes a subscription that never ends, without inventing a term", () => {
    const finding = read(
      "Tea Club",
      "A monthly subscription service. Cancel any time.",
      ["period", "A monthly subscription service"],
    );

    expect(finding).toEqual({
      kind: "ongoing",
      quote: "A monthly subscription service",
    });
  });

  it("describes a quarterly subscription that never ends the same way", () => {
    const finding = read("Soap Club", "Billed quarterly, delivered in March, June and September.", [
      "period",
      "Billed quarterly",
    ]);

    expect(finding).toEqual({ kind: "ongoing", quote: "Billed quarterly" });
  });
});

describe("a listing whose words are about something else", () => {
  it("does not read a warranty as a term", () => {
    const finding = read(
      "Total Care Program",
      "Total Care Program 1-Year Warranty. Covers parts and labour.",
      ["termLength", "Total Care Program 1-Year Warranty"],
    );

    expect(finding).toEqual({ kind: "silent" });
  });

  it("does not read a wall calendar as a subscription", () => {
    const finding = read(
      "2027 Cat in a Box Monthly Wall Calendar",
      "Twelve pages, one for each month of 2027.",
      ["period", "Cat in a Box Monthly Wall Calendar"],
    );

    expect(finding).toEqual({ kind: "silent" });
  });

  it("says nothing when the listing states no term and no cadence", () => {
    const finding = read(
      "Seasonal Subscription Box",
      "Contents change with the season.",
    );

    expect(finding).toEqual({ kind: "silent" });
  });

  it("ignores the spans that answer a different question", () => {
    const finding = read(
      "Mug",
      "A large ceramic mug.",
      ["exitFee", "a large ceramic mug"],
      ["freeToLeave", "A large ceramic mug."],
    );

    expect(finding).toEqual({ kind: "silent" });
  });
});

describe("a model that did not copy", () => {
  it("reports the failure rather than the seller's silence", () => {
    const finding = read("Tea Club", "A monthly tea box.", [
      "termLength",
      "a twelve month tea subscription",
    ]);

    expect(finding.kind).toBe("unreadable");
  });

  it("prefers a span that did copy over one that did not", () => {
    const finding = read(
      "Tea Club",
      "A 6-Month Subscription to tea.",
      ["termLength", "a twelve month tea subscription"],
      ["termLength", "6-Month Subscription"],
    );

    expect(finding).toMatchObject({ kind: "stated", count: 6, period: "month" });
  });
});
