import { describe, it, expect, vi, beforeEach } from "vitest";

const { createMock } = vi.hoisted(() => ({ createMock: vi.fn() }));

vi.mock("@anthropic-ai/sdk", () => ({
  default: class Anthropic {
    messages = { create: createMock };
    constructor(_options?: unknown) {}
  },
}));

import { extractTerms } from "@/lib/ai/extract-terms";
import { MoneyInModelOutputError } from "@/lib/ai/guard";

const goodInput = {
  shape: "recurring",
  recurrenceCount: 12,
  recurrencePeriod: "month",
  cancellationWindowDays: null,
  exitFeeKnown: true,
  labels: { item: "Coffee, one bag", shipping: "Shipping", tax: "Sales tax" },
  summary: "You pay monthly for one year, and you can cancel any time.",
};

const toolUseResponse = (input: unknown) => ({
  content: [{ type: "tool_use", name: "record_purchase_terms", input }],
});

beforeEach(() => {
  createMock.mockReset();
});

describe("extractTerms", () => {
  it("sends a schema-constrained request whose schema has no monetary field", async () => {
    createMock.mockResolvedValueOnce(toolUseResponse(goodInput));

    await extractTerms({ productText: "Freshly roasted, delivered every month." });

    expect(createMock).toHaveBeenCalledTimes(1);
    const request = createMock.mock.calls[0][0];

    expect(request.tool_choice).toEqual({ type: "tool", name: "record_purchase_terms" });
    const schema = request.tools[0].input_schema;
    expect(schema.properties).not.toHaveProperty("amount");
    expect(schema.properties).not.toHaveProperty("price");
    expect(schema.properties).not.toHaveProperty("value");
  });

  it("returns the parsed terms", async () => {
    createMock.mockResolvedValueOnce(toolUseResponse(goodInput));

    const terms = await extractTerms({ productText: "Freshly roasted, delivered every month." });

    expect(terms.shape).toBe("recurring");
    expect(terms.recurrenceCount).toBe(12);
    expect(terms.labels.item).toBe("Coffee, one bag");
  });

  it("refuses model output that contains a currency value", async () => {
    createMock.mockResolvedValueOnce(
      toolUseResponse({ ...goodInput, summary: "You pay $12.00 a month." }),
    );

    await expect(
      extractTerms({ productText: "Freshly roasted, delivered every month." }),
    ).rejects.toThrow(MoneyInModelOutputError);
  });

  it("refuses a response with no tool result at all", async () => {
    createMock.mockResolvedValueOnce({ content: [{ type: "text", text: "Sorry." }] });

    await expect(extractTerms({ productText: "Anything." })).rejects.toThrow();
  });
});
