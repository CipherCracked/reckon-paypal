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

const base = {
  productName: "Coffee Subscription",
  reference: "I-SUB-1",
  paidToday: money(1200),
  acrossTerm: money(14400),
  exit: money(0),
  exitNote: null,
  manageUrl: "https://www.sandbox.paypal.com/myaccount/autopay/",
  calendarHref: "/api/receipt/I-SUB-1/calendar?slug=coffee-subscription",
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

    expect(screen.getByText(/nothing about this purchase is stored on this site/i)).toBeInTheDocument();
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
});

describe("buildCalendar", () => {
  it("writes one event, dated in UTC, with a one-day reminder", () => {
    const calendar = buildCalendar({
      title: "Coffee Subscription — payment due",
      description: "$12.00 will be charged by PayPal.",
      start: new Date("2026-12-07T00:00:00Z"),
    });

    expect(calendar).toContain("BEGIN:VCALENDAR");
    expect(calendar).toContain("DTSTART:20261207T000000Z");
    expect(calendar).toContain("SUMMARY:Coffee Subscription — payment due");
    expect(calendar).toContain("TRIGGER:-P1D");
    expect(calendar).toContain("END:VEVENT");
  });

  it("escapes the text characters the format reserves", () => {
    const calendar = buildCalendar({
      title: "Coffee; a bag, monthly",
      description: "line one\nline two",
      start: new Date("2026-12-07T00:00:00Z"),
    });

    expect(calendar).toContain("SUMMARY:Coffee\\; a bag\\, monthly");
    expect(calendar).toContain("line one\\nline two");
  });
});

describe("GET /api/receipt/:id/calendar", () => {
  const request = () =>
    new Request("http://localhost/api/receipt/I-SUB-1/calendar?slug=coffee-subscription");

  beforeEach(() => {
    vi.mocked(retrieveSubscription).mockReset();
  });

  it("returns a calendar entry for the next charge", async () => {
    vi.mocked(retrieveSubscription).mockResolvedValueOnce({
      id: "I-SUB-1",
      status: "ACTIVE",
      nextBillingTime: "2026-12-07T00:00:00Z",
      amount: money(1200),
      terms: null,
    });

    const response = await calendarGET(request(), {
      params: Promise.resolve({ orderId: "I-SUB-1" }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/calendar");
    expect(await response.text()).toContain("DTSTART:20261207T000000Z");
  });

  it("refuses when PayPal has not set a date", async () => {
    vi.mocked(retrieveSubscription).mockResolvedValueOnce({
      id: "I-SUB-1",
      status: "APPROVAL_PENDING",
      nextBillingTime: null,
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
});
