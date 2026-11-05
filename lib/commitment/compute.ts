import { addMoney, zeroMoney, type Money } from "@/lib/money";
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

export function computeCommitment(terms: CommitmentTerms): CommitmentTranslation {
  const breakdown = {
    item: terms.itemPrice,
    shipping: terms.shipping,
    tax: terms.tax,
  };

  switch (terms.shape) {
    case "one_time": {
      const today = addMoney(addMoney(terms.itemPrice, terms.shipping), terms.tax);
      return {
        today,
        acrossTerm: today,
        exit: translateExit(terms.exit),
        breakdown,
      };
    }
    default:
      throw new Error(`Unsupported commitment shape: ${terms.shape}`);
  }
}
