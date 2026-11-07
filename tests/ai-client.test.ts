import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  aiBaseUrl,
  aiModel,
  callTool,
  isModelConfigured,
  ModelError,
} from "@/lib/ai/client";

const tool = {
  name: "record_something",
  description: "Record something.",
  parameters: { type: "object", properties: {}, required: [] },
};

const request = { system: "Be exact.", user: "Do the thing.", tool };

function answer(arguments_: unknown): Response {
  return new Response(
    JSON.stringify({
      choices: [
        {
          message: {
            tool_calls: [
              {
                type: "function",
                function: { name: "record_something", arguments: JSON.stringify(arguments_) },
              },
            ],
          },
        },
      ],
    }),
    { status: 200 },
  );
}

const fetchMock = vi.fn();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  vi.stubEnv("AI_MODEL", "a-model");
  vi.stubEnv("AI_BASE_URL", "https://example.test/v1/");
  vi.stubEnv("AI_API_KEY", "a-key");
});

afterEach(() => {
  vi.unstubAllGlobals();
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

describe("callTool", () => {
  it("posts to the chat-completions path under the configured base", async () => {
    fetchMock.mockResolvedValueOnce(answer({ ok: true }));

    await callTool(request);

    expect(fetchMock.mock.calls[0][0]).toBe("https://example.test/v1/chat/completions");
    expect(fetchMock.mock.calls[0][1].method).toBe("POST");
  });

  it("sends the key as a bearer token when there is one", async () => {
    fetchMock.mockResolvedValueOnce(answer({}));

    await callTool(request);

    expect(fetchMock.mock.calls[0][1].headers.authorization).toBe("Bearer a-key");
  });

  it("sends no authorization header when there is no key", async () => {
    vi.stubEnv("AI_API_KEY", "");
    fetchMock.mockResolvedValueOnce(answer({}));

    await callTool(request);

    expect(fetchMock.mock.calls[0][1].headers).not.toHaveProperty("authorization");
  });

  it("carries the system prompt and the user turn as ordinary messages", async () => {
    fetchMock.mockResolvedValueOnce(answer({}));

    await callTool(request);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.messages).toEqual([
      { role: "system", content: "Be exact." },
      { role: "user", content: "Do the thing." },
    ]);
    expect(body.model).toBe("a-model");
  });

  it("returns the parsed tool arguments", async () => {
    fetchMock.mockResolvedValueOnce(answer({ shape: "recurring" }));

    await expect(callTool(request)).resolves.toEqual({ shape: "recurring" });
  });

  it("returns arguments that arrive already parsed", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                tool_calls: [{ type: "function", function: { name: "x", arguments: { a: 1 } } }],
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );

    await expect(callTool(request)).resolves.toEqual({ a: 1 });
  });

  it("refuses prose, so a provider that ignores the tool choice cannot become data", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ choices: [{ message: { content: "Sure!" } }] }), {
        status: 200,
      }),
    );

    await expect(callTool(request)).rejects.toBeInstanceOf(ModelError);
  });

  it("refuses arguments that are not JSON", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                tool_calls: [{ type: "function", function: { name: "x", arguments: "{oops" } }],
              },
            },
          ],
        }),
        { status: 200 },
      ),
    );

    await expect(callTool(request)).rejects.toBeInstanceOf(ModelError);
  });

  it("reports a bad status without quoting the body", async () => {
    fetchMock.mockResolvedValueOnce(new Response("upstream said: adjuster secret", { status: 401 }));

    await expect(callTool(request)).rejects.toThrow("The model endpoint answered 401.");
  });

  it("reports an unreachable endpoint as a model error, not a crash", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("fetch failed"));

    await expect(callTool(request)).rejects.toBeInstanceOf(ModelError);
  });

  it("refuses to call anything when no provider is configured", async () => {
    vi.stubEnv("AI_MODEL", "");

    await expect(callTool(request)).rejects.toBeInstanceOf(ModelError);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
