import { describe, it, expect, vi, beforeEach } from "vitest";
import { readDocumentWithModel, UnreadableDocumentError } from "@/lib/ai/read-document";

const { callToolMock } = vi.hoisted(() => ({ callToolMock: vi.fn() }));

vi.mock("@/lib/ai/client", () => ({
  callTool: callToolMock,
  ModelError: class ModelError extends Error {},
}));

const document = `Monthly plan: $35.00 per month for 12 months. Setup fee: $10.00.`;

const goodSpans = [
  { field: "amountPerPeriod", quote: "Monthly plan: $35.00 per month for 12 months." },
  { field: "oneTimeExtra", quote: "Setup fee: $10.00" },
];

beforeEach(() => {
  callToolMock.mockReset();
});

describe("readDocumentWithModel", () => {
  it("asks for spans in a schema with no place to put a figure", async () => {
    callToolMock.mockResolvedValueOnce({ quotations: goodSpans, summary: "A plan." });

    await readDocumentWithModel({ text: document });

    const parameters = callToolMock.mock.calls[0][0].tool.parameters;
    expect(callToolMock.mock.calls[0][0].tool.name).toBe("record_quotations");
    expect(parameters.properties).not.toHaveProperty("amount");
    expect(parameters.properties.quotations.items.properties).not.toHaveProperty("amount");
  });

  it("keeps verified spans when the summary names a figure", async () => {
    callToolMock.mockResolvedValueOnce({
      quotations: goodSpans,
      summary: "The repeating amount is the monthly plan charge of $35.00 per month.",
    });

    const reading = await readDocumentWithModel({ text: document });

    expect(reading.quotations).toEqual(goodSpans);
    expect(reading.summary).toBe("");
  });

  it("keeps a summary that names no figure", async () => {
    callToolMock.mockResolvedValueOnce({
      quotations: goodSpans,
      summary: "A monthly plan you can leave.",
    });

    const reading = await readDocumentWithModel({ text: document });

    expect(reading.summary).toBe("A monthly plan you can leave.");
  });

  it("drops spans that name a field we do not read", async () => {
    callToolMock.mockResolvedValueOnce({
      quotations: [...goodSpans, { field: "interestRate", quote: "Setup fee: $10.00" }],
      summary: "",
    });

    const reading = await readDocumentWithModel({ text: document });

    expect(reading.quotations).toEqual(goodSpans);
  });

  it("throws when no span survives", async () => {
    callToolMock.mockResolvedValueOnce({
      quotations: [{ field: "totalDue", quote: "  " }],
      summary: "",
    });

    await expect(readDocumentWithModel({ text: document })).rejects.toBeInstanceOf(
      UnreadableDocumentError,
    );
  });

  it("throws when the answer is not shaped like quotations at all", async () => {
    callToolMock.mockResolvedValueOnce({ nope: true });

    await expect(readDocumentWithModel({ text: document })).rejects.toBeInstanceOf(
      UnreadableDocumentError,
    );
  });
});
