import type { CommitmentShape } from "@/lib/commitment/types";

/**
 * Everything the model is allowed to tell us. Note what is absent: there is no
 * field that could carry an amount. The model reads merchant copy and returns
 * language and structure only.
 */
export interface ExtractedTerms {
  shape: CommitmentShape | null;
  recurrenceCount: number | null;
  recurrencePeriod: "month" | "year" | null;
  cancellationWindowDays: number | null;
  exitFeeKnown: boolean;
  labels: { item: string; shipping: string; tax: string };
  summary: string;
}
