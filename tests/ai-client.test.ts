import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  aiBaseUrl,
  aiModel,
  callTool,
  isModelConfigured,
  ModelError,
} from "@/lib/ai/client";

const { createMock, clients } = vi.hoisted(() => ({
  createMock: vi.fn(),
  clients: [] as unknown[],
}));

vi.mock("openai", () => ({
  default: class OpenAI {
    chat = { completions: { create: createMock } };
    constructor(options?: unknown) {
      clients.push(options);
    }
  },
}));

const tool = {
  name: "record_something",
  description: "Record something.",
  parameters: { type: "object", properties: {}, required: [] },
};

const request = { system: "Be exact.", user: "Do the thing.", tool };

function answer(arguments_: string | object): unknown {
  return {
    choices: [
      {
        message: {
          tool_calls: [
            {
              type: "function",
              function: {
                name: "record_something",
                arguments: typeof arguments_ === "string" ? arguments_ : JSON.stringify(arguments_),
              },
            },
          ],
        },
      },
    ],
  };
}

beforeEach(() => {
  createMock.mockReset();
  clients.length = 0;
  vi.stubEnv("AI_MODEL", "a-model");
  vi.stubEnv("AI_BASE_URL", "https://example.test/v1/");
  vi.stubEnv("AI_API_KEY", "a-key");
  vi.stubEnv("AI_REASONING_EFFORT", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("configuration", () => {
  it("reads the model id from the environment", () => {
    expect(aiModel()).toBe("a-model");
  });

  it("trims a trailing slash so the endpoint is not doubled", () => {
    expect(aiBaseUrl()).toBe("https://example.test/v1");
  });

  it("is not configured until a model and an endpoint are both named", () => {
    vi.stubEnv("AI_MODEL", "  ");
    expect(isModelConfigured()).toBe(false);

    vi.stubEnv("AI_MODEL", "a-model");
    vi.stubEnv("AI_BASE_URL", "");
    expect(isModelConfigured()).toBe(false);
  });

  it("needs no key, so a model running on this machine still works", () => {
    vi.stubEnv("AI_API_KEY", "");
    expect(isModelConfigured()).toBe(true);
  });
});

describe("reasoning effort", () => {
  function sent(): Record<string, unknown> {
    return createMock.mock.calls[0][0] as Record<string, unknown>;
  }

  it("turns thinking off when the setting is unset, because reading is copying", async () => {
    createMock.mockResolvedValueOnce(answer({}));

    await callTool(request);

    expect(sent().reasoning).toEqual({ enabled: false });
  });

  it("turns thinking off when the setting is none", async () => {
    vi.stubEnv("AI_REASONING_EFFORT", "none");
    createMock.mockResolvedValueOnce(answer({}));

    await callTool(request);

    expect(sent().reasoning).toEqual({ enabled: false });
  });

  it("sends no reasoning field at all when the setting is default", async () => {
    vi.stubEnv("AI_REASONING_EFFORT", "default");
    createMock.mockResolvedValueOnce(answer({}));

    await callTool(request);

    // Not "false", not null — the key is absent, so an endpoint that has never
    // heard of the field still receives the request it understands.
    expect("reasoning" in sent()).toBe(false);
  });

  it("asks for a graded effort when given one", async () => {
    vi.stubEnv("AI_REASONING_EFFORT", "low");
    createMock.mockResolvedValueOnce(answer({}));

    await callTool(request);

    expect(sent().reasoning).toEqual({ effort: "low" });
  });

  it("accepts the value in any case, with surrounding space", async () => {
    vi.stubEnv("AI_REASONING_EFFORT", "  MEDIUM  ");
    createMock.mockResolvedValueOnce(answer({}));

    await callTool(request);

    expect(sent().reasoning).toEqual({ effort: "medium" });
  });

  it("refuses a value it does not understand, naming the ones it does", async () => {
    vi.stubEnv("AI_REASONING_EFFORT", "highest");

    await expect(callTool(request)).rejects.toThrow(/AI_REASONING_EFFORT is "highest"/);
    await expect(callTool(request)).rejects.toThrow(/default, none, minimal, low, medium, high/);
  });

  it("does not reach the endpoint when the setting is not understood", async () => {
    vi.stubEnv("AI_REASONING_EFFORT", "fast");

    await expect(callTool(request)).rejects.toBeInstanceOf(ModelError);
    expect(createMock).not.toHaveBeenCalled();
  });
});

describe("callTool", () => {
  it("points the client at the configured endpoint, with a key or a placeholder", async () => {
    createMock.mockResolvedValueOnce(answer({ ok: true }));

    await callTool(request);

    expect(clients[0]).toMatchObject({ baseURL: "https://example.test/v1", apiKey: "a-key" });
  });

  it("gives a local server a key it will not check", async () => {
    vi.stubEnv("AI_API_KEY", "");
    createMock.mockResolvedValueOnce(answer({}));

    await callTool(request);

    expect(clients[0]).toMatchObject({ apiKey: "not-needed" });
  });

  it("leaves retries and the timeout to the client rather than hand-rolling them", async () => {
    createMock.mockResolvedValueOnce(answer({}));

    await callTool(request);

    expect(clients[0]).toMatchObject({ maxRetries: 2, timeout: 45_000 });
  });

  it("carries the system prompt and the user turn as ordinary messages", async () => {
    createMock.mockResolvedValueOnce(answer({}));

    await callTool(request);

    const body = createMock.mock.calls[0][0];
    expect(body.messages).toEqual([
      { role: "system", content: "Be exact." },
      { role: "user", content: "Do the thing." },
    ]);
    expect(body.model).toBe("a-model");
  });

  it("forces the one tool it was given", async () => {
    createMock.mockResolvedValueOnce(answer({}));

    await callTool(request);

    const body = createMock.mock.calls[0][0];
    expect(body.tool_choice).toEqual({
      type: "function",
      function: { name: "record_something" },
    });
    expect(body.tools[0].function.parameters).toEqual(tool.parameters);
  });

  it("returns the parsed tool arguments", async () => {
    createMock.mockResolvedValueOnce(answer({ shape: "recurring" }));

    await expect(callTool(request)).resolves.toEqual({ shape: "recurring" });
  });

  it("refuses prose, so a provider that ignores the tool choice cannot become data", async () => {
    createMock.mockResolvedValueOnce({ choices: [{ message: { content: "Sure!" } }] });

    await expect(callTool(request)).rejects.toBeInstanceOf(ModelError);
  });

  it("refuses arguments that are not JSON", async () => {
    createMock.mockResolvedValueOnce(answer("{oops"));

    await expect(callTool(request)).rejects.toBeInstanceOf(ModelError);
  });

  it("reports the status of a refusal and nothing else", async () => {
    createMock.mockRejectedValueOnce(
      Object.assign(new Error("upstream said: adjuster secret"), { status: 401 }),
    );

    await expect(callTool(request)).rejects.toThrow("The model endpoint answered 401.");
  });

  it("says when the model did not answer in time", async () => {
    createMock.mockRejectedValueOnce(Object.assign(new Error("timeout"), { name: "APIConnectionTimeoutError" }));

    await expect(callTool(request)).rejects.toThrow(/did not answer in time/);
  });

  it("reports an unreachable endpoint as a model error, not a crash", async () => {
    createMock.mockRejectedValueOnce(new TypeError("fetch failed"));

    await expect(callTool(request)).rejects.toBeInstanceOf(ModelError);
  });

  it("refuses to call anything when no provider is configured", async () => {
    vi.stubEnv("AI_MODEL", "");

    await expect(callTool(request)).rejects.toBeInstanceOf(ModelError);
    expect(createMock).not.toHaveBeenCalled();
  });
});
