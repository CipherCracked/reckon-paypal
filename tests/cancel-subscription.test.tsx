import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CancelSubscription } from "@/components/CancelSubscription";

/**
 * Two presses, and only PayPal's answer (IPD 23, ITD 21).
 *
 * The first press must not send anything: cancelling at PayPal cannot be undone
 * here, and this product keeps no state to undo it with.
 */

const props = {
  subscriptionId: "I-SUB-1",
  productName: "Coffee Subscription",
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
});

describe("cancelling from the record", () => {
  it("asks before it acts, and sends nothing on the first press", async () => {
    const fetchMock = stubFetch({ outcome: "cancelled" });
    render(<CancelSubscription {...props} />);

    await openWarning();

    expect(fetchMock).not.toHaveBeenCalled();
    // The warning names the agreement, so the person can see which one ends.
    expect(screen.getByText(/cancel coffee subscription \(I-SUB-1\)\?/i)).toBeInTheDocument();
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
