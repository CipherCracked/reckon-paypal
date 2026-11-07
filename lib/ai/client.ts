import OpenAI from "openai";

/**
 * One way to ask a model a question, over one interchange format.
 *
 * The app speaks the chat-completions dialect with function calling — the format
 * nearly every provider serves. The SDK below carries one vendor's name on its
 * import; the endpoint, the key and the model id do not, so pointing this at
 * another provider is a configuration change and nothing else.
 *
 * The SDK is used for what an SDK is for — retries, timeouts, error classes —
 * and for nothing else. It does not decide what the model may say; that is the
 * callers' schemas and `guard.ts`, and the server checks the answers itself.
 */

const TIMEOUT_MS = 45_000;

/** Retried by the client on 408, 409, 429 and 5xx, with backoff that honours `Retry-After`. */
const MAX_RETRIES = 2;

export type ToolDefinition = {
  name: string;
  description: string;
  /** JSON Schema for the tool's arguments. */
  parameters: Record<string, unknown>;
};

export type ToolRequest = {
  system: string;
  user: string;
  tool: ToolDefinition;
};

export class ModelError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "ModelError";
  }
}

export function aiModel(): string {
  return process.env.AI_MODEL?.trim() ?? "";
}

/** The base URL of an endpoint that serves `POST {base}/chat/completions`. */
export function aiBaseUrl(): string {
  return (process.env.AI_BASE_URL?.trim() ?? "").replace(/\/+$/, "");
}

/** Whether a provider has been chosen at all — the difference between "not set up" and "said no". */
export function isModelConfigured(): boolean {
  return aiModel().length > 0 && aiBaseUrl().length > 0;
}

function createClient(): OpenAI {
  const apiKey = process.env.AI_API_KEY?.trim();

  return new OpenAI({
    // A server on this machine asks for a key and never checks it.
    apiKey: apiKey || "not-needed",
    baseURL: aiBaseUrl(),
    timeout: TIMEOUT_MS,
    maxRetries: MAX_RETRIES,
  });
}

/**
 * The status is all we report. An error body can echo the request, and the
 * request contains someone's document.
 */
function describeFailure(error: unknown): string {
  const status = (error as { status?: unknown }).status;
  if (typeof status === "number") return `The model endpoint answered ${status}.`;

  const name = error instanceof Error ? error.name : "";
  if (name === "APIConnectionTimeoutError") return "The model did not answer in time.";

  return "The model endpoint could not be reached.";
}

/**
 * Asks the model to fill in one tool call, and hands back whatever arguments it
 * produced. The caller owns the schema, the checks and the consequences; this
 * function owns the wire, the retries and the "did it actually answer" question.
 */
export async function callTool(request: ToolRequest): Promise<unknown> {
  if (!isModelConfigured()) {
    throw new ModelError("No model is configured for this deployment.");
  }

  let completion;
  try {
    completion = await createClient().chat.completions.create({
      model: aiModel(),
      messages: [
        { role: "system", content: request.system },
        { role: "user", content: request.user },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: request.tool.name,
            description: request.tool.description,
            parameters: request.tool.parameters,
          },
        },
      ],
      // The model has no other permitted answer. A provider that ignores this
      // returns prose, which fails the check below rather than becoming data.
      tool_choice: { type: "function", function: { name: request.tool.name } },
    });
  } catch (error) {
    throw new ModelError(describeFailure(error));
  }

  const toolCall = completion.choices?.[0]?.message?.tool_calls?.[0];
  const args = toolCall?.type === "function" ? toolCall.function.arguments : undefined;

  if (!args) {
    throw new ModelError("The model returned words instead of a tool call.");
  }

  try {
    return JSON.parse(args) as unknown;
  } catch {
    throw new ModelError("The model's tool call was not valid JSON.");
  }
}
