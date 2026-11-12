import { describe, expect, it } from "vitest";
import { money } from "@/lib/money";
import { describeApproval } from "@/lib/commitment/approval";
import type { FigureId, RenderedFigure } from "@/lib/commitment/present";

/**
 * Why this sentence exists at all.
 *
 * IPD 48 decided the button would be one control for all three shapes, with a
 * sentence in the product's own words above it saying what approval does —
 * because the label belongs to PayPal and says "Subscribe", and nothing else.
 * Seen in a browser on 2026-11-12, PayPal's button prints **no amount**, so the
 * sentence is the only place beside the control where the money is named.
 */

function figure(id: FigureId, minor: number | null, floor = false): RenderedFigure {
  return {
    id,
    label: id,
    amount: minor === null ? null : money(minor),
    floor,
    arithmetic: null,
    source: null,
  };
}

describe("the sentence above PayPal's button", () => {
  it("says a one-time purchase is charged once, and names the amount", () => {
    expect(describeApproval("one_time", [figure("acrossTerm", 2499), figure("today", 2499)])).toBe(
      "PayPal's button charges $24.99 now, once.",
    );
  });

  it("says a repeating purchase approves a plan, and names both ends of it", () => {
    expect(
      describeApproval("recurring", [figure("acrossTerm", 14994), figure("today", 2499)]),
    ).toBe("PayPal's button approves the plan above: $24.99 today, $149.94 across the term.");
  });

  it("calls the financed shape an instalment plan, not a plan", () => {
    expect(
      describeApproval("financed", [figure("acrossTerm", 129900), figure("today", 12990)]),
    ).toBe(
      "PayPal's button approves the instalment plan above: $129.90 today, $1,299.00 across the term.",
    );
  });

  it("keeps a figure that is a floor a floor, above the button as much as beside it", () => {
    expect(
      describeApproval("recurring", [
        figure("acrossTerm", 14994, true),
        figure("today", 2499, true),
      ]),
    ).toBe(
      "PayPal's button approves the plan above: at least $24.99 today, at least $149.94 across the term.",
    );
  });

  it("says nothing at all when there is no figure to put in the sentence", () => {
    expect(describeApproval("recurring", [figure("acrossTerm", 14994)])).toBeNull();
  });
});
