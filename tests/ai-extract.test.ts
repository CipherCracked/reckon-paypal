import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
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

/** Whatever a provider's wire looks like, this is the shape we are willing to read. */
function toolCall(arguments_: unknown): Response {
  return new Response(
    JSON.stringify({
      choices: [
        {
          message: {
            tool_calls: [
              {
                type: "function",
                function: { name: "record_purchase_terms", arguments: JSON.stringify(arguments_) },
              },
            ],
          },
        },
      ],
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

const fetchMock = vi.fn();

function sentRequest(call = 0): Record<string, never> & {
  model: string;
  messages: Array<{ role: string; content: string }>;
  tools: Array<{ function: { name: string; parameters: { properties: Record<string, unknown> } } }>;
  tool_choice: unknown;
} {
  return JSON.parse(fetchMock.mock.calls[call][1].body as string);
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("AI_MODEL", "some-model");
  vi.stubEnv("AI_BASE_URL", "https://example.test/v1");
  vi.stubEnv("AI_API_KEY", "test-key");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("extractTerms", () => {
  it("sends a schema-constrained request whose schema has no monetary field", async () => {
    fetchMock.mockResolvedValueOnce(toolCall(goodInput));

    await extractTerms({ productText: "Freshly roasted, delivered every month." });

    const request = sentRequest();

    expect(request.tool_choice).toEqual({
      type: "function",
      function: { name: "record_purchase_terms" },
    });
    const properties = request.tools[0].function.parameters.properties;
    expect(properties).not.toHaveProperty("amount");
    expect(properties).not.toHaveProperty("price");
    expect(properties).not.toHaveProperty("value");
  });

  it("returns the parsed terms", async () => {
    fetchMock.mockResolvedValueOnce(toolCall(goodInput));

    const terms = await extractTerms({ productText: "Freshly roasted, delivered every month." });

    expect(terms.shape).toBe("recurring");
    expect(terms.recurrenceCount).toBe(12);
    expect(terms.labels.item).toBe("Coffee, one bag");
  });

  it("refuses model output that contains a currency value", async () => {
    fetchMock.mockResolvedValueOnce(toolCall({ ...goodInput, summary: "You pay $12.00 a month." }));

    await expect(
      extractTerms({ productText: "Freshly roasted, delivered every month." }),
    ).rejects.toThrow(MoneyInModelOutputError);
  });

  it("refuses a response with no tool result at all", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ choices: [{ message: { content: "Sorry." } }] }), {
        status: 200,
      }),
    );

    await expect(extractTerms({ productText: "Anything." })).rejects.toThrow();
  });
});
