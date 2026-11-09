import { formatMoney, fromDecimalString, type Currency, type Money } from "@/lib/money";
import { paypalRequest, paypalRequestDetailed, toPayPalAmount } from "./client";
import { retrieveInvoice } from "./retrieve";

export type InvoiceDraft = {
  /** Our own reference (a slug), echoed by PayPal so a bill can be traced back. */
  reference: string;
  description: string;
  amount: Money;
  /** Days from today the bill falls due. */
  dueInDays: number;
};

export type PayPalInvoice = {
  id: string;
  status: string;
  amount: Money;
  dueDate: string | null;
  /** The PayPal-hosted page the payer opens to settle the bill. */
  payerUrl: string | null;
  /** Why no link came back, when that is the case — a bill nobody can open is not a bill. */
  missingLink: boolean;
};

type PayPalAmountJson = { currency_code?: string; value?: string };
type PayPalLink = { href?: string; rel?: string };

type InvoiceJson = {
  id?: string;
  status?: string;
  amount?: PayPalAmountJson;
  links?: PayPalLink[];
  detail?: { payment_term?: { due_date?: string } };
};

function parseAmount(amount: PayPalAmountJson | undefined): Money | null {
  if (!amount?.value || !amount.currency_code) return null;
  if (amount.currency_code !== "USD") {
    throw new Error(`Unsupported PayPal currency: ${amount.currency_code}`);
  }
  return fromDecimalString(amount.value, amount.currency_code as Currency);
}

function addDays(from: Date, days: number): string {
  const date = new Date(from.getTime());
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function findLink(links: PayPalLink[] | undefined, ...rels: string[]): string | null {
  for (const rel of rels) {
    const href = links?.find((link) => link.rel === rel)?.href;
    if (href) return href;
  }
  return null;
}

/**
 * Creates a bill on the biller's PayPal account and sends it, returning the
 * page the payer opens. The amount PayPal records is checked against the one we
 * meant to charge: a screen showing a figure the processor never agreed to is
 * worse than no screen.
 */
export async function createInvoice(
  draft: InvoiceDraft,
  now: Date = new Date(),
): Promise<PayPalInvoice> {
  const dueDate = addDays(now, draft.dueInDays);
  // PayPal refuses a second invoice with a number it has already seen, so the
  // reference is unique per issuance — otherwise the same bill could only ever
  // be opened once, and every later attempt would fail with no way to tell why.
  // The slug stays at the front so a bill can still be traced back to its terms.
  const invoiceNumber = `${draft.reference}-${now.getTime().toString(36)}`;

  const created = await paypalRequestDetailed<InvoiceJson>("/v2/invoicing/invoices", {
    method: "POST",
    body: JSON.stringify({
      detail: {
        currency_code: draft.amount.currency,
        invoice_number: invoiceNumber,
        payment_term: { term_type: "DUE_ON_DATE_SPECIFIED", due_date: dueDate },
        note: draft.description,
      },
      items: [
        {
          name: draft.description,
          quantity: "1",
          unit_amount: toPayPalAmount(draft.amount),
        },
      ],
    }),
  });

  // PayPal answers this create with 201 and the new invoice's URL in `Location`,
  // sometimes with a body too. Reading only the body lost every bill we created.
  const createdId = created.body.id ?? idFromLocation(created.location);
  if (!createdId) {
    throw new Error("PayPal did not return an invoice id.");
  }

  // The create answers with an id and can answer with no body at all, so an
  // absent amount is read back rather than assumed: comparing our own figure to
  // itself would let the check below pass without PayPal having said anything.
  let returned = parseAmount(created.body.amount);
  if (!returned) {
    try {
      returned = (await retrieveInvoice(createdId)).amount;
    } catch {
      // Still unknown. `amount` below falls back to the requested figure, which
      // is the one this invoice was created from.
    }
  }

  if (returned && returned.minor !== draft.amount.minor) {
    throw new Error(
      `PayPal returned ${formatMoney(returned)}, but ${formatMoney(draft.amount)} was requested.`,
    );
  }

  const sent = await paypalRequest<InvoiceJson>(`/v2/invoicing/invoices/${createdId}/send`, {
    method: "POST",
    body: JSON.stringify({ send_to_recipient: false }),
  });

  // Only `payer-view` is a payer's page. The `self` link in the same reply is
  // the REST resource, and handing that to the bill page would label a JSON
  // response "Pay this bill at PayPal".
  let payerUrl =
    findLink(sent.links, "payer-view") ?? findLink(created.body.links, "payer-view");

  // Sending an invoice does not return the payer's page in every case, but the
  // bill does have one — so the bill is read back before it is called unpayable.
  if (!payerUrl) {
    try {
      payerUrl = (await retrieveInvoice(createdId)).payerUrl;
    } catch {
      // A bill that cannot be read back still exists; `missingLink` says so.
    }
  }

  return {
    id: createdId,
    status: sent.status ?? created.body.status ?? "SENT",
    amount: returned ?? draft.amount,
    dueDate: created.body.detail?.payment_term?.due_date ?? dueDate,
    payerUrl,
    missingLink: payerUrl === null,
  };
}

/** `…/v2/invoicing/invoices/INV2-XXXX` → `INV2-XXXX`. */
function idFromLocation(location: string | null): string | null {
  if (!location) return null;
  const last = location.split("/").filter(Boolean).pop();
  return last && last !== "invoices" ? decodeURIComponent(last) : null;
}
