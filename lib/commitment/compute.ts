import { addMoney, multiplyMoney, zeroMoney, type Money } from "../money.ts";
import type {
  CommitmentTerms,
  CommitmentTranslation,
  ExitTerms,
  UnstatedPart,
} from "./types";

function translateExit(exit: ExitTerms): Money | null {
  switch (exit.kind) {
    case "none":
      return zeroMoney();
    case "fee":
      return exit.fee;
    case "unknown":
      return null;
  }
}

function assertRepeats(count: number, label: string): void {
  if (!Number.isInteger(count) || count < 1) {
    throw new RangeError(`${label} must be a whole number of at least 1, received ${count}`);
  }
}

/** Adds what the source stated, and nothing for what it did not. */
function stated(amount: Money | null): Money {
  return amount ?? zeroMoney();
}

/**
 * The parts no source stated. Reading a `null` as zero is how a page tells a
 * shopper "$179.95 is the whole charge" when the retailer will add shipping and
 * tax at checkout, so the totals are floors whenever this is non-empty.
 */
function unstatedParts(terms: CommitmentTerms): UnstatedPart[] {
  const parts: UnstatedPart[] = [];
  if (terms.shipping === null) parts.push("shipping");
  if (terms.tax === null) parts.push("tax");
  return parts;
}

export function computeCommitment(terms: CommitmentTerms): CommitmentTranslation {
  const breakdown = {
    item: terms.itemPrice,
    shipping: terms.shipping,
    tax: terms.tax,
    fee: terms.openingFee ?? null,
  };
  const unstated = unstatedParts(terms);
  const exit = translateExit(terms.exit);
  // Charged once, whenever the commitment starts — so it is in today's charge
  // and in the term total exactly once, whatever the shape.
  const fee = stated(terms.openingFee ?? null);

  switch (terms.shape) {
    case "one_time": {
      const today = addMoney(
        addMoney(addMoney(terms.itemPrice, stated(terms.shipping)), stated(terms.tax)),
        fee,
      );
      return {
        today,
        acrossTerm: today,
        perPeriod: today,
        exit,
        breakdown,
        unstated,
      };
    }

    case "recurring": {
      const { recurrence } = terms;
      if (!recurrence) {
        throw new Error("A recurring commitment needs a recurrence");
      }
      assertRepeats(recurrence.count, "Recurrence count");

      // Shipping is charged once; the item and its tax repeat every period.
      const perPeriod = addMoney(terms.itemPrice, stated(terms.tax));
      const today = addMoney(addMoney(perPeriod, stated(terms.shipping)), fee);
      const acrossTerm = addMoney(today, multiplyMoney(perPeriod, recurrence.count - 1));

      return { today, acrossTerm, perPeriod, exit, breakdown, unstated };
    }

    case "financed": {
      const { installment } = terms;
      if (!installment) {
        throw new Error("A financed commitment needs an instalment plan");
      }
      assertRepeats(installment.count, "Instalment count");

      // An opening fee is taken with the first instalment, not spread across
      // the term: that is what "plus a $60.00 origination fee" means, and it is
      // how PayPal collects a plan's `setup_fee`. So it is in today's charge.
      const today = addMoney(installment.amount, fee);
      const acrossTerm = addMoney(
        multiplyMoney(installment.amount, installment.count),
        fee,
      );

      // The rows explain *today's* charge on every other shape, so they do
      // here too: one instalment plus the opening fee, and the cash price is
      // not a part of it. Showing the cash price here put $1,200.00 under a
      // $1,320.00 total and a $105.00 charge — three numbers a reader could not
      // reconcile, on a screen that exists to let them be reconciled.
      const financedBreakdown = {
        item: installment.amount,
        shipping: zeroMoney(),
        tax: zeroMoney(),
        fee: terms.openingFee ?? null,
      };

      return {
        today,
        acrossTerm,
        perPeriod: installment.amount,
        exit,
        breakdown: financedBreakdown,
        unstated,
      };
    }

    default:
      throw new Error(`Unsupported commitment shape: ${String(terms.shape)}`);
  }
}
