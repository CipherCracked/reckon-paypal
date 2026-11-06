import { money } from "../money.ts";
import type { CommitmentTerms } from "../commitment/types";

/**
 * A bill is a commitment with a deadline. It is modelled with the same terms
 * shape as a product so it goes through the same computation and the same
 * screen (IPD 13, ITD 11) — the only difference is that it is owed by a date
 * rather than bought.
 */
export type Bill = {
  slug: string;
  name: string;
  biller: string;
  /** The biller's own words, including whatever they left out. */
  description: string;
  terms: CommitmentTerms;
  /** Days from issue that the bill falls due. */
  dueInDays: number;
};

export const bills: Bill[] = [
  {
    slug: "clinic-visit",
    name: "Clinic visit",
    biller: "Northside Clinic",
    description:
      "Consultation and two tests. Payment due within 14 days. Late payment and billing questions are handled by our billing office.",
    terms: {
      shape: "one_time",
      itemPrice: money(24000),
      shipping: money(0),
      tax: money(2000),
      // The bill says nothing about what happens if it is unpaid or disputed,
      // which is a fact about the bill, not a gap in our reading.
      exit: { kind: "unknown" },
    },
    dueInDays: 14,
  },
  {
    slug: "car-repair",
    name: "Repair — brake service",
    biller: "Kestrel Motors",
    description:
      "Parts and labour, plus shop supplies. Due 7 days from the invoice date. A 1.5% monthly charge applies to overdue balances.",
    terms: {
      shape: "one_time",
      itemPrice: money(38000),
      shipping: money(2500),
      tax: money(1500),
      exit: { kind: "fee", fee: money(5700) },
    },
    dueInDays: 7,
  },
];

export function findBill(slug: string): Bill | undefined {
  return bills.find((bill) => bill.slug === slug);
}
