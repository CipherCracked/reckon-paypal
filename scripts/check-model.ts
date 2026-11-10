/**
 * Is the model set up? One command, one sentence, one answer.
 *
 *   npm run check-model
 *
 * It sends a two-line bill to whichever endpoint the environment names and
 * reports whether a tool call came back. It prints the endpoint, the model id
 * and the spans — never the key, and never anything about anyone.
 *
 * It also prints how long the answer took, because a model that thinks before
 * it copies can be minutes slower than one that does not, and the only symptom
 * at the page is a timeout that looks like a broken endpoint.
 */
import { aiBaseUrl, aiModel, callTool, isModelConfigured } from "../lib/ai/client.ts";

const SAMPLE = "Trial membership: $4.99 per month for 6 months. Cancel any time, no fee.";

const tool = {
  name: "record_quotations",
  description: "Point at spans in a document. Never compute or restate a figure.",
  parameters: {
    type: "object",
    properties: {
      quotations: {
        type: "array",
        items: {
          type: "object",
          properties: {
            field: { type: "string" },
            quote: { type: "string" },
          },
          required: ["field", "quote"],
        },
      },
    },
    required: ["quotations"],
  },
};

if (!isModelConfigured()) {
  console.error("No model is configured. Set AI_BASE_URL and AI_MODEL (and AI_API_KEY if needed).");
  process.exitCode = 1;
} else {
  console.log(`endpoint: ${aiBaseUrl()}/chat/completions`);
  console.log(`model:    ${aiModel()}`);
  console.log(`key:      ${process.env.AI_API_KEY?.trim() ? "set" : "none"}`);
  // Printed as configured rather than as parsed: an unrecognised value is
  // reported by the call below, which knows the ones it accepts.
  console.log(
    `thinking: ${process.env.AI_REASONING_EFFORT?.trim() || "none (the default)"}`,
  );

  const started = Date.now();
  try {
    const answer = await callTool({
      system:
        "Copy spans from the document exactly as written. Do not compute, convert or restate a figure.",
      user: `Document follows.\n\n<<<DOCUMENT\n${SAMPLE}\nDOCUMENT>>>`,
      tool,
    });
    const elapsed = Date.now() - started;

    const quotations = (answer as { quotations?: Array<{ field?: string; quote?: string }> })
      .quotations;

    if (!Array.isArray(quotations) || quotations.length === 0) {
      console.error(`The model answered in ${elapsed} ms, but returned no spans. Nothing would be read.`);
      process.exitCode = 1;
    } else {
      console.log(`\nanswered in ${elapsed} ms with ${quotations.length} span(s):`);
      for (const quotation of quotations) {
        console.log(`  ${quotation.field}: ${JSON.stringify(quotation.quote)}`);
      }
      console.log(
        "\nWorking. The spans still have to be found in the document before anything is read.",
      );
    }
  } catch (error) {
    console.error(`\nFailed: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  }
}
