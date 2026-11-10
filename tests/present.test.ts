import { describe, it, expect } from "vitest";
import { computeCommitment } from "@/lib/commitment/compute";
import { presentFigures, FIGURE_ORDER } from "@/lib/commitment/present";
import { money } from "@/lib/money";
import { products } from "@/lib/catalog/products";
import type { CommitmentTerms } from "@/lib/commitment/types";

const oneTime: CommitmentTerms = {
  shape: "one_time",
  itemPrice: money(4799),
  shipping: money(695),
  tax: money(401),
  exit: { kind: "none" },
};

const recurring: CommitmentTerms = {
  shape: "recurring",
  itemPrice: money(1100),
  shipping: money(0),
  tax: money(100),
  recurrence: { count: 12, period: "month" },
  exit: { kind: "fee", fee: money(0) },
};

const recurringWithShipping: CommitmentTerms = {
  shape: "recurring",
  itemPrice: money(1000),
  shipping: money(500),
  tax: money(100),
  recurrence: { count: 12, period: "month" },
  exit: { kind: "unknown" },
};

const financed: CommitmentTerms = {
  shape: "financed",
  itemPrice: money(120000),
  shipping: money(0),
  tax: money(0),
  installment: { count: 12, amount: money(10500), fee: money(6000) },
  exit: { kind: "unknown" },
};

const present = (terms: CommitmentTerms) =>
  presentFigures(terms, computeCommitment(terms));

const byId = (terms: CommitmentTerms) =>
  Object.fromEntries(present(terms).map((figure) => [figure.id, figure]));

describe("presentFigures", () => {
  it("orders the figures by decision weight, not by chronology", () => {
    expect(present(oneTime).map((figure) => figure.id)).toEqual(FIGURE_ORDER);
    expect(FIGURE_ORDER).toEqual(["acrossTerm", "exit", "today"]);
  });

  it("shows what a one-time purchase costs, in one payment", () => {
    const figures = byId(oneTime);

    expect(figures.acrossTerm.label).toBe("Across the term");
    expect(figures.acrossTerm.arithmetic).toBe("1 payment");
    expect(figures.today.arithmetic).toBe("$47.99 + $6.95 + $4.01");
  });

  it("shows a repeating charge as a count times an amount", () => {
    const figures = byId(recurring);

    expect(figures.acrossTerm.arithmetic).toBe("12 × $12.00");
    expect(figures.today.arithmetic).toBe("$11.00 + $1.00");
  });

  it("keeps shipping out of the repeat when the seller charges it once", () => {
    const figures = byId(recurringWithShipping);

    // 12 × $11.00 = $132.00, plus $5.00 shipping once, is the term total.
    expect(figures.acrossTerm.arithmetic).toBe("12 × $11.00 + $5.00 shipping once");
  });

  it("shows a financed commitment as instalments plus the fee", () => {
    const figures = byId(financed);

    expect(figures.acrossTerm.arithmetic).toBe("12 × $105.00 + $60.00 fee");
    expect(figures.today.arithmetic).toBe("1 of 12 payments");
  });

  it("never restates a figure — every amount is the computed one", () => {
    for (const terms of [oneTime, recurring, recurringWithShipping, financed]) {
      const translation = computeCommitment(terms);
      const figures = byId(terms);

      expect(figures.today.amount).toEqual(translation.today);
      expect(figures.acrossTerm.amount).toEqual(translation.acrossTerm);
      expect(figures.exit.amount).toEqual(translation.exit);
    }
  });

  it("leaves an unpublished exit cost as no amount at all", () => {
    expect(byId(recurringWithShipping).exit.amount).toBeNull();
    expect(byId(recurringWithShipping).exit.arithmetic).toBeNull();
  });

  it("gives every catalog product an arithmetic line for both totals", () => {
    for (const product of products) {
      const figures = byId(product.terms);

      expect(figures.acrossTerm.arithmetic).toBeTruthy();
      expect(figures.today.arithmetic).toBeTruthy();
    }
  });

  it("uses only figures the seller stated — no percentages, no per-day rates", () => {
    for (const product of products) {
      for (const figure of present(product.terms)) {
        expect(figure.arithmetic ?? "").not.toMatch(/%|\bper day\b|\/day\b|\ba day\b/i);
      }
    }
  });
});

describe("when the source states only part of the charge", () => {
  // A real listing: a price, and nothing about shipping or tax.
  const listed: CommitmentTerms = {
    shape: "one_time",
    itemPrice: money(17995),
    shipping: null,
    tax: null,
    exit: { kind: "unknown" },
  };

  it("marks both totals as floors, and the exit cost is not one", () => {
    const figures = byId(listed);

    expect(figures.acrossTerm.floor).toBe(true);
    expect(figures.today.floor).toBe(true);
    expect(figures.exit.floor).toBe(false);
    // Still the computed amount — nothing is added for what nobody stated.
    expect(figures.today.amount).toEqual(money(17995));
  });

  it("names what is missing beside the arithmetic it is missing from", () => {
    const figures = byId(listed);

    expect(figures.today.arithmetic).toBe("$179.95, plus shipping and sales tax not stated");
    expect(figures.acrossTerm.arithmetic).toBe(
      "$179.95, plus shipping and sales tax not stated",
    );
  });

  it("leaves a fully stated charge alone", () => {
    for (const terms of [oneTime, recurring, financed]) {
      const figures = byId(terms);

      expect(figures.today.floor).toBe(false);
      expect(figures.acrossTerm.floor).toBe(false);
    }
  });
});
