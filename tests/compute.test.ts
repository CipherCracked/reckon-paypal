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
