import { describe, it, expect } from "vitest";
import {
  assertNoMoney,
  assertOnlyKnownNumerals,
  findMoneyLike,
  findUnknownNumeral,
  MoneyInModelOutputError,
  UnknownNumeralError,
} from "@/lib/ai/guard";
import type { ExtractedTerms } from "@/lib/ai/types";

const valid: ExtractedTerms = {
  shape: "recurring",
  recurrenceCount: 12,
  recurrencePeriod: "month",
  cancellationWindowDays: null,
  exitFeeKnown: true,
  labels: { item: "Coffee, one bag", shipping: "Shipping", tax: "Sales tax" },
  summary: "You pay monthly for one year, and you can cancel any time.",
};

describe("findMoneyLike", () => {
  it("flags a currency value in the summary", () => {
    expect(findMoneyLike("You pay $12.00 a month")).toBe("$12.00");
  });

  it("flags a bare decimal that reads as an amount", () => {
    expect(findMoneyLike("That works out to 58.95 in total")).toBe("58.95");
  });

  it("accepts a summary with no currency", () => {
    expect(findMoneyLike("You pay monthly for one year.")).toBeNull();
  });

  it("flags a bare count, which is a figure the model was not given", () => {
    // "for 3 months" is a claim about the schedule, and the schedule is
    // computed, never written by the model. It used to pass this gate because
    // the pattern only knew currency-shaped figures.
    expect(findMoneyLike("A 12-month term, 40% off the first bag.")).toBe("12");
    expect(findMoneyLike("You pay for 3 months.")).toBe("3");
  });
});

describe("assertNoMoney", () => {
  it("passes clean model output", () => {
    expect(() => assertNoMoney(valid)).not.toThrow();
  });

  it("throws when model output contains money", () => {
    const bad = { ...valid, summary: "Total USD 120" };
    expect(() => assertNoMoney(bad)).toThrow(MoneyInModelOutputError);
  });

  it("throws when a label carries an amount", () => {
    const bad = { ...valid, labels: { ...valid.labels, item: "Coffee, $12.00 a bag" } };
    expect(() => assertNoMoney(bad)).toThrow(/labels\.item/);
  });

  it("throws when the summary states a count", () => {
    const bad = { ...valid, summary: "You pay for 3 months, then it stops." };
    expect(() => assertNoMoney(bad)).toThrow(MoneyInModelOutputError);
  });
});

describe("findUnknownNumeral", () => {
  const facts = [1, 6, 24.99, 149.94, 124.95];

  it("passes a sentence that uses only the figures the server handed over", () => {
    expect(
      findUnknownNumeral(
        "PayPal has taken $24.99 so far, and $124.95 is still to come.",
        facts,
      ),
    ).toBeNull();
  });

  it("passes a sentence that writes a count in words", () => {
    expect(findUnknownNumeral("You have made one of six payments so far.", facts)).toBeNull();
  });

  it("refuses an invented amount", () => {
    expect(findUnknownNumeral("You are nearly there at $99.00.", facts)).toBe("$99.00");
  });

  it("refuses an invented count", () => {
    expect(findUnknownNumeral("You have made 2 of 6 payments.", facts)).toBe("2");
  });

  it("refuses an invented count written in words", () => {
    expect(findUnknownNumeral("You have made five payments so far.", facts)).toBe("five");
  });

  it("reads a hyphenated number as the number it is", () => {
    expect(findUnknownNumeral("The agreement runs for twenty-four months.", [24])).toBeNull();
    expect(findUnknownNumeral("The agreement runs for twenty-four months.", [6])).toBe(
      "twenty-four",
    );
  });

  it("compares a thousands-separated amount as the number it is", () => {
    expect(findUnknownNumeral("You have paid $1,499.40 in all.", [1499.4])).toBeNull();
  });

  it("leaves ordinary words alone", () => {
    expect(
      findUnknownNumeral("PayPal's record lists one completed payment.", [1]),
    ).toBeNull();
  });
});

describe("assertOnlyKnownNumerals", () => {
  it("throws with the fragment it could not place", () => {
    expect(() => assertOnlyKnownNumerals("You owe $12.00 more.", [24.99])).toThrow(
      UnknownNumeralError,
    );
    expect(() => assertOnlyKnownNumerals("You owe $12.00 more.", [24.99])).toThrow(/\$12\.00/);
  });

  it("passes when every figure was supplied", () => {
    expect(() => assertOnlyKnownNumerals("You have 1 of 6 payments left.", [1, 6])).not.toThrow();
  });
});
