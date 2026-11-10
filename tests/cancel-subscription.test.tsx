import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CancelSubscription } from "@/components/CancelSubscription";

// The record around this button is the server's reading of PayPal. After a
// confirmed cancellation the component asks for that reading again; in these
// tests the router is only observed, never rendered.
const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

/**
 * Two presses, and only PayPal's answer (IPD 23, ITD 21).
 *
 * The first press must not send anything: cancelling at PayPal cannot be undone
 * here, and this product keeps no state to undo it with.
 */

const props = {
  subscriptionId: "I-SUB-1",
  agreement: "subscription" as const,
  productName: "BARK 6 Month Subscription",
  reference: "I-SUB-1",
  manageUrl: "https://www.sandbox.paypal.com/myaccount/autopay/",
};

function stubFetch(body: unknown, ok = true) {
  const fetchMock = vi.fn().mockResolvedValue({ ok, json: async () => body });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const openWarning = () =>
  userEvent.click(screen.getByRole("button", { name: /cancel this subscription/i }));

afterEach(() => {
  vi.unstubAllGlobals();
  refresh.mockClear();
});

describe("cancelling from the record", () => {
  it("asks before it acts, and sends nothing on the first press", async () => {
    const fetchMock = stubFetch({ outcome: "cancelled" });
    render(<CancelSubscription {...props} />);

    await openWarning();

    expect(fetchMock).not.toHaveBeenCalled();
    // The warning names the agreement, so the person can see which one ends.
    expect(screen.getByText(/cancel bark 6 month subscription \(I-SUB-1\)\?/i)).toBeInTheDocument();
    expect(screen.getByText(/cannot be undone here/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /yes, cancel it at paypal/i })).toBeInTheDocument();
  });

  it("lets the person keep it running, which returns the original button", async () => {
    const fetchMock = stubFetch({ outcome: "cancelled" });
    render(<CancelSubscription {...props} />);

    await openWarning();
    await userEvent.click(screen.getByRole("button", { name: /keep it running/i }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /cancel this subscription/i })).toBeInTheDocument();
  });

  it("sends the second press to PayPal and reports only what PayPal said", async () => {
    const fetchMock = stubFetch({ outcome: "cancelled" });
    render(<CancelSubscription {...props} />);

    await openWarning();
    await userEvent.click(screen.getByRole("button", { name: /yes, cancel it at paypal/i }));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/paypal/subscriptions/I-SUB-1/cancel");
    expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe("POST");

    expect(await screen.findByRole("status")).toHaveTextContent(
      /PayPal says this subscription is cancelled\./,
    );
  });

  it("re-reads the record, so a next charge cannot outlive the agreement", async () => {
    // Found live on 2026-11-11: the record had been read while the subscription
    // was still running, so after a successful cancel the page still said
    // "Next charge 11 December 2026" three lines under "it will take no further
    // payments". The figures are the server's, so the server is asked again.
    stubFetch({ outcome: "cancelled" });
    render(<CancelSubscription {...props} />);

    await openWarning();
    await userEvent.click(screen.getByRole("button", { name: /yes, cancel it at paypal/i }));

    expect(await screen.findByRole("status")).toHaveTextContent(/is cancelled/i);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("does not re-read on a request whose outcome it cannot vouch for", async () => {
    // "We cannot tell" is not evidence that nothing happened — and it is not
    // evidence that something did, either, so the page is left as it was.
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("network")));
    render(<CancelSubscription {...props} />);

    await openWarning();
    await userEvent.click(screen.getByRole("button", { name: /yes, cancel it at paypal/i }));

    expect(await screen.findByRole("status")).toHaveTextContent(/cannot tell/i);
    expect(refresh).not.toHaveBeenCalled();
  });

  it("reports PayPal's own state when there was nothing running to end", async () => {
    stubFetch({ outcome: "not-running", issue: "SUBSCRIPTION_STATUS_INVALID" });
    render(<CancelSubscription {...props} />);

    await openWarning();
    await userEvent.click(screen.getByRole("button", { name: /yes, cancel it at paypal/i }));

    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent(/not running, so there was nothing to cancel/i);
    expect(status).toHaveTextContent(/SUBSCRIPTION_STATUS_INVALID/);
  });

  it("says it cannot tell — and never that it is cancelled — when the request fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("network")));
    render(<CancelSubscription {...props} />);

    await openWarning();
    await userEvent.click(screen.getByRole("button", { name: /yes, cancel it at paypal/i }));

    const status = await screen.findByRole("status");
    expect(status).toHaveTextContent(/we cannot tell whether that went through/i);
    expect(status).not.toHaveTextContent(/PayPal says this subscription is cancelled/i);
    // Where to check, so "we cannot tell" is not the end of the road.
    expect(screen.getByRole("link", { name: /open paypal's payment settings/i })).toHaveAttribute(
      "href",
      props.manageUrl,
    );
  });

  it("does not turn an error response into a cancellation", async () => {
    stubFetch({ error: "Something went wrong." }, false);
    render(<CancelSubscription {...props} />);

    await openWarning();
    await userEvent.click(screen.getByRole("button", { name: /yes, cancel it at paypal/i }));

    const status = await screen.findByRole("status");
    expect(status).not.toHaveTextContent(/PayPal says this subscription is cancelled/i);
    expect(status).toHaveTextContent(/we cannot tell/i);
  });
});

describe("cancelling a payment plan", () => {
  const plan = {
    ...props,
    agreement: "payment plan" as const,
    productName: "A financed purchase",
    reference: "I-PLAN-1",
    subscriptionId: "I-PLAN-1",
  };

  it("names the agreement the shopper actually agreed to", async () => {
    stubFetch({ outcome: "cancelled" });
    render(<CancelSubscription {...plan} />);

    // Not "subscription": the record is for a plan paid off in instalments, and
    // the shopper would not recognise the word for what they signed.
    expect(screen.getByRole("button", { name: /cancel this payment plan/i })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /cancel this payment plan/i }));

    expect(screen.getByText(/cancel a financed purchase \(I-PLAN-1\)\?/i)).toBeInTheDocument();
    expect(screen.getByText(/stop taking the remaining payments/i)).toBeInTheDocument();
  });

  it("says what the button cannot do, because stopping a schedule is not settling a debt", async () => {
    stubFetch({ outcome: "cancelled" });
    render(<CancelSubscription {...plan} />);

    await userEvent.click(screen.getByRole("button", { name: /cancel this payment plan/i }));

    expect(screen.getByText(/does not settle what you owe the seller/i)).toBeInTheDocument();
  });

  it("reports PayPal's answer about the plan, not about a subscription", async () => {
    stubFetch({ outcome: "cancelled" });
    render(<CancelSubscription {...plan} />);

    await userEvent.click(screen.getByRole("button", { name: /cancel this payment plan/i }));
    await userEvent.click(screen.getByRole("button", { name: /yes, cancel it at paypal/i }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      /PayPal says this payment plan is cancelled\./,
    );
  });
});
