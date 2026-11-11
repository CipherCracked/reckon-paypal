import { beforeEach, describe, expect, it, vi } from "vitest";
import { requestQuotations } from "@/lib/ai/read-document";
import { ModelError } from "@/lib/ai/client";
import { SELLER_SAYS_NOTHING, SELLER_UNREADABLE } from "@/lib/commitment/absence";
import {
  EXIT_SILENT_NOTE,
  EXIT_UNREADABLE_NOTE,
  exitFromSpans,
  readPublishedExit,
  resolveExitTerm,
  clearPublishedExitCache,
} from "@/lib/commitment/published-exit";
import { normaliseText } from "@/lib/document/normalise";
import { money } from "@/lib/money";

vi.mock("@/lib/ai/read-document", () => ({
  requestQuotations: vi.fn(),
}));

const description =
  "0% APR over 12 months: 12 payments of $105.00, plus a $60.00 origination fee. 100-night trial. Cancellation terms not shown on this page.";

function source(text = description): string {
  return normaliseText(text);
}

beforeEach(() => {
  vi.mocked(requestQuotations).mockReset();
  clearPublishedExitCache();
});

describe("verified spans become the exit figure (IPD 19)", () => {
  it("reads a stated fee out of a verified span", () => {
    const finding = exitFromSpans(
      [{ field: "exitFee", quote: "Cancellation costs $40.00" }],
      source("Cancellation costs $40.00 after the first month."),
    );

    expect(finding).toEqual({
      kind: "stated",
      exit: { kind: "fee", fee: money(4000) },
      quote: "Cancellation costs $40.00",
    });
  });

  it("keeps a published no-fee term as its own case, never as silence", () => {
    const finding = exitFromSpans(
      [{ field: "freeToLeave", quote: "cancel any time, no fee" }],
      source("A 12-month term — cancel any time, no fee."),
    );

    expect(finding).toEqual({
      kind: "stated",
      exit: { kind: "none" },
      quote: "cancel any time, no fee",
    });
  });

  it("reports a seller who said nothing about leaving as silence", () => {
    // The model pointed at the price and the trial, and nowhere else, which is
    // the safe answer the prompt asks for.
    const finding = exitFromSpans(
      [
        { field: "amountPerPeriod", quote: "12 payments of $105.00" },
        { field: "paymentCount", quote: "12 months" },
      ],
      source(),
    );

    expect(finding).toEqual({ kind: "silent" });
  });

  it("discards a span the seller never wrote, and says it could not be read", () => {
    const finding = exitFromSpans(
      [{ field: "exitFee", quote: "Cancellation costs $25.00" }],
      source(),
    );

    expect(finding.kind).toBe("unreadable");
  });

  it("refuses two amounts in one span rather than choosing one", () => {
    const text = "Cancel within 3 months for $25.00, after that $10.00.";
    const finding = exitFromSpans(
      [{ field: "exitFee", quote: "for $25.00, after that $10.00" }],
      source(text),
    );

    expect(finding.kind).toBe("unreadable");
  });

  it("is not derailed by a span for a field the exit figure cannot use", () => {
    const text = "$12.00 a bag. Cancel any time, no fee.";
    const finding = exitFromSpans(
      [
        { field: "amountPerPeriod", quote: "$12.00 a bag" },
        { field: "freeToLeave", quote: "Cancel any time, no fee." },
      ],
      source(text),
    );

    expect(finding).toEqual({
      kind: "stated",
      exit: { kind: "none" },
      quote: "Cancel any time, no fee.",
    });
  });
});

describe("reading a seller's published text (ITD 18)", () => {
  it("renders an empty text as silence without asking the model", async () => {
    await expect(readPublishedExit("   ")).resolves.toEqual({ kind: "silent" });
    expect(requestQuotations).not.toHaveBeenCalled();
  });

  it("treats zero spans as an answer, not as a failure", async () => {
    vi.mocked(requestQuotations).mockResolvedValue({ quotations: [], summary: "" });

    await expect(readPublishedExit(description)).resolves.toEqual({ kind: "silent" });
  });

  it("turns a model failure into an absence with a reason, never into zero", async () => {
    vi.mocked(requestQuotations).mockRejectedValue(new ModelError("No model is configured."));

    const finding = await readPublishedExit(description);

    expect(finding).toEqual({ kind: "unreadable", reason: "No model is configured." });
  });

  it("verifies spans against the seller's text before reading them", async () => {
    vi.mocked(requestQuotations).mockResolvedValue({
      quotations: [
        { field: "freeToLeave", quote: "Cancel any time, no fee." },
        { field: "exitFee", quote: "Cancellation costs $40.00" },
      ],
      summary: "",
    });

    const finding = await readPublishedExit("$12.00 a bag. Cancel any time, no fee.");

    // The no-fee span is real and wins; the invented fee span is discarded.
    expect(finding).toMatchObject({ kind: "stated", exit: { kind: "none" } });
  });

  it("reads the same seller's text once, because every render asks again", async () => {
    vi.mocked(requestQuotations).mockResolvedValue({ quotations: [], summary: "" });

    await readPublishedExit(description);
    await readPublishedExit(description);

    expect(requestQuotations).toHaveBeenCalledTimes(1);
  });

  it("shares one reading between readers who arrive while it is running", async () => {
    // A page render that gives up waiting does not cancel the reading, so the
    // next reader must join it rather than start a second model call.
    let release: (value: { quotations: never[]; summary: string }) => void = () => {};
    vi.mocked(requestQuotations).mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      }),
    );

    const first = readPublishedExit(description);
    const second = readPublishedExit(description);
    release({ quotations: [], summary: "" });

    await expect(first).resolves.toEqual({ kind: "silent" });
    await expect(second).resolves.toEqual({ kind: "silent" });
    expect(requestQuotations).toHaveBeenCalledTimes(1);
  });

  it("does not remember a failed read as if it were the seller's answer", async () => {
    // A timeout is a fact about one attempt. Remembering it would turn a slow
    // minute into ten minutes of "could not be read" on every screen (ITD 20).
    vi.mocked(requestQuotations).mockRejectedValueOnce(new ModelError("Request timed out."));

    const first = await readPublishedExit(description);
    expect(first.kind).toBe("unreadable");

    vi.mocked(requestQuotations).mockResolvedValue({ quotations: [], summary: "" });
    const second = await readPublishedExit(description);

    expect(requestQuotations).toHaveBeenCalledTimes(2);
    expect(second).toEqual({ kind: "silent" });
  });

  it("serves an aged reading rather than making the reader wait for it again", async () => {
    // A sentence that has not changed does not become wrong by aging, so the
    // entry keeps its answer while the refresh runs behind the reader (IPD 21).
    vi.useFakeTimers();
    try {
      vi.mocked(requestQuotations).mockResolvedValueOnce({ quotations: [], summary: "" });
      await readPublishedExit(description);

      vi.advanceTimersByTime(11 * 60 * 1000);
      // The refresh never settles; the reader must not wait for it.
      vi.mocked(requestQuotations).mockReturnValue(new Promise(() => {}));

      await expect(readPublishedExit(description)).resolves.toEqual({ kind: "silent" });
    } finally {
      vi.useRealTimers();
    }
  });

  it("stops waiting on a reading that never comes back, and tries again later", async () => {
    // Observed live: one request to the endpoint simply never answered. The
    // in-flight entry must not hold the slot for the life of the process, or
    // every later reader joins a dead request and is told the seller's terms
    // could not be read.
    vi.useFakeTimers();
    try {
      vi.mocked(requestQuotations).mockReturnValue(new Promise(() => {}));
      void readPublishedExit(description);

      await vi.advanceTimersByTimeAsync(4 * 60 * 1000);

      vi.mocked(requestQuotations).mockResolvedValue({ quotations: [], summary: "" });
      await expect(readPublishedExit(description)).resolves.toEqual({ kind: "silent" });
      expect(requestQuotations).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("passes the caller's retry budget through to the request", async () => {
    vi.mocked(requestQuotations).mockResolvedValue({ quotations: [], summary: "" });

    await readPublishedExit(description, { retries: 0 });

    expect(requestQuotations).toHaveBeenCalledWith(description, { retries: 0 });
  });
});

describe("the absences are worded once, for every screen (IPD 31)", () => {
  it("keeps the seller's silence and a failed read in two different sentences", () => {
    // `published-exit.ts` exists to keep these apart, and a screen that rendered
    // them identically would undo the distinction in the last place it is read.
    expect(EXIT_SILENT_NOTE).not.toBe(EXIT_UNREADABLE_NOTE);
  });

  it("takes both sentences from the one module the screens share", () => {
    // Four screens reported an absence in four paraphrases before this. The
    // constants are re-exported rather than rewritten so there is one source of
    // the words, and a screen cannot have its own.
    expect(EXIT_SILENT_NOTE).toBe(SELLER_SAYS_NOTHING);
    expect(EXIT_UNREADABLE_NOTE).toBe(SELLER_UNREADABLE);
  });

  it("names the seller in the silence, and itself in the failure", async () => {
    // The two are not interchangeable: a seller who published nothing and a
    // reading that did not happen have different consequences, and only one of
    // them may be reported as the seller's silence.
    vi.mocked(requestQuotations).mockResolvedValue({ quotations: [], summary: "" });
    const silent = await resolveExitTerm({ kind: "unknown" }, description, "the description");
    expect(silent.note).toBe(SELLER_SAYS_NOTHING);

    vi.mocked(requestQuotations).mockRejectedValueOnce(new ModelError("Request timed out."));
    // A different text, because a reading is cached against the seller's words:
    // the same words would be answered from the first reading and never reach
    // the request this test is about.
    const failed = await resolveExitTerm(
      { kind: "unknown" },
      "Another seller's terms.",
      "the description",
    );
    expect(failed.note).toBe(SELLER_UNREADABLE);
  });
});
