import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readDocumentWithModel, UnreadableDocumentError } from "@/lib/ai/read-document";

const document = `Monthly plan: $35.00 per month for 12 months. Setup fee: $10.00.`;

const goodSpans = [
  { field: "amountPerPeriod", quote: "Monthly plan: $35.00 per month for 12 months." },
  { field: "oneTimeExtra", quote: "Setup fee: $10.00" },
];

function toolCall(arguments_: unknown): Response {
  return new Response(
    JSON.stringify({
      choices: [
        {
          message: {
            tool_calls: [
              {
                type: "function",
                function: { name: "record_quotations", arguments: JSON.stringify(arguments_) },
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

describe("readDocumentWithModel", () => {
  it("forces the model to answer with spans rather than prose", async () => {
    fetchMock.mockResolvedValueOnce(toolCall({ quotations: goodSpans, summary: "A plan." }));

    await readDocumentWithModel({ text: document });

    const request = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(request.tool_choice).toEqual({
      type: "function",
      function: { name: "record_quotations" },
    });
    const parameters = request.tools[0].function.parameters;
    expect(parameters.properties).not.toHaveProperty("amount");
    expect(parameters.properties.quotations.items.properties).not.toHaveProperty("amount");
  });

  it("keeps verified spans when the summary names a figure", async () => {
    fetchMock.mockResolvedValueOnce(
      toolCall({
        quotations: goodSpans,
        summary: "The repeating amount is the monthly plan charge of $35.00 per month.",
      }),
    );

    const reading = await readDocumentWithModel({ text: document });

    expect(reading.quotations).toEqual(goodSpans);
    expect(reading.summary).toBe("");
  });

  it("keeps a summary that names no figure", async () => {
    fetchMock.mockResolvedValueOnce(
      toolCall({ quotations: goodSpans, summary: "A monthly plan you can leave." }),
    );

    const reading = await readDocumentWithModel({ text: document });

    expect(reading.summary).toBe("A monthly plan you can leave.");
  });

  it("reads arguments that arrive already parsed", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                tool_calls: [
                  {
                    type: "function",
                    function: { name: "record_quotations", arguments: { quotations: goodSpans } },
                  },
                ],
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const reading = await readDocumentWithModel({ text: document });

    expect(reading.quotations).toEqual(goodSpans);
  });

  it("drops spans that name a field we do not read", async () => {
    fetchMock.mockResolvedValueOnce(
      toolCall({
        quotations: [...goodSpans, { field: "interestRate", quote: "Setup fee: $10.00" }],
        summary: "",
      }),
    );

    const reading = await readDocumentWithModel({ text: document });

    expect(reading.quotations).toEqual(goodSpans);
  });

  it("throws when no span survives", async () => {
    fetchMock.mockResolvedValueOnce(
      toolCall({ quotations: [{ field: "totalDue", quote: "  " }], summary: "" }),
    );

    await expect(readDocumentWithModel({ text: document })).rejects.toBeInstanceOf(
      UnreadableDocumentError,
    );
  });

  it("throws when the model returns no tool result at all", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ choices: [{ message: { content: "Sorry." } }] }), {
        status: 200,
      }),
    );

    await expect(readDocumentWithModel({ text: document })).rejects.toThrow(/tool call/);
  });

  it("refuses to call anything when no provider is configured", async () => {
    vi.stubEnv("AI_MODEL", "");

    await expect(readDocumentWithModel({ text: document })).rejects.toThrow(/No model is configured/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
