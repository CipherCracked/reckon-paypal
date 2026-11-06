import { formatMoney, fromDecimalString, type Currency, type Money } from "@/lib/money";
import { paypalRequest, toPayPalAmount } from "./client";

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

  const created = await paypalRequest<InvoiceJson>("/v2/invoicing/invoices", {
    method: "POST",
    body: JSON.stringify({
      detail: {
        currency_code: draft.amount.currency,
        invoice_number: draft.reference,
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

  if (!created.id) {
    throw new Error("PayPal did not return an invoice id.");
  }

  const returned = parseAmount(created.amount);
  if (returned && returned.minor !== draft.amount.minor) {
    throw new Error(
      `PayPal returned ${formatMoney(returned)}, but ${formatMoney(draft.amount)} was requested.`,
    );
  }

  const sent = await paypalRequest<InvoiceJson>(`/v2/invoicing/invoices/${created.id}/send`, {
    method: "POST",
    body: JSON.stringify({ send_to_recipient: false }),
  });

  const payerUrl =
    findLink(sent.links, "payer-view", "self") ?? findLink(created.links, "payer-view", "self");

  return {
    id: created.id,
    status: sent.status ?? created.status ?? "SENT",
    amount: returned ?? draft.amount,
    dueDate: created.detail?.payment_term?.due_date ?? dueDate,
    payerUrl,
    missingLink: payerUrl === null,
  };
}
