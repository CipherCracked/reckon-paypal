import { describe, it, expect } from "vitest";
import { money } from "@/lib/money";
import { computeCommitment } from "@/lib/commitment/compute";
import type { CommitmentTerms } from "@/lib/commitment/types";

const oneTime: CommitmentTerms = {
  shape: "one_time",
  itemPrice: money(4799),
  shipping: money(695),
  tax: money(401),
  exit: { kind: "none" },
};

describe("computeCommitment — one time", () => {
  it("charges item + shipping + tax today", () => {
    const t = computeCommitment(oneTime);
    expect(t.today.minor).toBe(5895);
    expect(t.acrossTerm.minor).toBe(5895);
    expect(t.exit?.minor).toBe(0);
  });

  it("keeps the breakdown exact", () => {
    const t = computeCommitment(oneTime);
    expect(t.breakdown).toEqual({
      item: money(4799),
      shipping: money(695),
      tax: money(401),
    });
  });
});

const recurring: CommitmentTerms = {
  shape: "recurring",
  itemPrice: money(1200),
  shipping: money(0),
  tax: money(0),
  recurrence: { count: 12, period: "month" },
  exit: { kind: "fee", fee: money(0) },
};

const financed: CommitmentTerms = {
  shape: "financed",
  itemPrice: money(120000),
  shipping: money(0),
  tax: money(0),
  installment: { count: 12, amount: money(10500), fee: money(6000) },
  exit: { kind: "unknown" },
};

describe("computeCommitment — recurring and financed", () => {
  it("multiplies a recurring charge across the term", () => {
    const t = computeCommitment(recurring);
    expect(t.today.minor).toBe(1200);
    expect(t.acrossTerm.minor).toBe(14400);
  });

  it("sums instalments and the financing fee", () => {
    const t = computeCommitment(financed);
    expect(t.today.minor).toBe(10500);
    expect(t.acrossTerm.minor).toBe(132000);
  });

  it("shows what makes up today's charge, not the cash price", () => {
    // The three rows are read as the parts of the charge. On a financed
    // purchase today is one instalment, so the cash price does not belong
    // there — it produced $1,200.00 under a $1,320.00 total and a $105.00
    // charge, three numbers no reader could reconcile.
    const t = computeCommitment(financed);
    expect(t.breakdown).toEqual({
      item: money(10500),
      shipping: money(0),
      tax: money(0),
    });
  });

  it("adds up to today's charge on every shape", () => {
    // The one property the breakdown has to keep: a reader can check it
    // against the figure it sits under.
    for (const terms of [oneTime, recurring, financed]) {
      const t = computeCommitment(terms);
      const sum = t.breakdown.item.minor + t.breakdown.shipping.minor + t.breakdown.tax.minor;
      expect(sum).toBe(t.today.minor);
    }
  });

  it("returns null exit when terms are unknown", () => {
    expect(computeCommitment(financed).exit).toBeNull();
  });

  it("refuses a shape whose terms are missing rather than guessing a total", () => {
    expect(() => computeCommitment({ ...recurring, recurrence: undefined })).toThrow();
    expect(() => computeCommitment({ ...financed, installment: undefined })).toThrow();
  });

  it("refuses a term shorter than one charge", () => {
    expect(() =>
      computeCommitment({ ...recurring, recurrence: { count: 0, period: "month" } }),
    ).toThrow();
  });
});

