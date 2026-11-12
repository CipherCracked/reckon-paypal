import { describe, expect, it } from "vitest";
import { money } from "@/lib/money";
import { plainWordsFacts, takenLine } from "@/lib/commitment/taken";

const read = (count: number, amountMinor: number | null) => ({
  kind: "read" as const,
  count,
  amount: amountMinor === null ? null : money(amountMinor),
});

const TERM = 6;
const ACROSS = money(14994);

describe("takenLine", () => {
  it("states what was taken and how much of the term that is", () => {
    const line = takenLine(read(1, 2499), TERM, ACROSS);
    expect(line.kind).toBe("some");
    expect(line.text).toBe("$24.99 — 1 of 6 payments.");
  });

  it("says when the term is complete", () => {
    const line = takenLine(read(6, 14994), TERM, ACROSS);
    expect(line.kind).toBe("all");
    expect(line.text).toBe("$149.94 — all 6 payments.");
  });

  it("says a record with no completed payment is empty, not that nothing was charged", () => {
    // `count` is a fact about PayPal's record, and the wording names it: the
    // record lists nothing completed yet, which a trial or a settlement lag can
    // both produce.
    const line = takenLine(read(0, 0), TERM, ACROSS);
    expect(line.kind).toBe("none");
    expect(line.text).toBe("Nothing yet — PayPal's record lists no completed payment.");
  });

  it("does not invent a term the plan never stated", () => {
    const line = takenLine(read(1, 2499), null, null);
    expect(line.kind).toBe("no-term");
    expect(line.text).toBe(
      "$24.99 — PayPal did not state how many payments this agreement runs to.",
    );
  });

  it("keeps the count when a payment came without an amount", () => {
    const line = takenLine(read(2, null), TERM, ACROSS);
    expect(line.kind).toBe("unstated-amount");
    expect(line.text).toBe("2 completed payments — PayPal did not state the amount.");
  });

  it("surfaces a record that lists more taken than the agreement was for", () => {
    // The receipt already refuses to render figures that disagree ("This record
    // does not add up"). This line says the same thing at the part rather than
    // printing a remainder the two sources do not support.
    const line = takenLine(read(7, 17493), TERM, ACROSS);
    expect(line.kind).toBe("disagrees");
    expect(line.text).toBe(
      "$174.93 — more than the $149.94 this agreement was for. Check it with PayPal.",
    );
  });

  it("says when it could not look, and never that nothing was taken", () => {
    const line = takenLine({ kind: "unavailable" }, TERM, ACROSS);
    expect(line.kind).toBe("unavailable");
    expect(line.text).toBe("Not read — PayPal's payment record could not be read just now.");
  });

  it("gives the read-aloud a sentence for every state it can be in", () => {
    const spoken = [
      takenLine(read(1, 2499), TERM, ACROSS),
      takenLine(read(6, 14994), TERM, ACROSS),
      takenLine(read(0, 0), TERM, ACROSS),
      takenLine(read(2, null), TERM, ACROSS),
      takenLine({ kind: "unavailable" }, TERM, ACROSS),
    ];

    expect(spoken.map((line) => line.spoken)).toEqual([
      "Taken so far: $24.99, 1 of 6 payments.",
      "Taken so far: $149.94, all 6 payments.",
      "Taken so far: nothing yet. PayPal's record lists no completed payment.",
      "Taken so far: 2 completed payments. PayPal did not state the amount.",
      "Taken so far: not read. PayPal's payment record could not be read just now.",
    ]);
  });
});

describe("plainWordsFacts", () => {
  it("gives the sentence-writer the figures and no more", () => {
    expect(plainWordsFacts(read(1, 2499), TERM, ACROSS)).toEqual({
      count: 1,
      taken: money(2499),
      termCount: 6,
      acrossTerm: money(14994),
      stillToCome: money(12495),
    });
  });

  it("gives the facts for a completed agreement, with nothing still to come", () => {
    // "All six are paid" is the line, and there is no remainder to explain — but
    // the sentence is still written, because the line is a fact worth saying plainly.
    expect(plainWordsFacts(read(6, 14994), TERM, ACROSS)).toEqual({
      count: 6,
      taken: money(14994),
      termCount: 6,
      acrossTerm: money(14994),
      stillToCome: money(0),
    });
  });

  it("has nothing to say about a state that is not a fact", () => {
    expect(plainWordsFacts({ kind: "unavailable" }, TERM, ACROSS)).toBeNull();
    expect(plainWordsFacts(read(0, 0), TERM, ACROSS)).toBeNull();
    expect(plainWordsFacts(read(2, null), TERM, ACROSS)).toBeNull();
    expect(plainWordsFacts(read(1, 2499), null, null)).toBeNull();
    expect(plainWordsFacts(read(7, 17493), TERM, ACROSS)).toBeNull();
  });
});
