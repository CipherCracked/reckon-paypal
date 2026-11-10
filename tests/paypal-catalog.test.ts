import { describe, expect, it } from "vitest";
import { minorFromPayPal, termsFromPlan } from "@/lib/paypal/catalog";

const monthly = {
  billing_cycles: [
    {
      frequency: { interval_unit: "MONTH", interval_count: 1 },
      tenure_type: "REGULAR",
      total_cycles: 12,
      pricing_scheme: { fixed_price: { currency_code: "USD", value: "12.00" } },
    },
  ],
};

describe("reading a price from PayPal (ITD 17)", () => {
  it("turns the decimal string PayPal sends into minor units", () => {
    expect(minorFromPayPal("12.00")).toBe(1200);
    expect(minorFromPayPal("12")).toBe(1200);
    expect(minorFromPayPal("12.5")).toBe(1250);
    expect(minorFromPayPal("104.99")).toBe(10499);
  });

  it("refuses a value it cannot read exactly rather than rounding it", () => {
    // Three decimal places is not a price anyone published.
    expect(minorFromPayPal("12.005")).toBeNull();
    expect(minorFromPayPal("twelve")).toBeNull();
    expect(minorFromPayPal(undefined)).toBeNull();
  });
});

describe("turning a billing plan into terms (ITD 17)", () => {
  it("reads the term and the price from the plan's own cycles", () => {
    expect(termsFromPlan(monthly)).toEqual({
      shape: "recurring",
      itemPrice: { minor: 1200, currency: "USD" },
      shipping: { minor: 0, currency: "USD" },
      tax: { minor: 0, currency: "USD" },
      recurrence: { count: 12, period: "month" },
      exit: { kind: "unknown" },
    });
  });

  it("skips a trial cycle, because the term being shown is the paid one", () => {
    const withTrial = {
      billing_cycles: [
        {
          frequency: { interval_unit: "MONTH", interval_count: 1 },
          tenure_type: "TRIAL",
          total_cycles: 1,
          pricing_scheme: { fixed_price: { currency_code: "USD", value: "0.00" } },
        },
        ...monthly.billing_cycles,
      ],
    };

    expect(termsFromPlan(withTrial)?.itemPrice.minor).toBe(1200);
    expect(termsFromPlan(withTrial)?.recurrence).toEqual({ count: 12, period: "month" });
  });

  it("reads a yearly cadence as written, never converted to months", () => {
    const yearly = {
      billing_cycles: [
        {
          frequency: { interval_unit: "YEAR", interval_count: 1 },
          tenure_type: "REGULAR",
          total_cycles: 2,
          pricing_scheme: { fixed_price: { currency_code: "USD", value: "40.00" } },
        },
      ],
    };

    expect(termsFromPlan(yearly)?.recurrence).toEqual({ count: 2, period: "year" });
    expect(termsFromPlan(yearly)?.itemPrice.minor).toBe(4000);
  });

  it("always reports the exit term as unknown, because PayPal has no field for it", () => {
    // IPD 19: the plan cannot answer the third figure, and a plan that mentions
    // payment failures says nothing about walking away.
    const withPreferences = {
      ...monthly,
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee_failure_action: "CONTINUE",
        payment_failure_threshold: 2,
      },
    };

    expect(termsFromPlan(withPreferences)?.exit).toEqual({ kind: "unknown" });
  });

  it("reads the plan's failure policy onto its terms, because the plan states it", () => {
    const withThreshold = {
      ...monthly,
      payment_preferences: { auto_bill_outstanding: true, payment_failure_threshold: 2 },
    };

    expect(termsFromPlan(withThreshold)?.failure).toEqual({ suspendAfter: 2 });
  });

  it("states no failure policy when the plan carries no threshold", () => {
    // Absent is not zero: a plan that does not say is not a plan that never
    // suspends, so the terms say nothing and the schedule says that instead.
    expect(termsFromPlan(monthly)?.failure).toBeUndefined();
    expect(
      termsFromPlan({ ...monthly, payment_preferences: { payment_failure_threshold: 0 } })
        ?.failure,
    ).toBeUndefined();
  });

  it("returns nothing rather than a guess when the plan cannot be read", () => {
    expect(termsFromPlan({})).toBeNull();
    expect(termsFromPlan({ billing_cycles: [{ tenure_type: "REGULAR" }] })).toBeNull();
    expect(
      termsFromPlan({
        billing_cycles: [
          {
            frequency: { interval_unit: "WEEK" },
            tenure_type: "REGULAR",
            total_cycles: 4,
            pricing_scheme: { fixed_price: { value: "5.00" } },
          },
        ],
      }),
    ).toBeNull();
    expect(
      termsFromPlan({
        billing_cycles: [
          {
            frequency: { interval_unit: "MONTH" },
            tenure_type: "REGULAR",
            pricing_scheme: { fixed_price: { value: "5.00" } },
          },
        ],
      }),
    ).toBeNull();
  });
});
