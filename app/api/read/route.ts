import { readDocumentWithModel } from "@/lib/ai/read-document";
import { ModelError } from "@/lib/ai/client";
import { findCandidates } from "@/lib/document/candidates";
import { normaliseText } from "@/lib/document/normalise";
import { presentReading, readQuotations } from "@/lib/document/read";
import { verifyQuotations } from "@/lib/document/verify";

/** Long enough for a real bill, short enough that the page stays usable. */
const MIN_LENGTH = 40;
const MAX_LENGTH = 20_000;

type ReadRequestBody = { text?: unknown };

async function readBody(request: Request): Promise<ReadRequestBody | null> {
  try {
    const body = (await request.json()) as unknown;
    return typeof body === "object" && body !== null ? (body as ReadRequestBody) : null;
  } catch {
    return null;
  }
}

function candidatesResponse(text: string, notice: string) {
  return Response.json({
    mode: "candidates" as const,
    notice,
    candidates: findCandidates(text),
  });
}

export async function POST(request: Request) {
  const body = await readBody(request);
  const text = typeof body?.text === "string" ? body.text.trim() : "";

  if (text.length < MIN_LENGTH) {
    return Response.json(
      { error: `Paste at least ${MIN_LENGTH} characters — a document short enough to be one line is short enough to read yourself.` },
      { status: 400 },
    );
  }

  if (text.length > MAX_LENGTH) {
    return Response.json(
      { error: `That is longer than ${MAX_LENGTH.toLocaleString("en-US")} characters. Paste the part that says what you owe.` },
      { status: 400 },
    );
  }

  let reading;
  try {
    reading = await readDocumentWithModel({ text });
  } catch (error) {
    // The reason is logged without the document: a failure that cannot be
    // diagnosed turns every bad key into "this document could not be read".
    console.warn(
      "POST /api/read — reading failed:",
      error instanceof Error ? `${error.name}: ${error.message}` : String(error),
    );

    const notice =
      error instanceof ModelError && error.message.startsWith("No model")
        ? "No model is configured here, so nothing was interpreted. These are the amounts written in your document, exactly as they appear."
        : "The document could not be interpreted, so nothing was guessed. These are the amounts written in it, exactly as they appear.";

    return candidatesResponse(text, notice);
  }

  const { accepted, rejected } = verifyQuotations(reading.quotations, normaliseText(text));
  const parsed = readQuotations(accepted);

  if (!parsed) {
    return candidatesResponse(
      text,
      accepted.length === 0
        ? "Nothing in this document could be matched to a commitment, so nothing was interpreted. These are the amounts written in it, exactly as they appear."
        : "The document does not state enough to work out a commitment, so no total was computed. These are the amounts written in it, exactly as they appear.",
    );
  }

  const view = presentReading(parsed);

  return Response.json({
    mode: "read" as const,
    summary: reading.summary,
    figures: view.figures,
    breakdown: view.breakdown,
    notes: view.notes,
    sources: parsed.sources,
    schedule: parsed.schedule,
    dueDate: parsed.dueDate,
    stated: parsed.stated,
    quotationCount: accepted.length,
    rejected,
  });
}
