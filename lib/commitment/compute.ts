import { addMoney, multiplyMoney, zeroMoney, type Money } from "../money.ts";
import type { CommitmentTerms, CommitmentTranslation, ExitTerms } from "./types";

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

export function computeCommitment(terms: CommitmentTerms): CommitmentTranslation {
  const breakdown = {
    item: terms.itemPrice,
    shipping: terms.shipping,
    tax: terms.tax,
  };
  const exit = translateExit(terms.exit);

  switch (terms.shape) {
    case "one_time": {
      const today = addMoney(addMoney(terms.itemPrice, terms.shipping), terms.tax);
      return {
        today,
        acrossTerm: today,
        exit,
        breakdown,
      };
    }

    case "recurring": {
      const { recurrence } = terms;
      if (!recurrence) {
        throw new Error("A recurring commitment needs a recurrence");
      }
      assertRepeats(recurrence.count, "Recurrence count");

      const today = addMoney(addMoney(terms.itemPrice, terms.shipping), terms.tax);
      // Shipping is charged once; the item and its tax repeat every period.
      const perPeriod = addMoney(terms.itemPrice, terms.tax);
      const acrossTerm = addMoney(today, multiplyMoney(perPeriod, recurrence.count - 1));

      return { today, acrossTerm, exit, breakdown };
    }

    case "financed": {
      const { installment } = terms;
      if (!installment) {
        throw new Error("A financed commitment needs an instalment plan");
      }
      assertRepeats(installment.count, "Instalment count");

      const today = installment.amount;
      const acrossTerm = addMoney(
        multiplyMoney(installment.amount, installment.count),
        installment.fee,
      );

      return { today, acrossTerm, exit, breakdown };
    }

    default:
      throw new Error(`Unsupported commitment shape: ${String(terms.shape)}`);
  }
}
