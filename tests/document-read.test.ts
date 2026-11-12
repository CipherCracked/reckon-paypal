import { describe, it, expect } from "vitest";
import { presentReading, readQuotations, type Quotation } from "@/lib/document/read";
import { findCandidates } from "@/lib/document/candidates";

function figureAmounts(quotations: Quotation[]) {
  const reading = readQuotations(quotations);
  if (!reading) throw new Error("expected the spans to describe a commitment");
  const view = presentReading(reading);
  return {
    reading,
    view,
    amounts: Object.fromEntries(
      view.figures.map((figure) => [figure.id, figure.amount ? figure.amount.minor : null]),
    ),
  };
}

describe("a subscription read from its own words", () => {
  const quotations: Quotation[] = [
    { field: "amountPerPeriod", quote: "$35.00 per month" },
    { field: "paymentCount", quote: "for 12 months" },
    { field: "period", quote: "per month" },
    { field: "dueDate", quote: "First payment due 2026-11-21" },
  ];

  it("multiplies the repeating charge by the count", () => {
    const { amounts } = figureAmounts(quotations);
    expect(amounts.today).toBe(3500);
    expect(amounts.acrossTerm).toBe(42000);
  });

  it("says the cost to leave is not stated, rather than calling it free", () => {
    const { amounts } = figureAmounts(quotations);
    expect(amounts.exit).toBeNull();
  });

  it("keeps the sentence each figure came from", () => {
    const { reading } = figureAmounts(quotations);
    expect(reading.sources.acrossTerm).toBe("$35.00 per month");
    expect(reading.sources.today).toBe("$35.00 per month");
    expect(reading.sources.exit).toBeNull();
    expect(reading.dueDate).toBe("2026-11-21");
  });
});

describe("which sentence a figure is sourced to (IPD 18)", () => {
  it("does not quote a stated total beside a charge that is not that total", () => {
    const { amounts, reading } = figureAmounts([
      { field: "amountPerPeriod", quote: "$35.00 per month" },
      { field: "paymentCount", quote: "for 12 months" },
      { field: "totalDue", quote: "First payment $45.00" },
    ]);

    expect(amounts.today).toBe(3500);
    // The figure is $35.00, so the $45.00 sentence is not where it came from.
    expect(reading.sources.today).toBe("$35.00 per month");
  });

  it("quotes the total when the total is what is charged", () => {
    const { amounts, reading } = figureAmounts([
      { field: "amountPerPeriod", quote: "$35.00 per month" },
      { field: "oneTimeExtra", quote: "plus $10.00 joining fee" },
      { field: "totalDue", quote: "First payment $45.00" },
    ]);

    expect(amounts.today).toBe(4500);
    expect(reading.sources.today).toBe("First payment $45.00");
  });

  it("takes the stated fee when a document promises both a free window and a fee", () => {
    const { amounts, reading } = figureAmounts([
      { field: "totalDue", quote: "Amount due: $240.00" },
      { field: "exitFee", quote: "Cancellation fee: $50.00" },
      { field: "freeToLeave", quote: "You may cancel free within 30 days" },
    ]);

    // Reversed on 2026-11-11, after a live reading printed $0.00 beside a
    // $180.00 early termination fee. The page has one figure and no way to say
    // "free until March, $50 after", so it states the charge: understating what
    // leaving costs is the failure this product exists to prevent.
    expect(amounts.exit).toBe(5000);
    expect(reading.sources.exit).toBe("Cancellation fee: $50.00");
  });

  it("refuses a one-off charge the model called the repeating amount", () => {
    // Live on 2026-11-11: the reader's own fee-schedule sample was read as
    // "$15.00 per period, plus $15.00 once" from one sentence that says
    // "charged once", and the page offered $30.00 charged today for a document
    // whose only figure is one $15.00 card. With the repetition gone, nothing
    // in the document describes a commitment, so the reader refuses it.
    expect(
      readQuotations([
        { field: "amountPerPeriod", quote: "Replacement key card: $15.00, charged once." },
        { field: "oneTimeExtra", quote: "$15.00, charged once." },
        {
          field: "exitFee",
          quote: "Cancelling more than 30 days before your renewal date costs $25.00.",
        },
      ]),
    ).toBeNull();
  });

  it("keeps a repeating charge that is billed once a month", () => {
    const { amounts } = figureAmounts([
      { field: "amountPerPeriod", quote: "$35.00, billed once a month" },
      { field: "paymentCount", quote: "for 12 months" },
    ]);

    // "once a month" states the cadence, not that the charge never repeats.
    expect(amounts.acrossTerm).toBe(42000);
  });

  it("refuses a span the model called free-to-leave that never mentions leaving", () => {
    // Live on 2026-11-11: "You are agreeing to 24 months of service" was
    // offered as the free-exit sentence, and the page printed $0.00 for a
    // contract with a $180.00 early termination fee. The span is real; the
    // label on it was not.
    const { amounts, reading } = figureAmounts([
      { field: "amountPerPeriod", quote: "$32.00 per month" },
      { field: "paymentCount", quote: "24 months of service" },
      { field: "freeToLeave", quote: "You are agreeing to 24 months of service" },
      { field: "exitFee", quote: "an early termination fee of $180.00 is charged" },
    ]);

    expect(amounts.exit).toBe(18000);
    expect(reading.sources.exit).toBe("an early termination fee of $180.00 is charged");
  });

  it("states an exit as unknown when the only free-to-leave span says nothing about cost", () => {
    const { amounts } = figureAmounts([
      { field: "totalDue", quote: "Amount due: $240.00" },
      { field: "freeToLeave", quote: "The first month is free" },
    ]);

    // A free month is a discount, not a free exit, and $0.00 here would say the
    // document promised something it never mentioned.
    expect(amounts.exit).toBeNull();
  });

  it("gives the term total no source until the document says how many payments", () => {
    const { reading } = figureAmounts([
      { field: "amountPerPeriod", quote: "$35.00 per month" },
      { field: "period", quote: "per month" },
    ]);

    expect(reading.sources.acrossTerm).toBeNull();
  });
});

describe("a one-time charge", () => {
  it("takes the stated total as the whole charge and adds nothing to it", () => {
    const { amounts, reading } = figureAmounts([
      { field: "totalDue", quote: "Amount due: $240.00" },
      { field: "oneTimeExtra", quote: "plus $20.00 delivery" },
    ]);
    // The total already contains the delivery, so adding it again would inflate the figure.
    expect(amounts.today).toBe(24000);
    expect(amounts.acrossTerm).toBe(24000);
    expect(reading.terms.shape).toBe("one_time");
  });

  it("does not claim nothing further is charged when the document mentions payments", () => {
    const { reading } = figureAmounts([
      { field: "totalDue", quote: "Total: $1,200.00" },
      { field: "paymentCount", quote: "12 payments" },
      { field: "period", quote: "per month" },
    ]);

    // The document states one amount, so it is shown as one charge — but it
    // also says there are 12 payments, and "nothing further is charged" would
    // contradict the sentence the reader just pasted.
    expect(reading.terms.shape).toBe("one_time");
    expect(reading.schedule).not.toContain("Nothing further is charged");
    expect(reading.schedule).toContain("12 payments");
    expect(reading.schedule).toContain("single charge");
  });

  it("reads a stated cancellation fee as a cost to leave", () => {
    const { amounts } = figureAmounts([
      { field: "totalDue", quote: "Amount due: $240.00" },
      { field: "exitFee", quote: "Cancellation fee: $50.00" },
    ]);
    expect(amounts.exit).toBe(5000);
  });

  it("reads a stated free cancellation as zero, which is what the document said", () => {
    const { amounts } = figureAmounts([
      { field: "totalDue", quote: "Amount due: $240.00" },
      { field: "freeToLeave", quote: "You may cancel at any time at no cost" },
    ]);
    expect(amounts.exit).toBe(0);
  });
});

describe("what the reader refuses to do", () => {
  it("returns nothing when the spans do not describe a charge", () => {
    expect(readQuotations([])).toBeNull();
    expect(readQuotations([{ field: "dueDate", quote: "Due 2026-11-21" }])).toBeNull();
    expect(readQuotations([{ field: "exitFee", quote: "Cancellation fee: $50.00" }])).toBeNull();
  });

  it("drops a span whose value cannot be read, instead of filling the field anyway", () => {
    const { reading } = figureAmounts([
      { field: "totalDue", quote: "Amount due: see overleaf" },
      { field: "amountPerPeriod", quote: "$30.00 a month" },
      { field: "paymentCount", quote: "two payments" },
    ]);
    // "two payments" yields no digit, so the count stays unstated and no total is computed.
    expect(reading.countUnstated).toBe(true);
  });

  it("leaves the total across the term absent when the count is missing, never guessed", () => {
    const { view, amounts } = figureAmounts([
      { field: "amountPerPeriod", quote: "$9.99 a month, cancel anytime" },
    ]);
    expect(amounts.today).toBe(999);
    expect(amounts.acrossTerm).toBeNull();
    expect(view.notes.acrossTerm).toMatch(/how many payments/i);
  });

  it("multiplies a yearly charge by its count, keeping the cadence as written", () => {
    const { amounts, reading } = figureAmounts([
      { field: "amountPerPeriod", quote: "$20.00 per year" },
      { field: "paymentCount", quote: "for 2 years" },
      { field: "period", quote: "per year" },
    ]);
    // $20 a year for 2 years is $40 — not $20 a month for 24 months.
    expect(amounts.acrossTerm).toBe(4000);
    expect(reading.schedule).toMatch(/2 payments of \$20\.00, one a year/);
  });
});

describe("the document a person actually pasted", () => {
  const document = `Service Agreement
Monthly plan: $35.00 per month for 12 months.
Setup fee: $10.00
Cancellation after month 3: $25.00
First payment due 21 November 2026`;

  it("counts a repeating charge with its one-time extra once", () => {
    const { amounts } = figureAmounts([
      { field: "amountPerPeriod", quote: "Monthly plan: $35.00 per month for 12 months." },
      { field: "paymentCount", quote: "for 12 months" },
      { field: "period", quote: "per month" },
      { field: "oneTimeExtra", quote: "Setup fee: $10.00" },
      { field: "exitFee", quote: "Cancellation after month 3: $25.00" },
    ]);
    // 12 × $35.00, plus the $10.00 setup fee charged once.
    expect(amounts.acrossTerm).toBe(42000 + 1000);
    expect(amounts.exit).toBe(2500);
  });

  it("finds amounts and dates without interpreting either", () => {
    const candidates = findCandidates(document);
    expect(candidates.amounts).toEqual(["$35.00", "$10.00", "$25.00"]);
    expect(candidates.dates).toEqual(["21 November 2026"]);
  });
});

describe("an absent figure when the check refused the sentence (IPD 44)", () => {
  const monthly: Quotation[] = [
    { field: "amountPerPeriod", quote: "$39.00 per month" },
    { field: "paymentCount", quote: "for 12 months" },
  ];

  function notesFor(quotations: Quotation[], refused: Array<{ field: string; text: string }>) {
    const reading = readQuotations(quotations);
    if (!reading) throw new Error("expected the spans to describe a commitment");
    return presentReading(reading, { refused }).notes;
  }

  it("does not blame the document for a sentence the check threw away", () => {
    const notes = notesFor(monthly, [
      { field: "exitFee", text: "Cancelling before the end of the subscription costs $95.00" },
    ]);

    // The document does say what leaving costs. Saying it does not would
    // contradict the panel one line below, which quotes the sentence.
    expect(notes.exit).toMatch(/not in your text/i);
    expect(notes.exit).not.toMatch(/does not say/i);
  });

  it("still blames the document when nothing about leaving was offered", () => {
    const notes = notesFor(monthly, []);
    expect(notes.exit).toMatch(/does not say/i);
  });

  it("says the same about a payment count the check refused", () => {
    const notes = notesFor(
      [{ field: "amountPerPeriod", quote: "$39.00 per month" }],
      [{ field: "paymentCount", text: "twelve months" }],
    );

    expect(notes.acrossTerm).toMatch(/not in your text/i);
    expect(notes.acrossTerm).not.toMatch(/does not say/i);
  });

  it("leaves the note alone when the refused sentence was about something else", () => {
    const notes = notesFor(monthly, [{ field: "dueDate", text: "by the end of the first week" }]);
    expect(notes.exit).toMatch(/does not say/i);
  });
});
