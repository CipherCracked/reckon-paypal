/**
 * One way to ask a model a question, over one interchange format.
 *
 * The app speaks the chat-completions dialect with function calling, because it
 * is the format nearly every provider serves — a hosted model, an aggregator, a
 * proxy, or a daemon running on this laptop. No vendor is named here: the
 * endpoint, the key and the model id all come from the environment, so switching
 * provider is a configuration change and never a code change.
 *
 * Two rules this file keeps, so nothing above it has to think about them:
 * - A tool call is the only accepted answer. Prose is a failure, not a reading.
 * - Nothing about a document or a shopper is logged or embedded in an error.
 */

const TIMEOUT_MS = 45_000;
const USER_AGENT = "accessible-commerce-companion/0.1.0";

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

function describe(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return "unknown error";
}

/**
 * Asks the model to fill in one tool call, and hands back whatever arguments it
 * produced. The caller owns the schema, the checks and the consequences; this
 * function owns the wire, the timeout and the "did it actually answer" question.
 */
export async function callTool(request: ToolRequest): Promise<unknown> {
  if (!isModelConfigured()) {
    throw new ModelError("No model is configured for this deployment.");
  }

  const apiKey = process.env.AI_API_KEY?.trim();

  let response: Response;
  try {
    response = await fetch(`${aiBaseUrl()}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": USER_AGENT,
        ...(apiKey ? { authorization: `Bearer ${apiKey}` } : {}),
      },
      body: JSON.stringify({
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
        parallel_tool_calls: false,
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    throw new ModelError(`The model endpoint could not be reached (${describe(error)}).`);
  }

  if (!response.ok) {
    throw new ModelError(`The model endpoint answered ${response.status}.`);
  }

  const payload = (await response.json().catch(() => null)) as {
    choices?: Array<{ message?: { tool_calls?: Array<{ function?: { name?: string; arguments?: unknown } }> } }>;
  } | null;

  const call = payload?.choices?.[0]?.message?.tool_calls?.[0];
  if (!call) {
    throw new ModelError("The model returned words instead of a tool call.");
  }

  const args = call.function?.arguments;

  // The format says a JSON string; some providers hand back the object already.
  if (typeof args === "string") {
    try {
      return JSON.parse(args) as unknown;
    } catch {
      throw new ModelError("The model's tool call was not valid JSON.");
    }
  }

  if (args && typeof args === "object") return args;

  throw new ModelError("The model's tool call carried no arguments.");
}
