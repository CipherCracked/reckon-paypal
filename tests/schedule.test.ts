import { describe, it, expect } from "vitest";
import { describeSchedule } from "@/lib/commitment/schedule";
import { money } from "@/lib/money";

describe("describeSchedule", () => {
  it("says a single payment has no term to run out", () => {
    const schedule = describeSchedule({
      shape: "one_time",
      itemPrice: money(4799),
      shipping: money(695),
      tax: money(401),
      exit: { kind: "none" },
    });

    expect(schedule).toContain("Paid once");
    expect(schedule).not.toMatch(/missed/i);
  });

  it("counts the payments and the amount of each", () => {
    const schedule = describeSchedule({
      shape: "recurring",
      itemPrice: money(1200),
      shipping: money(0),
      tax: money(0),
      recurrence: { count: 12, period: "month" },
      exit: { kind: "fee", fee: money(0) },
    });

    expect(schedule).toContain("12 payments of $12.00");
    expect(schedule).toContain("first of the 12");
  });

  it("states what it does not know about a missed payment", () => {
    const schedule = describeSchedule({
      shape: "financed",
      itemPrice: money(120000),
      shipping: money(0),
      tax: money(0),
      installment: { count: 12, amount: money(10500), fee: money(6000) },
      exit: { kind: "unknown" },
    });

    expect(schedule).toContain("12 payments of $105.00");
    expect(schedule).toContain("not stated");
  });
});
