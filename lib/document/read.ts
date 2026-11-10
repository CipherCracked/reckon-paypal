import { addMoney, zeroMoney, formatMoney, type Money } from "../money";
import type { CommitmentTerms, CommitmentTranslation, ExitTerms } from "../commitment/types";
import { computeCommitment } from "../commitment/compute";
import {
  FIGURE_ORDER,
  presentFigures,
  type FigureId,
  type FigureSources,
  type RenderedFigure,
} from "../commitment/present";
import { describeSchedule } from "../commitment/schedule";
import type { FieldName } from "./fields";
import { parseAmount, parseCount, parseDate, parsePeriod } from "./parse";

/** A span of the shopper's own document, offered by the model and already verified. */
export type Quotation = { field: FieldName; quote: string };

type Values = Partial<
  Record<FieldName, { quote: string; amount?: Money; count?: number; date?: string }>
>;

export type Reading = {
  terms: CommitmentTerms;
  /** The span each figure was built from, so the screen can show its source. */
  sources: Record<FigureId, string | null>;
  dueDate: string | null;
  schedule: string;
  /** Which fields the document actually stated, in the order they were read. */
  stated: FieldName[];
  /** Present when the document named a repeating amount but never said how many. */
  countUnstated: boolean;
};

function exitFrom(values: Values): ExitTerms {
  if (values.freeToLeave) return { kind: "none" };
  const fee = values.exitFee?.amount;
  if (fee) return { kind: "fee", fee };
  return { kind: "unknown" };
}

/**
 * The span the exit figure came from. It takes the same branch as `exitFrom`:
 * a document that says both "cancel free" and "cancellation fee $50" yields a
 * $0.00 figure, and quoting the $50 sentence beside it would name a source the
 * figure never used.
 */
function exitSource(values: Values): string | null {
  if (values.freeToLeave) return values.freeToLeave.quote;
  if (values.exitFee?.amount) return values.exitFee.quote;
  return null;
}

/**
 * Reads the values out of verified quotations. The model chose which spans
 * matter; everything numeric below is parsed or computed here, in whole minor
 * units, by the same utilities the payment path uses (ITD 10).
 *
 * Returns `null` when the spans do not add up to a commitment — a currency
 * amount alone, a date alone, or a repeating charge with no total. The caller
 * then falls back to candidate mode rather than inventing a figure.
 */
export function readQuotations(quotations: Quotation[]): Reading | null {
  const values: Values = {};

  for (const { field, quote } of quotations) {
    if (values[field]) continue; // first span that parses wins; the rest are ignored

    switch (field) {
      case "totalDue":
      case "amountPerPeriod":
      case "oneTimeExtra":
      case "exitFee": {
        const amount = parseAmount(quote);
        if (amount) values[field] = { quote, amount };
        break;
      }
      case "paymentCount": {
        const count = parseCount(quote);
        if (count) values[field] = { quote, count };
        break;
      }
      case "period": {
        // The cadence only changes how the schedule reads, never the totals.
        if (parsePeriod(quote)) values[field] = { quote };
        break;
      }
      case "dueDate": {
        const date = parseDate(quote);
        if (date) values[field] = { quote, date };
        break;
      }
      case "freeToLeave": {
        values[field] = { quote };
        break;
      }
    }
  }

  const stated = (Object.keys(values) as FieldName[]).filter((field) => values[field]);
  if (stated.length === 0) return null;

  const exit = exitFrom(values);
  const dueDate = values.dueDate?.date ?? null;
  const perPeriodEntry = values.amountPerPeriod;
  const totalEntry = values.totalDue;
  const extra = values.oneTimeExtra?.amount ?? null;

  // A repeating charge is the harder shape and wins when both are present: the
  // document saying "$35 a month" tells the reader more than its first invoice.
  if (perPeriodEntry?.amount) {
    const perPeriod = perPeriodEntry.amount;
    const statedCount = values.paymentCount?.count ?? null;
    const period = values.period ? parsePeriod(values.period.quote) : null;
    // The cadence never changes the arithmetic — the amount is multiplied by
    // however many charges there are — so a yearly plan is kept as written.
    const count = statedCount ?? 1;
    const countUnstated = statedCount === null;
    const todayAmount = addMoney(perPeriod, extra ?? zeroMoney());

    const terms: CommitmentTerms = {
      shape: "recurring",
      itemPrice: perPeriod,
      shipping: extra ?? zeroMoney(),
      tax: zeroMoney(),
      recurrence: { count, period: period ?? "month" },
      exit,
    };

    return {
      terms,
      sources: {
        // A figure is only ever sourced to a span it was computed from: the
        // term total has no source until the document says how many payments
        // there are, and today's charge quotes the total only when that total
        // is what we are actually charging.
        acrossTerm: countUnstated ? null : perPeriodEntry.quote,
        exit: exitSource(values),
        today:
          totalEntry?.amount && totalEntry.amount.minor === todayAmount.minor
            ? totalEntry.quote
            : todayAmount.minor === perPeriod.minor
              ? perPeriodEntry.quote
              : null,
      },
      dueDate,
      schedule: countUnstated
        ? `${formatMoney(addMoney(perPeriod, extra ?? zeroMoney()))} is charged at a time. The document does not say how many payments there are, or how often they fall due.`
        : period
          ? describeSchedule(terms, { firstPaymentToday: false })
          : `${count} payments of ${formatMoney(perPeriod)}. The document does not say how often they fall due, or what happens if a payment is missed.`,
      stated,
      countUnstated,
    };
  }

  if (totalEntry?.amount) {
    // A stated total is the whole charge, so nothing is added to it: the parts
    // it already contains must not be counted twice.
    const terms: CommitmentTerms = {
      shape: "one_time",
      itemPrice: totalEntry.amount,
      shipping: zeroMoney(),
      tax: zeroMoney(),
      exit,
    };

    // A document can state one total and still mention payments spread over
    // time ("$1,200 over 12 months") without ever stating an amount per
    // payment. Saying "nothing further is charged" there would contradict the
    // document, so the schedule says instead what this screen did with the
    // total: shown it as a single charge, because that is the only amount the
    // document actually states.
    const paidInParts = values.paymentCount
      ? `The document states a total of ${formatMoney(totalEntry.amount)} and mentions ${values.paymentCount.count} payments, but not how much each one is.`
      : values.period
        ? `The document states a total of ${formatMoney(totalEntry.amount)} and mentions payments spread over time, but not how much each one is.`
        : null;

    return {
      terms,
      sources: {
        acrossTerm: totalEntry.quote,
        exit: exitSource(values),
        today: totalEntry.quote,
      },
      dueDate,
      schedule: paidInParts
        ? `${paidInParts} This screen shows that total as a single charge.`
        : describeSchedule(terms),
      stated,
      countUnstated: false,
    };
  }

  // Amounts that are only ever add-ons or an exit fee do not describe a charge.
  return null;
}

export type ReadingView = {
  figures: RenderedFigure[];
  /** The parts a single charge is built from — the document's own amounts. */
  breakdown: CommitmentTranslation["breakdown"];
  /** What to say in place of a figure the document does not contain. */
  notes: Partial<Record<FigureId, string>>;
};

const EXIT_UNSTATED = "The document does not say what it costs to cancel or leave early.";
const TERM_UNSTATED =
  "The document does not say how many payments there are, so the total across the term cannot be worked out.";

/**
 * Projects a reading into the three figures. Everything is computed by
 * `computeCommitment`; the only edit here is replacing a figure the document
 * cannot support with an absence, never with an estimate.
 */
export function presentReading(reading: Reading): ReadingView {
  const translation = computeCommitment(reading.terms);
  // Every verified span the document gave up travels on the figure it produced,
  // so the screen shows a sentence beside its figure rather than joining two
  // structures by convention (ITD 19).
  const sources: FigureSources = {};
  for (const id of FIGURE_ORDER) {
    const span = reading.sources[id];
    if (span) sources[id] = { label: "your document", span };
  }
  const figures = presentFigures(reading.terms, translation, {
    extra: "charged once",
    sources,
  });

  // An absence is only announced where there is an absence. A note under a
  // figure the document did state would contradict the figure above it.
  const notes: Partial<Record<FigureId, string>> = {};
  if (reading.terms.exit.kind === "unknown") notes.exit = EXIT_UNSTATED;
  if (reading.countUnstated) notes.acrossTerm = TERM_UNSTATED;

  return {
    figures: figures.map((figure) =>
      figure.id === "acrossTerm" && reading.countUnstated
        ? { ...figure, amount: null, arithmetic: null }
        : figure,
    ),
    breakdown: translation.breakdown,
    notes,
  };
}

/** `2026-11-21` → `21 November 2026`, built from UTC parts so it cannot shift. */
export function formatReadingDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  const month = date.toLocaleDateString("en-GB", { month: "long", timeZone: "UTC" });
  return `${date.getUTCDate()} ${month} ${date.getUTCFullYear()}`;
}
