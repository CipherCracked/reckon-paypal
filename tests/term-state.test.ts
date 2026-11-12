import { describe, expect, it } from "vitest";
import { noScheduleSentence } from "@/lib/catalog/term-state";
import type { TermState } from "@/lib/catalog/resolve";

/**
 * What a route says when a listing states nothing it can charge on (IPD 40).
 *
 * The product page draws five states; a route has no screen, so it says the same
 * things in words. Four routes charge money from one resolution, and a shopper
 * should not meet four different explanations of one refusal.
 */

const REFUSALS: TermState[] = [
  { kind: "notRead" },
  { kind: "unreadable", reason: "Request timed out." },
  { kind: "unschedulable", reason: "cadence", quote: "12-month coffee club" },
  { kind: "unschedulable", reason: "unit", quote: "3 year terms" },
  { kind: "ongoing", quote: "billed quarterly" },
];

describe("a listing with no schedule", () => {
  it("gives every refusal a sentence", () => {
    for (const state of REFUSALS) {
      expect(noScheduleSentence(state)).toBeTruthy();
    }
  });

  it("refuses even when a schedule should have existed", () => {
    // A route asks only when the resolver returned no terms, so these three are
    // guards. A guard that answered with nothing would put `null` in the error
    // field of a response about money.
    for (const state of [
      { kind: "structured" },
      { kind: "stated", quote: "6-Month Subscription" },
      { kind: "silent" },
    ] as TermState[]) {
      expect(noScheduleSentence(state)).toContain("Nothing has been charged");
    }
  });

  it("never asks the shopper to do something it has not started", () => {
    // Every refusal states that nothing was charged: these routes are the ones
    // that move money, and a refusal that reads like a failure could be taken
    // for a charge that half happened.
    for (const state of REFUSALS) {
      expect(noScheduleSentence(state)).toContain("Nothing has been charged");
    }
  });

  it("does not confuse not-yet-read with could-not-read", () => {
    expect(noScheduleSentence({ kind: "notRead" })).not.toBe(
      noScheduleSentence({ kind: "unreadable", reason: "Request timed out." }),
    );
  });
});
