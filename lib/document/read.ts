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

/**
 * Words a span must contain before the field the model hung on it is believed.
 *
 * The span is verified as a literal substring of the shopper's own words; the
 * label attached to it is not. A live reading on 2026-11-11 offered "You are
 * agreeing to 24 months of service" as the sentence that says leaving is free,
 * and the page printed `$0.00` for a contract that states a $180.00 early
 * termination fee in the next sentence. The model pointing at a real sentence
 * is not the same as that sentence saying what the model claims.
 */
const ABOUT_LEAVING = /\b(cancel\w*|leav(?:e|es|ing)\b|left|terminat\w*|exit\w*|quit\w*|resign\w*)\b/i;

/**
 * "No cancellation fee", "the fee is waived", "cancel free", "costs nothing".
 * Deliberately requires a cost word near the negation: "the first month is
 * free" is a discount, not a free exit, and reading it as one would print
 * `$0.00` for leaving a document that never said leaving was free.
 */
const SAYS_NO_CHARGE = new RegExp(
  [
    String.raw`\b(?:no|not|never|without)\b[^.]{0,40}?\b(?:fee|fees|charge[ds]?|cost(?:s)?|penalt\w*|termination)\b`,
    String.raw`\b(?:fee|fees|charge[ds]?|cost(?:s)?|penalt\w*)\b[^.]{0,40}?\b(?:free|none|nothing|zero|waived|nil)\b`,
    String.raw`\b(?:cancel\w*|leav(?:e|es|ing)\b|exit\w*)\b[^.]{0,25}?\b(?:free|at no cost|without (?:a )?(?:fee|charge|penalty))\b`,
  ].join("|"),
  "i",
);

function saysLeavingIsFree(quote: string): boolean {
  return ABOUT_LEAVING.test(quote) && SAYS_NO_CHARGE.test(quote);
}

/**
 * A span that says it is charged once cannot be the amount charged every month,
 * whatever the model called it.
 *
 * Live on 2026-11-11, the reader's own fee-schedule sample — the document written
 * to be refused — had "$15.00, charged once" labelled as the amount per period,
 * and the page offered `$30.00 charged today` for a page whose only figure is one
 * $15.00 card. The sentence was real and the amount was real; the repetition the
 * label implied was not.
 *
 * Deliberately narrow: "billed once a month" is a repeating charge and stays
 * one, which is why this matches the charge-once phrases rather than `once` on
 * its own.
 */
const SAYS_CHARGED_ONCE =
  /\b(?:one[- ]?off|one[- ]?time|charged once|paid once|payable once|single (?:payment|charge))\b/i;

/**
 * What leaving costs, when the document says anything at all.
 *
 * A stated fee wins over a free-exit sentence when a document states both,
 * because the page has one figure and no way to express "free until March, $50
 * after". Printing the free window as the cost of leaving understates the case
 * this product exists to expose; the sentence that promises a charge is the
 * conservative reading, and it is the one the source beside it will match.
 */
function exitFrom(values: Values): ExitTerms {
  const fee = values.exitFee?.amount;
  if (fee) return { kind: "fee", fee };
  if (values.freeToLeave) return { kind: "none" };
  return { kind: "unknown" };
}

/**
 * The span the exit figure came from — the same branch `exitFrom` takes, so a
 * figure is never quoted to a sentence it was not computed from.
 */
function exitSource(values: Values): string | null {
  if (values.exitFee?.amount) return values.exitFee.quote;
  if (values.freeToLeave) return values.freeToLeave.quote;
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
      case "oneTimeExtra":
      case "exitFee": {
        const amount = parseAmount(quote);
        if (amount) values[field] = { quote, amount };
        break;
      }
      case "amountPerPeriod": {
        // The one amount whose label says how often it repeats — so a sentence
        // that says it is charged once is refused here and can still be read as
        // a one-time extra, where it would be true.
        const amount = parseAmount(quote);
        if (amount && !SAYS_CHARGED_ONCE.test(quote)) values[field] = { quote, amount };
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
        // The one field with no amount to parse, so the sentence itself is the
        // only evidence: it has to be about leaving and it has to say leaving
        // costs nothing.
        if (saysLeavingIsFree(quote)) values[field] = { quote };
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
