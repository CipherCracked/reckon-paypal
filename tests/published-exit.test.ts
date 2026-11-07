import { beforeEach, describe, expect, it, vi } from "vitest";
import { requestQuotations } from "@/lib/ai/read-document";
import { ModelError } from "@/lib/ai/client";
import { exitFromSpans, readPublishedExit } from "@/lib/commitment/published-exit";
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
});
