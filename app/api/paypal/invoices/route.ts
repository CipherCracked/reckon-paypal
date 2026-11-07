import { findBill } from "@/lib/catalog/bills";
import { computeCommitment } from "@/lib/commitment/compute";
import { presentFigures } from "@/lib/commitment/present";
import { PayPalError } from "@/lib/paypal/client";
import { createInvoice } from "@/lib/paypal/invoices";

type InvoiceRequestBody = { slug?: unknown };

async function readBody(request: Request): Promise<InvoiceRequestBody | null> {
  try {
    const body = (await request.json()) as unknown;
    return typeof body === "object" && body !== null ? (body as InvoiceRequestBody) : null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const body = await readBody(request);
  const slug = typeof body?.slug === "string" ? body.slug : null;
  const bill = slug ? findBill(slug) : undefined;

  if (!bill) {
    return Response.json({ error: "Unknown bill." }, { status: 404 });
  }

  const translation = computeCommitment(bill.terms);

  try {
    const invoice = await createInvoice({
      reference: bill.slug,
      description: `${bill.biller} — ${bill.name}`,
      amount: translation.today,
      dueInDays: bill.dueInDays,
    });

    return Response.json({
      invoiceId: invoice.id,
      dueDate: invoice.dueDate,
      payerUrl: invoice.payerUrl,
      missingLink: invoice.missingLink,
      productName: `${bill.biller} — ${bill.name}`,
      productText: bill.description,
      translation,
      // The same projection the consent screen renders, from the same terms.
      figures: presentFigures(bill.terms, translation),
    });
  } catch (error) {
    // Logged because a 502 with no reason makes every failure look the same: a
    // bad credential, a rejected date and a drifted amount all reach here.
    console.warn(
      "POST /api/paypal/invoices — invoice failed:",
      error instanceof Error ? `${error.name}: ${error.message}` : String(error),
    );

    const message =
      error instanceof PayPalError
        ? `PayPal could not create this bill (${error.issue ?? error.status}).`
        : `PayPal could not create this bill.`;

    return Response.json({ error: message }, { status: 502 });
  }
}
