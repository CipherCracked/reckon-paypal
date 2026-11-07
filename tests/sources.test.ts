import { describe, expect, it } from "vitest";
import { absentFigureNote, describeSources } from "@/lib/commitment/sources";
import { money } from "@/lib/money";

describe("the provenance line (IPD 18)", () => {
  it("names the seller's words when nothing was read from PayPal", () => {
    expect(describeSources({ published: "the terms shown here" })).toBe(
      "Computed from the terms shown here.",
    );
  });

  it("puts the PayPal object first and calls the remainder computed", () => {
    expect(
      describeSources({
        paypal: "PayPal's copy of this invoice",
        published: "what Northside Clinic published",
      }),
    ).toBe(
      "Read from PayPal's copy of this invoice. The rest is computed from what Northside Clinic published.",
    );
  });

  it("names an absent source as absent, in the same line", () => {
    expect(
      describeSources({
        published: "what Northside Clinic published",
        absent: "what it costs to leave",
      }),
    ).toBe(
      "Computed from what Northside Clinic published. Nobody published what it costs to leave.",
    );
  });

  it("prints the seller's sentence when the exit figure was read from one", () => {
    expect(
      describeSources({
        paypal: "the PayPal plan for Coffee Subscription",
        quoted: { source: "the description shown on this page", span: "cancel any time, no fee." },
      }),
    ).toBe(
      'Read from the PayPal plan for Coffee Subscription. What it costs to leave is quoted from the description shown on this page: "cancel any time, no fee".',
    );
  });

  it("does not put a full stop inside the quotation", () => {
    const line = describeSources({
      published: "the terms shown on this page",
      quoted: { source: "the seller's notice", span: "Early exit: $40.00" },
    });

    expect(line).toContain('"Early exit: $40.00".');
  });

  it("refuses to render a screen that says nothing at all", () => {
    expect(() => describeSources({})).toThrow(/where its figures came from/i);
  });

  it("treats a null source as absent rather than as an empty claim", () => {
    expect(describeSources({ paypal: null, published: "the terms shown here" })).toBe(
      "Computed from the terms shown here.",
    );
  });
});

describe("reading an absent source off the figures (IPD 19)", () => {
  it("reports the exit figure as absent when it has no amount", () => {
    expect(
      absentFigureNote([
        { id: "acrossTerm", amount: money(24000) },
        { id: "exit", amount: null },
        { id: "today", amount: money(24000) },
      ]),
    ).toBe("what it costs to leave");
  });

  it("says nothing when the seller did publish a figure", () => {
    expect(
      absentFigureNote([
        { id: "acrossTerm", amount: money(14400) },
        { id: "exit", amount: money(0) },
        { id: "today", amount: money(1200) },
      ]),
    ).toBeNull();
  });

  it("does not invent an absence for a screen with no exit figure", () => {
    expect(absentFigureNote([{ id: "today", amount: money(1200) }])).toBeNull();
  });
});
