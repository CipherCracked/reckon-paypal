import { describe, it, expect, vi, beforeEach } from "vitest";
import { extractTerms } from "@/lib/ai/extract-terms";
import { MoneyInModelOutputError } from "@/lib/ai/guard";

const { callToolMock } = vi.hoisted(() => ({ callToolMock: vi.fn() }));

vi.mock("@/lib/ai/client", () => ({
  callTool: callToolMock,
  ModelError: class ModelError extends Error {},
}));

const goodInput = {
  shape: "recurring",
  recurrenceCount: 12,
  recurrencePeriod: "month",
  cancellationWindowDays: null,
  exitFeeKnown: true,
  labels: { item: "Coffee, one bag", shipping: "Shipping", tax: "Sales tax" },
  summary: "You pay monthly for one year, and you can cancel any time.",
};

beforeEach(() => {
  callToolMock.mockReset();
});

describe("extractTerms", () => {
  it("asks for a schema with no monetary field", async () => {
    callToolMock.mockResolvedValueOnce(goodInput);

    await extractTerms({ productText: "Freshly roasted, delivered every month." });

    const properties = callToolMock.mock.calls[0][0].tool.parameters.properties;
    expect(properties).not.toHaveProperty("amount");
    expect(properties).not.toHaveProperty("price");
    expect(properties).not.toHaveProperty("value");
  });

  it("returns the parsed terms", async () => {
    callToolMock.mockResolvedValueOnce(goodInput);

    const terms = await extractTerms({ productText: "Freshly roasted, delivered every month." });

    expect(terms.shape).toBe("recurring");
    expect(terms.recurrenceCount).toBe(12);
    expect(terms.labels.item).toBe("Coffee, one bag");
  });

  it("treats a missing field as not stated rather than inventing one", async () => {
    callToolMock.mockResolvedValueOnce({
      labels: { item: "Coffee", shipping: "Shipping", tax: "Tax" },
      summary: "A monthly delivery.",
    });

    const terms = await extractTerms({ productText: "Freshly roasted, delivered every month." });

    expect(terms.shape).toBeNull();
    expect(terms.recurrenceCount).toBeNull();
  });

  it("refuses model output that contains a currency value", async () => {
    callToolMock.mockResolvedValueOnce({ ...goodInput, summary: "You pay $12.00 a month." });

    await expect(
      extractTerms({ productText: "Freshly roasted, delivered every month." }),
    ).rejects.toThrow(MoneyInModelOutputError);
  });

  it("keeps one sentence of a summary, which is what it asked for", async () => {
    callToolMock.mockResolvedValueOnce({
      ...goodInput,
      summary:
        "You pay monthly for one year, and you can cancel any time. Labels are provided as generic placeholders for the three parts of the charge.",
    });

    const terms = await extractTerms({ productText: "Freshly roasted, delivered every month." });

    expect(terms.summary).toBe("You pay monthly for one year, and you can cancel any time.");
  });

  it("leaves a blank label blank, so the caller can use its own", async () => {
    callToolMock.mockResolvedValueOnce({
      ...goodInput,
      labels: { item: "  ", shipping: "Shipping", tax: "Sales tax" },
    });

    const terms = await extractTerms({ productText: "Freshly roasted, delivered every month." });

    expect(terms.labels.item).toBe("");
    expect(terms.labels.shipping).toBe("Shipping");
  });
});
