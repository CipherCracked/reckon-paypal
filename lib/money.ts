export type Currency = "USD";

export type Money = {
  currency: Currency;
  /** Integer minor units (cents). Never a float. */
  minor: number;
};

function assertIntegerMinor(minor: number): void {
  if (!Number.isInteger(minor)) {
    throw new RangeError(`Money must be whole minor units, received ${minor}`);
  }
}

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new RangeError(`Cannot combine ${a.currency} with ${b.currency}`);
  }
}

export function money(minor: number, currency: Currency = "USD"): Money {
  assertIntegerMinor(minor);
  return { currency, minor };
}

export function zeroMoney(currency: Currency = "USD"): Money {
  return { currency, minor: 0 };
}

export function addMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.minor + b.minor, a.currency);
}

/**
 * Subtracts in minor units. Used where one figure is the difference between two
 * others — what a plan takes at the start is *today's charge* minus *one
 * period* — so the difference is computed once rather than restated.
 */
export function subtractMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.minor - b.minor, a.currency);
}

/**
 * Multiplies by a whole factor. A fractional factor would land on a part of a
 * cent, so it is refused rather than rounded: every displayed total must be a
 * total the processor can actually charge.
 */
export function multiplyMoney(a: Money, factor: number): Money {
  if (!Number.isInteger(factor)) {
    throw new RangeError(`Multiplier must be a whole number, received ${factor}`);
  }
  return money(a.minor * factor, a.currency);
}

export function formatMoney(a: Money): string {
  const sign = a.minor < 0 ? "-" : "";
  const abs = Math.abs(a.minor);
  const whole = String(Math.trunc(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const cents = String(abs % 100).padStart(2, "0");
  return `${sign}$${whole}.${cents}`;
}

const DECIMAL = /^\d+(\.\d{1,2})?$/;

/**
 * Parses a processor decimal string ("12.34") into minor units, as integers.
 * Splitting the string rather than multiplying by 100 keeps the amount out of
 * binary floating point entirely — the pattern above has already refused
 * anything that is not whole dollars and one or two decimal places.
 */
export function fromDecimalString(value: string, currency: Currency = "USD"): Money {
  if (!DECIMAL.test(value)) {
    throw new RangeError(`Not a currency amount: ${JSON.stringify(value)}`);
  }
  const [whole, fraction = ""] = value.split(".");
  return money(Number(whole) * 100 + Number(fraction.padEnd(2, "0")), currency);
}
