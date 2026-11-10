import { describe, it, expect } from "vitest";
import { describeSchedule } from "@/lib/commitment/schedule";
import { products } from "@/lib/catalog/products";
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
    expect(schedule).toContain("not stated in the terms");
    // The absence belongs to the terms, not to this screen's ability to look it
    // up: "not stated on this screen" told the reader about our page.
    expect(schedule).not.toContain("on this screen");
  });

  it("states the failure policy of a plan it creates, instead of disclosing one", () => {
    const terms = {
      shape: "recurring" as const,
      itemPrice: money(1200),
      shipping: money(0),
      tax: money(0),
      recurrence: { count: 12, period: "month" as const },
      failure: { suspendAfter: 1 },
      exit: { kind: "unknown" as const },
    };

    const schedule = describeSchedule(terms);

    expect(schedule).toContain("If a payment does not go through, PayPal suspends the plan after one failed payment.");
    expect(schedule).not.toContain("not stated");
  });

  it("counts the failed payments when the plan allows more than one", () => {
    const schedule = describeSchedule({
      shape: "financed",
      itemPrice: money(120000),
      shipping: money(0),
      tax: money(0),
      installment: { count: 12, amount: money(10500) },
      failure: { suspendAfter: 3 },
      exit: { kind: "unknown" },
    });

    expect(schedule).toContain("after 3 failed payments");
  });

  it("states the failure policy on a financed purchase too", () => {
    // Both shapes are a PayPal plan behind the screen, so both carry the same
    // term. A policy that appeared on one and not the other would be a fact
    // about how the screen was written, not about the money.
    for (const product of products) {
      if (product.terms.shape === "one_time") continue;

      expect(describeSchedule(product.terms)).toContain("PayPal suspends the plan");
    }
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

  it("says where a shop's missing parts are added, because a shop knows", () => {
    // "Shipping and sales tax are not stated here" is a fact about our data. A
    // shopper in a shop is told where the money goes, not what the feed lacks:
    // every checkout adds them, and that is a scope rather than an apology.
    const schedule = describeSchedule(
      {
        shape: "one_time",
        itemPrice: money(17995),
        shipping: null,
        tax: null,
        exit: { kind: "none" },
      },
      { unstatedAt: "checkout" },
    );

    expect(schedule).toBe("Paid once, plus shipping and sales tax at checkout.");
    expect(schedule).not.toContain("not stated");
  });
});
