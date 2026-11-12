import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { CommitmentRecord } from "@/components/CommitmentRecord";
import { buildCalendar } from "@/lib/receipt/calendar";
import { money } from "@/lib/money";
import { GET as calendarGET } from "@/app/api/receipt/[orderId]/calendar/route";
import { isSettled, retrieveSubscription } from "@/lib/paypal/retrieve";

vi.mock("@/lib/paypal/retrieve", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/paypal/retrieve")>();
  return { ...actual, retrieveSubscription: vi.fn() };
});

// A running record carries the cancel button, which re-reads the page after a
// confirmed cancellation. Here the router only has to exist.
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

// The calendar route resolves the product so a real subscription gets its
// reminder. This suite is about the record and the file it produces, so the
// resolution is fixed to a recurring listing.
vi.mock("@/lib/catalog/resolve", async () => {
  const { money: amount } = await import("@/lib/money");
  const resolve = async (slug: string) =>
    slug === "ch3-YyLUjLT"
      ? {
          slug,
          name: "BARK 6 Month Subscription",
          description: "A subscription box for dogs.",
          terms: {
            shape: "recurring" as const,
            itemPrice: amount(2499),
            shipping: null,
            tax: null,
            recurrence: { count: 6, period: "month" as const },
            exit: { kind: "unknown" as const },
          },
          sources: { paypal: null, published: "the price Channel3 lists at bark.co" },
          descriptionLabel: "the description Channel3 lists for this product",
          listed: true,
        }
      : null;

  return {
    resolveProduct: vi.fn(resolve),
    resolveProductOutcome: vi.fn(async (slug: string) => {
      const product = await resolve(slug);
      return product ? { kind: "found", product } : { kind: "absent" };
    }),
  };
});

const base = {
  productName: "BARK 6 Month Subscription",
  reference: "I-SUB-1",
  paidToday: money(1200),
  acrossTerm: money(14400),
  exit: money(0),
  exitNote: null,
  exitSource: null,
  standing: null,
  manageUrl: "https://www.sandbox.paypal.com/myaccount/autopay/",
  calendarHref: "/api/receipt/I-SUB-1/calendar?slug=ch3-YyLUjLT",
  sourceNote: "Read from the PayPal plan for this subscription.",
};

describe("CommitmentRecord", () => {
  it("states the next charge, the term total, the exit and what was paid", () => {
    render(
      <CommitmentRecord
        {...base}
        nextCharge={{ date: new Date("2026-12-07T00:00:00Z"), amount: money(1200) }}
      />,
    );

    expect(screen.getByText("Next charge")).toBeInTheDocument();
    expect(screen.getByText(/7 December 2026 — \$12\.00/)).toBeInTheDocument();
    expect(screen.getByText("$144.00")).toBeInTheDocument();
    expect(screen.getByText("Cost to leave")).toBeInTheDocument();
    expect(screen.getByText("Charged today")).toBeInTheDocument();
  });

  it("says there is no further charge for a single payment", () => {
    render(<CommitmentRecord {...base} nextCharge={null} calendarHref={null} />);

    expect(screen.getByText(/none — this was a single payment/i)).toBeInTheDocument();
    expect(screen.queryByText(/add the next charge/i)).toBeNull();
  });

  it("never renders an unpublished exit cost as zero", () => {
    render(<CommitmentRecord {...base} exit={null} nextCharge={null} calendarHref={null} />);

    expect(screen.getByText(/not stated/i)).toBeInTheDocument();
    expect(screen.queryByText("$0.00")).toBeNull();
  });

  it("tells the shopper what survives: this page, and PayPal's own record", () => {
    render(<CommitmentRecord {...base} nextCharge={null} calendarHref={null} />);

    expect(screen.getByText(/it is the only copy/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /manage this payment at paypal/i })).toHaveAttribute(
      "href",
      base.manageUrl,
    );
    expect(screen.getByText(/payment reference i-sub-1/i)).toBeInTheDocument();
  });

  it("states an amount PayPal never returned as unstated, not as the shop's figure", () => {
    render(<CommitmentRecord {...base} paidToday={null} nextCharge={null} calendarHref={null} />);

    expect(screen.getByText(/PayPal did not return the amount it charged/i)).toBeInTheDocument();
    expect(screen.queryByText("$12.00")).toBeNull();
  });

  it("quotes the sentence the exit figure was read out of, when there is one", () => {
    render(
      <CommitmentRecord
        {...base}
        nextCharge={null}
        calendarHref={null}
        exitSource={{ label: "the description published with the PayPal product", span: "cancel any time, no fee." }}
      />,
    );

    // The record is the screen a shopper keeps, so it carries the evidence too.
    expect(screen.getByText("cancel any time, no fee.")).toBeInTheDocument();
    expect(
      screen.getByText(/the description published with the PayPal product/i),
    ).toBeInTheDocument();
  });

  it("offers a calendar entry when there is a dated next charge", () => {
    render(
      <CommitmentRecord
        {...base}
        nextCharge={{ date: new Date("2026-12-07T00:00:00Z"), amount: money(1200) }}
      />,
    );

    expect(screen.getByRole("link", { name: /add the next charge to your calendar/i })).toHaveAttribute(
      "href",
      base.calendarHref,
    );
  });

  it("offers the cancel beside the cost to leave while PayPal reports it running", () => {
    render(
      <CommitmentRecord
        {...base}
        nextCharge={{ date: new Date("2026-12-07T00:00:00Z"), amount: money(1200) }}
        standing={{ kind: "running", subscriptionId: "I-SUB-1", agreement: "subscription" }}
      />,
    );

    // The figure and the way to leave it are one part of the record (IPD 23).
    expect(screen.getByRole("button", { name: /cancel this subscription/i })).toBeInTheDocument();
    expect(screen.queryByText(/PayPal reports this subscription as cancelled/i)).toBeNull();
  });

  it("states a cancelled subscription as cancelled, and offers nothing to press", () => {
    render(
      <CommitmentRecord
        {...base}
        nextCharge={{ date: new Date("2026-12-07T00:00:00Z"), amount: money(1200) }}
        standing={{
          kind: "cancelled",
          at: new Date("2026-11-10T00:00:00Z"),
          agreement: "subscription",
        }}
      />,
    );

    // The payment happened, so the record is still shown — with PayPal's own
    // statement of where it stands now, rather than a button that would lie.
    expect(screen.getByText(/paypal reports this subscription as cancelled on 10 November 2026/i)).toBeInTheDocument();
    expect(screen.getByText(/none — paypal reports this subscription as cancelled/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /cancel this subscription/i })).toBeNull();
    // Found live on 2026-11-11: a cancelled record still offered a calendar
    // entry for a charge PayPal will never take, and the route behind it answers
    // 404 for that same reason.
    expect(screen.queryByText(/add the next charge to your calendar/i)).toBeNull();
  });

  it("offers the cancel on a payment plan too, and calls it what it is", () => {
    // A twelve-month arrangement the shopper cannot find the way out of is a
    // product that sold them something it will not let them leave.
    render(
      <CommitmentRecord
        {...base}
        nextCharge={{ date: new Date("2026-12-07T00:00:00Z"), amount: money(10500) }}
        standing={{ kind: "running", subscriptionId: "I-PLAN-1", agreement: "payment plan" }}
      />,
    );

    expect(screen.getByRole("button", { name: /cancel this payment plan/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /cancel this subscription/i })).toBeNull();
  });

  it("says a plan was cancelled in the plan's own words", () => {
    render(
      <CommitmentRecord
        {...base}
        nextCharge={{ date: new Date("2026-12-07T00:00:00Z"), amount: money(10500) }}
        standing={{
          kind: "cancelled",
          at: new Date("2026-11-10T00:00:00Z"),
          agreement: "payment plan",
        }}
      />,
    );

    // Both the standing notice and the "Next charge" line say it, in the words
    // of the agreement the shopper actually signed.
    expect(screen.getAllByText(/paypal reports this payment plan as cancelled/i).length).toBeGreaterThan(0);
  });
});

describe("buildCalendar", () => {
  it("writes one event, dated in UTC, with a one-day reminder", () => {
    const calendar = buildCalendar({
      title: "BARK 6 Month Subscription — payment due",
      description: "$12.00 will be charged by PayPal.",
      start: new Date("2026-12-07T00:00:00Z"),
    });

    expect(calendar).toContain("BEGIN:VCALENDAR");
    expect(calendar).toContain("DTSTART:20261207T000000Z");
    expect(calendar).toContain("SUMMARY:BARK 6 Month Subscription — payment due");
    expect(calendar).toContain("TRIGGER:-P1D");
    expect(calendar).toContain("END:VEVENT");
  });

  it("escapes the text characters the format reserves", () => {
    const calendar = buildCalendar({
      title: "BARK; a box, monthly",
      description: "line one\nline two",
      start: new Date("2026-12-07T00:00:00Z"),
    });

    expect(calendar).toContain("SUMMARY:BARK\\; a box\\, monthly");
    expect(calendar).toContain("line one\\nline two");
  });
});

describe("GET /api/receipt/:id/calendar", () => {
  const request = () =>
    new Request("http://localhost/api/receipt/I-SUB-1/calendar?slug=ch3-YyLUjLT");

  beforeEach(() => {
    vi.mocked(retrieveSubscription).mockReset();
  });

  it("returns a calendar entry for the next charge", async () => {
    // The reminder is for one period, so the amount comes from the plan's terms
    // rather than from what the first charge happened to be — a plan with a
    // setup fee takes more on day one than on every month after it.
    vi.mocked(retrieveSubscription).mockResolvedValueOnce({
      id: "I-SUB-1",
      status: "ACTIVE",
      nextBillingTime: "2026-12-07T00:00:00Z",
      statusChangeTime: null,
      amount: money(1200),
      terms: {
        shape: "recurring",
        itemPrice: money(1200),
        shipping: money(0),
        tax: money(0),
        recurrence: { count: 12, period: "month" },
        exit: { kind: "unknown" },
      },
    });

    const response = await calendarGET(request(), {
      params: Promise.resolve({ orderId: "I-SUB-1" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/calendar");
    expect(await response.text()).toContain("DTSTART:20261207T000000Z");
  });

  it("reminds the shopper of one period, not of the fee taken once", async () => {
    // A plan with a setup fee charges $165.00 on day one and $105.00 thereafter.
    // Repeating what was charged today would overstate every month after it.
    vi.mocked(retrieveSubscription).mockResolvedValueOnce({
      id: "I-SUB-1",
      status: "ACTIVE",
      nextBillingTime: "2026-12-07T00:00:00Z",
      statusChangeTime: null,
      amount: money(16500),
      terms: {
        shape: "recurring",
        itemPrice: money(10500),
        shipping: money(0),
        tax: money(0),
        recurrence: { count: 12, period: "month" },
        openingFee: money(6000),
        exit: { kind: "unknown" },
      },
    });

    const response = await calendarGET(request(), {
      params: Promise.resolve({ orderId: "I-SUB-1" }),
    });

    const calendar = await response.text();
    expect(calendar).toContain("$105.00");
    expect(calendar).not.toContain("$165.00");
  });

  it("refuses when PayPal has not set a date", async () => {
    vi.mocked(retrieveSubscription).mockResolvedValueOnce({
      id: "I-SUB-1",
      status: "APPROVAL_PENDING",
      nextBillingTime: null,
      statusChangeTime: null,
      amount: null,
      terms: null,
    });

    const response = await calendarGET(request(), {
      params: Promise.resolve({ orderId: "I-SUB-1" }),
    });

    expect(response.status).toBe(404);
  });

  it("refuses to state an amount PayPal never gave", async () => {
    vi.mocked(retrieveSubscription).mockResolvedValueOnce({
      id: "I-SUB-1",
      status: "ACTIVE",
      nextBillingTime: "2026-12-07T00:00:00Z",
      statusChangeTime: null,
      amount: null,
      terms: null,
    });

    const response = await calendarGET(request(), {
      params: Promise.resolve({ orderId: "I-SUB-1" }),
    });

    expect(response.status).toBe(404);
  });

  it("fails honestly when PayPal cannot be reached", async () => {
    vi.mocked(retrieveSubscription).mockRejectedValueOnce(new Error("network"));

    const response = await calendarGET(request(), {
      params: Promise.resolve({ orderId: "I-SUB-1" }),
    });

    expect(response.status).toBe(502);
  });

  it("says the catalogue could not be read, instead of refusing a reminder", async () => {
    // "This purchase has no next charge" is a fact about the commitment. A
    // catalogue that did not answer supports no fact at all.
    const { resolveProductOutcome } = await import("@/lib/catalog/resolve");
    vi.mocked(resolveProductOutcome).mockResolvedValueOnce({ kind: "unreadable" });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const response = await calendarGET(request(), {
      params: Promise.resolve({ orderId: "I-SUB-1" }),
    });

    expect(response.status).toBe(503);
    expect(await response.text()).toMatch(/could not be read/i);
    warn.mockRestore();
  });
});

describe("what counts as a payment PayPal has confirmed", () => {
  it("does not count an approved but uncaptured order as settled", () => {
    // The payer agreed at PayPal; no money has moved. A record built on this
    // would report a payment that never happened.
    expect(isSettled("APPROVED")).toBe(false);
    expect(isSettled("CREATED")).toBe(false);
    expect(isSettled("PAYER_ACTION_REQUIRED")).toBe(false);
  });

  it("counts a captured order and an active subscription", () => {
    expect(isSettled("COMPLETED")).toBe(true);
    expect(isSettled("ACTIVE")).toBe(true);
  });

  it("keeps the record of a subscription PayPal reports cancelled", () => {
    // It ran, money was taken, and this screen is the copy the shopper was told
    // to keep. Answering it with "nothing has been taken" would be false in the
    // one case this product can now cause (IPD 23).
    expect(isSettled("CANCELLED")).toBe(true);
  });
});
