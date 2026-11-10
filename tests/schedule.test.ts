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

  it("states what it does not know about a missed payment, and names the opening fee", () => {
    const schedule = describeSchedule({
      shape: "financed",
      itemPrice: money(120000),
      shipping: money(0),
      tax: money(0),
      installment: { count: 12, amount: money(10500) },
      openingFee: money(6000),
      exit: { kind: "unknown" },
    });

    expect(schedule).toContain("12 payments of $105.00");
    expect(schedule).toContain("plus $60.00 taken once");
    expect(schedule).toContain("not stated");
  });

  it("does not call a listing's price the whole charge", () => {
    // The sentence a real product page shows. "Nothing further is charged" is
    // what it used to say, and it was false: the retailer adds shipping and tax
    // at checkout, and the listing states neither.
    const schedule = describeSchedule({
      shape: "one_time",
      itemPrice: money(17995),
      shipping: null,
      tax: null,
      exit: { kind: "unknown" },
    });

    expect(schedule).not.toContain("Nothing further is charged");
    expect(schedule).toContain("Shipping and sales tax are not stated here.");
    expect(schedule).toContain("not everything you will be asked for");
    // The sentence prints above the figures it is about, and it is shown for
    // documents too, so it may not point at a position or call everything a listing.
    expect(schedule).not.toContain("figures above");
    expect(schedule).not.toContain("listing");
  });

  it("names only the part that is missing", () => {
    const schedule = describeSchedule({
      shape: "one_time",
      itemPrice: money(17995),
      shipping: money(500),
      tax: null,
      exit: { kind: "unknown" },
    });

    expect(schedule).toContain("Sales tax is not stated here.");
  });
});
