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
  /**
   * Attempts beyond the first. A caller rendering a page passes 0: the page is
   * waiting on this answer, so a second attempt is more waiting, not more care.
   */
  retries?: number;
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

/**
 * How much a reasoning model may think before it answers, from
 * `AI_REASONING_EFFORT`.
 *
 * **Unset means `none`.** Reading a document is copying — the prompt says never
 * to compute, the schema has no monetary field, and the answer is a handful of
 * verbatim spans — so thinking cannot improve it, and a model that thinks first
 * makes the page wait for tokens nobody asked for. Measured: 68.6 s against
 * 3.1 s for the same answer.
 *
 * `default` is the escape hatch back to sending no such field, for a provider
 * that has never heard of `reasoning` and would rather choose for itself.
 *
 * Worth knowing before using a graded value: it is a request, not an
 * instruction. Measured against one free model, `effort: "low"` was accepted
 * and silently ignored, and the model still spent 1,183 reasoning tokens.
 * `none` was honoured.
 *
 * An unrecognised value is an error rather than silence. A typo would otherwise
 * look identical to a slow model: the endpoint thinks at full length, and the
 * page times out with nothing on screen to say why.
 */
const REASONING_EFFORTS = ["default", "none", "minimal", "low", "medium", "high"] as const;

export type ReasoningEffort = (typeof REASONING_EFFORTS)[number];

export function aiReasoningEffort(): ReasoningEffort {
  const raw = (process.env.AI_REASONING_EFFORT ?? "").trim().toLowerCase();
  if (!raw) return "none";

  const effort = REASONING_EFFORTS.find((known) => known === raw);
  if (!effort) {
    throw new ModelError(
      `AI_REASONING_EFFORT is "${raw}". It must be one of: ${REASONING_EFFORTS.join(", ")}. Unset means none; "default" lets the provider choose.`,
    );
  }
  return effort;
}

/**
 * The wire form. `enabled: false` is the only way to say "do not think"; the
 * graded values travel as `effort`; `default` says nothing at all.
 */
type ReasoningField = { enabled: false } | { effort: Exclude<ReasoningEffort, "default" | "none"> };

function reasoningField(effort: ReasoningEffort): ReasoningField | null {
  if (effort === "default") return null;
  return effort === "none" ? { enabled: false } : { effort };
}

/** The typed request, plus the one field the interchange format does not define. */
type ChatParams = OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming & {
  reasoning?: ReasoningField;
};

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
  // The caller's own deadline ran out. This is not the seller's silence and not
  // the endpoint's failure — it is us choosing to stop waiting.
  if (name === "APIUserAbortError") return "The model did not answer in time.";

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

  // Read before the request is attempted, so a mistyped setting is reported as
  // itself rather than as an endpoint that could not be reached.
  const reasoning = reasoningField(aiReasoningEffort());

  const params: ChatParams = {
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
    // `default` omits the field entirely, which is what an endpoint that has
    // never heard of it needs to see.
    ...(reasoning ? { reasoning } : {}),
  };

  let completion;
  try {
    completion = await createClient().chat.completions.create(params, {
      // Per-request, so a caller with a budget overrides the client's defaults.
      maxRetries: request.retries,
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
