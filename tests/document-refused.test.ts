import { describe, expect, it } from "vitest";
import { REFUSED_SPAN_LIMIT, REFUSED_TEXT_LIMIT, refusedSpans } from "@/lib/document/refused";

const span = (field: string, quote: string) => ({ field, quote });

describe("the spans the check refused (ITD 29)", () => {
  it("returns the offered spans the checker did not accept, in order", () => {
    const kept = span("amountPerPeriod", "$35.00 per month");
    const invented = span("exitFee", "Cancellation costs $25.00");
    const alsoInvented = span("freeToLeave", "Cancel any time for free");

    expect(refusedSpans([kept, invented, alsoInvented], [kept])).toEqual([
      { field: "exitFee", text: "Cancellation costs $25.00" },
      { field: "freeToLeave", text: "Cancel any time for free" },
    ]);
  });

  it("partitions on identity, so one of two identical spans can be refused", () => {
    // The model can offer the same sentence twice. If it occurs once in the
    // text, one is accepted and one is refused — comparing strings would call
    // both accepted and hide the mistake.
    const first = span("amountPerPeriod", "$35.00 per month");
    const second = span("amountPerPeriod", "$35.00 per month");

    expect(refusedSpans([first, second], [first])).toHaveLength(1);
  });

  it("says nothing when the model copied everything", () => {
    const kept = span("amountPerPeriod", "$35.00 per month");

    expect(refusedSpans([kept], [kept])).toEqual([]);
  });

  it("carries three spans and no more, rather than the whole answer", () => {
    const offered = Array.from({ length: 6 }, (_, index) => span("exitFee", `Fee ${index}`));

    const refused = refusedSpans(offered, []);

    expect(refused).toHaveLength(REFUSED_SPAN_LIMIT);
    // The first three, so the panel is the model's answer in its own order.
    expect(refused[0].text).toBe("Fee 0");
  });

  it("clips a long span and marks the cut, so it does not read as a whole sentence", () => {
    const long = "x".repeat(REFUSED_TEXT_LIMIT + 40);

    const [refused] = refusedSpans([span("exitFee", long)], []);

    expect(refused.text).toHaveLength(REFUSED_TEXT_LIMIT + 1);
    expect(refused.text.endsWith("…")).toBe(true);
  });

  it("leaves a span that fits untouched", () => {
    const exact = "y".repeat(REFUSED_TEXT_LIMIT);

    const [refused] = refusedSpans([span("exitFee", exact)], []);

    expect(refused.text).toBe(exact);
    expect(refused.text).not.toContain("…");
  });
});
