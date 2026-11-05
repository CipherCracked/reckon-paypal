import { describe, it, expect } from "vitest";
import { findMoneyLike, assertNoMoney, MoneyInModelOutputError } from "@/lib/ai/guard";
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
    expect(findMoneyLike("A 12-month term, 40% off the first bag.")).toBeNull();
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
});
