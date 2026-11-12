import { describe, it, expect } from "vitest";
import {
  money,
  addMoney,
  subtractMoney,
  multiplyMoney,
  formatMoney,
  fromDecimalString,
  zeroMoney,
} from "@/lib/money";

describe("money", () => {
  it("adds in minor units without float drift", () => {
    expect(addMoney(money(10), money(20)).minor).toBe(30);
    expect(addMoney(money(1), money(2)).minor).toBe(3);
  });

  it("subtracts in minor units", () => {
    expect(subtractMoney(money(3999), money(2499)).minor).toBe(1500);
    expect(subtractMoney(money(2499), money(2499)).minor).toBe(0);
  });

  it("multiplies by an integer factor", () => {
    expect(multiplyMoney(money(1250), 12).minor).toBe(15000);
  });

  it("formats minor units as currency", () => {
    expect(formatMoney(money(4700))).toBe("$47.00");
    expect(formatMoney(money(5))).toBe("$0.05");
    expect(formatMoney(money(123456789))).toBe("$1,234,567.89");
  });

  it("parses a decimal string exactly", () => {
    expect(fromDecimalString("47.99").minor).toBe(4799);
    expect(fromDecimalString("0.1").minor).toBe(10);
    expect(fromDecimalString("1299").minor).toBe(129900);
  });

  it("returns zero money", () => {
    expect(zeroMoney().minor).toBe(0);
  });

  it("rejects values that are not whole minor units", () => {
    expect(() => money(10.5)).toThrow();
    expect(() => multiplyMoney(money(100), 1.5)).toThrow();
  });

  it("rejects malformed decimal strings instead of guessing", () => {
    expect(() => fromDecimalString("1.234")).toThrow();
    expect(() => fromDecimalString("abc")).toThrow();
    expect(() => fromDecimalString("")).toThrow();
    expect(() => fromDecimalString("-5.00")).toThrow();
  });

  it("refuses to combine different currencies", () => {
    expect(() => addMoney(money(100), { currency: "EUR" as never, minor: 100 })).toThrow();
  });
});
