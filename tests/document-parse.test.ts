import { describe, it, expect } from "vitest";
import { parseAmount, parseAmounts, parseCount, parseDate, parsePeriod } from "@/lib/document/parse";
import { containsQuote, normaliseText } from "@/lib/document/normalise";

describe("reading an amount out of a span", () => {
  it("reads the amount exactly as the document writes it", () => {
    expect(parseAmount("Total due: $1,260.00")?.minor).toBe(126000);
    expect(parseAmount("35.5 dollars per month, billed as $35.50")?.minor).toBe(3550);
    expect(parseAmount("USD 240")?.minor).toBe(24000);
  });

  it("refuses a span with no marked amount, rather than reading a bare number as money", () => {
    expect(parseAmount("12 months")).toBeNull();
    expect(parseAmount("no amount here at all")).toBeNull();
  });

  it("refuses a span holding two amounts, because it cannot say which one was meant", () => {
    expect(parseAmount("$35.00 per month plus $10.00 setup")).toBeNull();
    expect(parseAmounts("$35.00 per month plus $10.00 setup")).toHaveLength(2);
    // Two equal amounts are still two obligations: "cancel for $25.00 within
    // three months and $25.00 after" is a conditional fee, and collapsing it
    // would drop the condition that made it a term.
    expect(parseAmount("$5.00 plus $5.00")).toBeNull();
    expect(parseAmount("cancel for $25.00 within 3 months and $25.00 after")).toBeNull();
  });
});

describe("reading a count out of a span", () => {
  it("ignores the money in the same sentence", () => {
    expect(parseCount("$35.00 per month for 12 months")).toBe(12);
    expect(parseCount("4 payments of $25.00")).toBe(4);
  });

  it("refuses a span with two different counts", () => {
    expect(parseCount("1 of 12 payments")).toBeNull();
    expect(parseCount("payments of $25.00")).toBeNull();
  });
});

describe("reading a cadence out of a span", () => {
  it("reads a cadence only when one is named", () => {
    expect(parsePeriod("billed monthly")).toBe("month");
    expect(parsePeriod("$240 per year")).toBe("year");
  });

  it("refuses a span naming both, or neither", () => {
    expect(parsePeriod("$120 month or $1,200 per year")).toBeNull();
    expect(parsePeriod("4 payments of $25.00")).toBeNull();
  });
});

describe("reading a date out of a span", () => {
  it("reads the three unambiguous spellings", () => {
    expect(parseDate("Due 2026-11-21")).toBe("2026-11-21");
    expect(parseDate("Due by 21 November 2026")).toBe("2026-11-21");
    expect(parseDate("Payment due November 21, 2026")).toBe("2026-11-21");
    expect(parseDate("Due 21 Nov 2026")).toBe("2026-11-21");
  });

  it("refuses day and month numbers, because which is which cannot be recovered", () => {
    expect(parseDate("Due 03/04/2026")).toBeNull();
  });

  it("refuses a day that does not exist in that month", () => {
    expect(parseDate("Due 31 February 2026")).toBeNull();
  });
});

describe("checking a quotation against the document", () => {
  it("accepts a span that differs only in whitespace and dash style", () => {
    const document = normaliseText("Total due:\n\n  $240.00 — payable now");
    expect(containsQuote(document, "Total due: $240.00 - payable now")).toBe(true);
  });

  it("rejects a span the document does not contain", () => {
    const document = normaliseText("Total due: $240.00");
    expect(containsQuote(document, "Total due: $420.00")).toBe(false);
    expect(containsQuote(document, "   ")).toBe(false);
  });
});
