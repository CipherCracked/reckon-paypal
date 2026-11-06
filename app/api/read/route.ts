import { UnreadableDocumentError, readDocumentWithModel } from "@/lib/ai/read-document";
import { findCandidates } from "@/lib/document/candidates";
import { containsQuote, normaliseText } from "@/lib/document/normalise";
import { presentReading, readQuotations } from "@/lib/document/read";
import type { ModelQuotation } from "@/lib/ai/read-document";

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

/**
 * Every quotation the model offers is checked against the text the shopper
 * supplied before it can be read out of. A span that is not really there is
 * discarded and counted — the count is reported because it is the one number
 * that shows the reading was verified rather than trusted.
 */
function verify(
  quotations: ModelQuotation[],
  normalisedDocument: string,
): { accepted: ModelQuotation[]; rejected: number } {
  const accepted: ModelQuotation[] = [];
  let rejected = 0;

  for (const quotation of quotations) {
    if (containsQuote(normalisedDocument, quotation.quote)) {
      accepted.push(quotation);
    } else {
      rejected += 1;
    }
  }

  return { accepted, rejected };
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
    const notice =
      error instanceof UnreadableDocumentError && error.message.startsWith("No model")
        ? "No model is configured here, so nothing was interpreted. These are the amounts written in your document, exactly as they appear."
        : "The document could not be interpreted, so nothing was guessed. These are the amounts written in it, exactly as they appear.";

    return candidatesResponse(text, notice);
  }

  const { accepted, rejected } = verify(reading.quotations, normaliseText(text));
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
