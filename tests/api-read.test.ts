import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/read/route";
import { readDocumentWithModel } from "@/lib/ai/read-document";
import { ModelError } from "@/lib/ai/client";
import { clearReadingCache } from "@/lib/document/reading-cache";

vi.mock("@/lib/ai/read-document", () => {
  class MockUnreadableDocumentError extends Error {}
  return {
    UnreadableDocumentError: MockUnreadableDocumentError,
    readDocumentWithModel: vi.fn(),
  };
});

const document = `Service Agreement
Monthly plan: $35.00 per month for 12 months.
Setup fee: $10.00
Cancellation after month 3: $25.00
First payment due 21 November 2026`;

function request(body: unknown): Request {
  return new Request("http://localhost:3000/api/read", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function modelReturns(quotations: Array<{ field: string; quote: string }>) {
  vi.mocked(readDocumentWithModel).mockResolvedValue({ quotations, summary: "" } as never);
}

beforeEach(() => {
  vi.mocked(readDocumentWithModel).mockReset();
  // Readings are remembered by their text, and every test here reads the same
  // document; without this the second test would be answered by the first.
  clearReadingCache();
});

describe("POST /api/read", () => {
  it("computes the figures from verified spans, not from anything the model said", async () => {
    modelReturns([
      { field: "amountPerPeriod", quote: "Monthly plan: $35.00 per month for 12 months." },
      { field: "paymentCount", quote: "for 12 months" },
      { field: "period", quote: "per month" },
      { field: "oneTimeExtra", quote: "Setup fee: $10.00" },
      { field: "exitFee", quote: "Cancellation after month 3: $25.00" },
      { field: "dueDate", quote: "21 November 2026" },
    ]);

    const response = await POST(request({ text: document }));
    const body = await response.json();

    expect(body.mode).toBe("read");
    expect(body.rejected).toBe(0);
    expect(body.dueDate).toBe("2026-11-21");
    const amounts = Object.fromEntries(
      body.figures.map((figure: { id: string; amount: { minor: number } | null }) => [
        figure.id,
        figure.amount ? figure.amount.minor : null,
      ]),
    );
    // 12 × $35.00 = $420.00, plus the $10.00 setup fee charged once.
    expect(amounts).toEqual({ acrossTerm: 43000, exit: 2500, today: 4500 });
  });

  it("reports the sentence each figure came from", async () => {
    modelReturns([
      { field: "totalDue", quote: "Setup fee: $10.00" },
      { field: "totalDue", quote: "Cancellation after month 3: $25.00" },
    ]);

    const response = await POST(request({ text: document }));
    const body = await response.json();

    // The first span that parses wins; the second is ignored rather than merged.
    // The sentence travels on the figure it produced (ITD 19), so there is no
    // separate map beside the figures for a screen to join up or forget.
    const today = body.figures.find((figure: { id: string }) => figure.id === "today");
    expect(today.source).toEqual({ label: "your document", span: "Setup fee: $10.00" });
  });

  it("discards a quotation the document does not contain, and says how many", async () => {
    modelReturns([
      { field: "totalDue", quote: "Total due: $420.00" },
      { field: "exitFee", quote: "Cancellation after month 3: $25.00" },
    ]);

    const response = await POST(request({ text: document }));
    const body = await response.json();

    // The fabricated total is gone, and an exit fee alone is not a commitment.
    expect(body.mode).toBe("candidates");
    expect(body.candidates.amounts).toContain("$35.00");
    expect(JSON.stringify(body)).not.toContain("420.00");
  });

  it("never computes a figure from a span it could not verify", async () => {
    modelReturns([{ field: "totalDue", quote: "Amount due: $999.00" }]);

    const response = await POST(request({ text: document }));
    const body = await response.json();

    expect(body.mode).toBe("candidates");
    expect(JSON.stringify(body)).not.toContain("999");
  });

  it("falls back to candidate mode when no model is configured, and says so plainly", async () => {
    vi.mocked(readDocumentWithModel).mockRejectedValue(
      new ModelError("No model is configured for this deployment."),
    );

    const response = await POST(request({ text: document }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.mode).toBe("candidates");
    expect(body.notice).toMatch(/Nothing was interpreted|nothing was interpreted/i);
    expect(body.notice).toMatch(/No model is configured/);
    expect(body.candidates.amounts).toEqual(["$35.00", "$10.00", "$25.00"]);
  });

  it("falls back to candidate mode when the model is unavailable, without blaming the setup", async () => {
    vi.mocked(readDocumentWithModel).mockRejectedValue(new Error("The model endpoint answered 503."));

    const response = await POST(request({ text: document }));
    const body = await response.json();

    expect(body.mode).toBe("candidates");
    expect(body.notice).not.toMatch(/No model is configured/);
    expect(body.notice).toMatch(/nothing was guessed/i);
  });

  it("refuses a fragment too short to be a document", async () => {
    const response = await POST(request({ text: "pay $5" }));

    expect(response.status).toBe(400);
    expect(vi.mocked(readDocumentWithModel)).not.toHaveBeenCalled();
  });
});
