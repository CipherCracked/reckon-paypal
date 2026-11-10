import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildComparison } from "@/lib/comparison";
import { measureReadability } from "@/lib/readability";

const DOCUMENT = join(process.cwd(), "docs", "accessible-commerce-companion", "comparison.md");

describe("the comparison document", () => {
  it("matches what the app's own functions produce today", () => {
    const committed = readFileSync(DOCUMENT, "utf8");

    expect(committed).toBe(buildComparison());
  });

  it("carries the written-down product, with the seller's words quoted before ours", () => {
    const document = buildComparison();

    expect(document).toContain("## Noise-Cancelling Headphones");
    expect(document).toContain(
      "> Was $79.99 — now 40% off. Ships in two working days. Free returns within 30 days.",
    );
    expect(document).toContain("Across the term: $58.95 — 1 payment");
    // The live catalogue's prices move, so the document states what this
    // repository writes down and does not pretend to be a snapshot of a shop.
    expect(document).not.toContain("## Coffee Subscription");
    expect(document).not.toContain("## Mattress");
  });

  it("counts what the seller wrote rather than calling it nothing", () => {
    const document = buildComparison();

    expect(document).toContain("| Money amounts written out | 1 | 3 |");
    expect(document).toContain("| Times the cost across the term appears | 0 | 1 |");
  });

  it("says the reading-level numbers are not evidence of understanding", () => {
    const document = buildComparison();

    expect(document).toContain("it is unstable below a few hundred words");
    expect(document).toContain("not because a lower grade proves anything");
    expect(document).toContain("no users were tested");
  });
});

describe("measureReadability", () => {
  it("counts words and sentences", () => {
    const result = measureReadability("The cost is twelve dollars. It leaves today.");

    expect(result.words).toBe(8);
    expect(result.sentences).toBe(2);
  });

  it("scores a plain sentence far below a dense one", () => {
    const plain = measureReadability("Pay today. The rest is later.");
    const dense = measureReadability(
      "Notwithstanding the aforementioned stipulations, reimbursement obligations remain " +
        "unambiguously enforceable irrespective of termination.",
    );

    expect(plain.grade).toBeLessThan(dense.grade);
    expect(dense.grade).toBeGreaterThan(8);
  });

  it("never reports a negative grade", () => {
    expect(measureReadability("Pay. Now.").grade).toBe(0);
  });

  it("does not divide by zero on empty input", () => {
    expect(measureReadability("")).toEqual({ words: 0, sentences: 0, syllables: 0, grade: 0 });
  });
});
