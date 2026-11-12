import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useState } from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConsentScreen } from "@/components/ConsentScreen";
import { GET } from "@/app/api/commitment/[orderId]/route";
import { extractTerms } from "@/lib/ai/extract-terms";
import { resolveExitTerm } from "@/lib/commitment/published-exit";
import { computeCommitment } from "@/lib/commitment/compute";
import { presentFigures } from "@/lib/commitment/present";
import { readProductFromPayPal } from "@/lib/paypal/catalog";
import { readMarketProduct } from "@/lib/market/channel3";
import { money } from "@/lib/money";
import { recordedProduct } from "./fixtures/channel3-listings";
import type { CommitmentTerms } from "@/lib/commitment/types";

vi.mock("@/lib/ai/extract-terms", () => ({
  extractTerms: vi.fn(),
}));

vi.mock("@/lib/commitment/published-exit", async () => {
  const actual = await vi.importActual<typeof import("@/lib/commitment/published-exit")>(
    "@/lib/commitment/published-exit",
  );
  return { ...actual, resolveExitTerm: vi.fn() };
});

vi.mock("@/lib/paypal/catalog", () => ({
  readProductCardFromPayPal: vi.fn(),
  readProductFromPayPal: vi.fn(),
}));

vi.mock("@/lib/market/channel3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/market/channel3")>();
  return { ...actual, readMarketProduct: vi.fn() };
});

// PayPal's own button cannot render in jsdom: the SDK loads a browser script and
// mounts a control into a container it owns (ITD 40). So the suite stops at that
// module's boundary and asserts what the screen hands it and how it reacts. The
// stub keeps the same props the real component takes, and exposes each outcome
// as a button so a test can drive it.
const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

vi.mock("@/components/PayPalButton", () => ({
  default: (props: {
    shape: string;
    clientId: string;
    environment: string;
    disabled?: boolean;
    createOrder?: () => Promise<{ orderId: string }>;
    createSubscription?: () => Promise<{ subscriptionId: string }>;
    onApproved: (id: string) => void;
    onCancelled: () => void;
    onFailed: () => void;
    onUnavailable: () => void;
  }) => {
    const [created, setCreated] = useState("");
    return (
      <div
        data-testid="paypal-control"
        data-shape={props.shape}
        data-client-id={props.clientId}
        data-environment={props.environment}
        data-disabled={String(Boolean(props.disabled))}
      >
        <p data-testid="created">{created}</p>
        <button
          type="button"
          onClick={() => {
            // The screen rejects these promises on purpose, so PayPal's window
            // never opens on nothing. The real SDK turns the rejection into
            // `onError`; the stub answers it the same way — by ignoring it.
            void props
              .createOrder?.()
              .then((made) => setCreated(made.orderId))
              .catch(() => {});
          }}
        >
          stub create order
        </button>
        <button
          type="button"
          onClick={() => {
            void props
              .createSubscription?.()
              .then((made) => setCreated(made.subscriptionId))
              .catch(() => {});
          }}
        >
          stub create subscription
        </button>
        <button type="button" onClick={() => props.onApproved("ORDER-1")}>
          stub approve order
        </button>
        <button type="button" onClick={() => props.onApproved("I-SUB-1")}>
          stub approve subscription
        </button>
        <button type="button" onClick={() => props.onCancelled()}>
          stub cancel
        </button>
        <button type="button" onClick={() => props.onFailed()}>
          stub fail
        </button>
        <button type="button" onClick={() => props.onUnavailable()}>
          stub unavailable
        </button>
      </div>
    );
  },
}));

const CLIENT_ID = "CLIENT-ID-FOR-THE-PAGE";

const terms: CommitmentTerms = {
  shape: "recurring",
  itemPrice: money(2499),
  shipping: null,
  tax: null,
  recurrence: { count: 6, period: "month" },
  exit: { kind: "unknown" },
};

const translation = computeCommitment(terms);

const payload = {
  shape: "recurring",
  translation,
  figures: presentFigures(terms, translation, { unstatedAt: "checkout" }),
  labels: { item: "Each delivery", shipping: "Shipping", tax: "Sales tax" },
  summary: "You pay monthly for six months.",
  sources: { paypal: null, published: "the price Channel3 lists at bark.co" },
  exitNote: null,
  exitUnreadable: false,
  quotedExit: null,
  degraded: false,
};

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, json: async () => payload })),
  );
  vi.mocked(extractTerms).mockReset();
  vi.mocked(readProductFromPayPal).mockReset();
  vi.mocked(readProductFromPayPal).mockResolvedValue(null);
  vi.mocked(readMarketProduct).mockReset();
  vi.mocked(readMarketProduct).mockResolvedValue(recordedProduct("YyLUjLT"));
  // A stated term never reaches the model, which is the common case here.
  vi.mocked(resolveExitTerm).mockResolvedValue({
    kind: "stated",
    exit: terms.exit,
    note: null,
    quoted: null,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("consent screen", () => {
  it("shows the three figures for the purchase", async () => {
    render(<ConsentScreen orderId="ORDER-1" slug="ch3-YyLUjLT" />);

    expect(await screen.findByText("Charged today")).toBeInTheDocument();

    const todayRow = screen.getByText("Charged today").closest("div") as HTMLElement;
    // "At least" is its own element now: a word about the figure is set as a
    // word, so it stops reading as part of the amount (IPD 29).
    expect(within(todayRow).getByText("At least")).toBeInTheDocument();
    expect(within(todayRow).getByText("$24.99")).toBeInTheDocument();
    expect(screen.getByText("$149.94")).toBeInTheDocument();
    expect(screen.getByText("Cost to leave")).toBeInTheDocument();
  });

  it("says where the check belongs, and leaves the status line to the page's footnote", async () => {
    render(<ConsentScreen orderId="ORDER-1" slug="ch3-YyLUjLT" />);

    expect(
      await screen.findByText(/it fits any checkout, not just this one/i),
    ).toBeInTheDocument();
    // The sandbox is the page's one line now (IPD 29). This component renders
    // outside that frame, so if the sentence came back here it would be the
    // second place it is said — which is the thing the decision removed.
    expect(screen.queryByText(/real money moves/i)).toBeNull();
  });

  it("keeps the three figures when only the wording is unavailable", async () => {
    vi.mocked(fetch as unknown as () => Promise<unknown>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...payload, degraded: true, summary: "" }),
    });

    render(<ConsentScreen orderId="ORDER-1" slug="ch3-YyLUjLT" />);

    expect(
      await screen.findByText(/we could not write a plain-language summary for this purchase/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Charged today")).toBeInTheDocument();
    expect(screen.getByText("$149.94")).toBeInTheDocument();
  });

  it("moves focus to the breakdown when the shopper says the amount does not match", async () => {
    render(<ConsentScreen orderId="ORDER-1" slug="ch3-YyLUjLT" />);
    await screen.findByText("Charged today");

    await userEvent.click(screen.getByRole("button", { name: /show me the breakdown/i }));

    expect(document.activeElement?.textContent).toBe("Where these figures come from");
  });

  it("puts PayPal's own button where the primary button stood", async () => {
    render(<ConsentScreen orderId="ORDER-1" slug="ch3-YyLUjLT" clientId={CLIENT_ID} />);
    await screen.findByText("Charged today");

    const control = await screen.findByTestId("paypal-control");

    // The shape is the figure's shape, not the button's: one control, told which
    // kind of approval it is standing in front of (IPD 48).
    expect(control).toHaveAttribute("data-shape", "recurring");
    expect(control).toHaveAttribute("data-client-id", CLIENT_ID);
    expect(control).toHaveAttribute("data-environment", "sandbox");
    // Two controls for one act is the defect IPD 28 removed; the old button is
    // not beside PayPal's.
    expect(screen.queryByRole("button", { name: /pay now/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /approve subscription with paypal/i })).toBeNull();
  });

  it("says in the page's own words what PayPal's button will do, and labels the group with it", async () => {
    render(<ConsentScreen orderId="ORDER-1" slug="ch3-YyLUjLT" clientId={CLIENT_ID} />);
    await screen.findByText("Charged today");

    // Seen live on 2026-11-12, PayPal's button prints no amount and its label is
    // one word, so the sentence beside it is the only place the money is named
    // (IPD 48). It is also what a screen reader hears before "Subscribe".
    const group = await screen.findByRole("group", {
      name: /PayPal's button approves the plan above: .*\$24\.99 today, .*\$149\.94 across the term/,
    });
    expect(group).toContainElement(screen.getByTestId("paypal-control"));
  });

  it("keeps the plain button when no client id reached the page", async () => {
    render(<ConsentScreen orderId="ORDER-1" slug="ch3-YyLUjLT" />);
    await screen.findByText("Charged today");

    // Without a client id there is no script to load, so the screen is today's
    // screen rather than a payment slot that cannot ever fill (IPD 50).
    expect(screen.queryByTestId("paypal-control")).toBeNull();
    expect(
      screen.getByRole("button", { name: /approve subscription with paypal/i }),
    ).toBeInTheDocument();
  });

  it("asks our own route for the order, so the amount agreement stays on the server", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...payload, shape: "one_time" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          orderId: "ORDER-9",
          approveUrl: "https://www.sandbox.paypal.com/checkoutnow?token=ORDER-9",
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<ConsentScreen orderId="pending" slug="ch3-YyLUjLT" clientId={CLIENT_ID} />);
    await screen.findByText("Charged today");

    await userEvent.click(await screen.findByRole("button", { name: /stub create order/i }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenLastCalledWith("/api/paypal/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: "ch3-YyLUjLT" }),
      }),
    );
    // What PayPal is handed is our order id — not an amount the browser chose.
    expect(await screen.findByTestId("created")).toHaveTextContent("ORDER-9");
  });

  it("asks our own route for the subscription, and hands PayPal a plan it already made", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...payload, shape: "recurring" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          subscriptionId: "I-SUB-7",
          status: "APPROVAL_PENDING",
          approveUrl: "https://www.sandbox.paypal.com/webapps/billing/x",
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<ConsentScreen orderId="pending" slug="ch3-YyLUjLT" clientId={CLIENT_ID} />);
    await screen.findByText("Charged today");

    await userEvent.click(
      await screen.findByRole("button", { name: /stub create subscription/i }),
    );

    await waitFor(() =>
      expect(fetchMock).toHaveBeenLastCalledWith("/api/paypal/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: "ch3-YyLUjLT" }),
      }),
    );
    expect(await screen.findByTestId("created")).toHaveTextContent("I-SUB-7");
  });

  it("offers the link path when PayPal's script cannot load", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...payload, shape: "one_time" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          orderId: "ORDER-1",
          approveUrl: "https://www.sandbox.paypal.com/checkoutnow?token=ORDER-1",
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<ConsentScreen orderId="pending" slug="ch3-YyLUjLT" clientId={CLIENT_ID} />);
    await screen.findByText("Charged today");

    await userEvent.click(await screen.findByRole("button", { name: /stub unavailable/i }));

    // The fallback is today's path rather than a second implementation: the
    // same route, the same approval link, the same return handling (IPD 50).
    await waitFor(() =>
      expect(fetchMock).toHaveBeenLastCalledWith("/api/paypal/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: "ch3-YyLUjLT" }),
      }),
    );
    expect(
      await screen.findByRole("link", { name: /approve the payment with paypal/i }),
    ).toHaveAttribute("href", "https://www.sandbox.paypal.com/checkoutnow?token=ORDER-1");
  });

  it("offers the link path for a repeating purchase when the script cannot load", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...payload, shape: "recurring" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          subscriptionId: "I-SUB-1",
          status: "APPROVAL_PENDING",
          approveUrl: "https://www.sandbox.paypal.com/webapps/billing/x",
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<ConsentScreen orderId="I-SUB-1" slug="ch3-YyLUjLT" clientId={CLIENT_ID} />);
    await screen.findByText("Charged today");

    await userEvent.click(await screen.findByRole("button", { name: /stub unavailable/i }));

    await waitFor(() =>
      expect(fetchMock).toHaveBeenLastCalledWith("/api/paypal/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: "ch3-YyLUjLT" }),
      }),
    );
    expect(
      await screen.findByRole("link", { name: /approve .* with paypal/i }),
    ).toHaveAttribute("href", "https://www.sandbox.paypal.com/webapps/billing/x");
  });

  it("goes straight to the receipt when a subscription is approved here", async () => {
    render(<ConsentScreen orderId="pending" slug="ch3-YyLUjLT" clientId={CLIENT_ID} />);
    await screen.findByText("Charged today");

    await userEvent.click(
      await screen.findByRole("button", { name: /stub approve subscription/i }),
    );

    // A subscription is approved, never captured: the receipt is the record and
    // it re-reads PayPal before claiming anything (ITD 39).
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith("/receipt/I-SUB-1?slug=ch3-YyLUjLT"),
    );
  });

  it("captures before the receipt when a one-time payment is approved here", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...payload, shape: "one_time" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "COMPLETED", amount: { currency: "USD", minor: 2499 } }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<ConsentScreen orderId="pending" slug="ch3-YyLUjLT" clientId={CLIENT_ID} />);
    await screen.findByText("Charged today");

    await userEvent.click(await screen.findByRole("button", { name: /stub approve order/i }));

    // Approval is not payment: the capture is what moves the money, and it
    // happens on our server before the shopper is sent anywhere (ITD 39).
    await waitFor(() =>
      expect(fetchMock).toHaveBeenLastCalledWith("/api/paypal/orders/ORDER-1/capture", {
        method: "POST",
      }),
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith("/receipt/ORDER-1?slug=ch3-YyLUjLT"));
  });

  it("says nothing was charged when the button itself reports a failure", async () => {
    render(<ConsentScreen orderId="pending" slug="ch3-YyLUjLT" clientId={CLIENT_ID} />);
    await screen.findByText("Charged today");

    await userEvent.click(await screen.findByRole("button", { name: /stub fail/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /PayPal could not complete this payment\. Nothing has been charged\./i,
    );
  });

  it("says nothing was charged when the shopper closes PayPal's window", async () => {
    render(<ConsentScreen orderId="pending" slug="ch3-YyLUjLT" clientId={CLIENT_ID} />);
    await screen.findByText("Charged today");

    await userEvent.click(await screen.findByRole("button", { name: /stub cancel/i }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      /You left PayPal before approving\. Nothing has been charged\./i,
    );
  });

  it("moves focus to the button's resting place when the shopper says the amount matches", async () => {
    render(<ConsentScreen orderId="ORDER-1" slug="ch3-YyLUjLT" clientId={CLIENT_ID} />);
    await screen.findByText("Charged today");
    // Wait for the control, so the focus move has somewhere to land.
    await screen.findByTestId("paypal-control");

    await userEvent.click(screen.getByRole("button", { name: /^yes$/i }));

    // The button is PayPal's and may not be focusable; the container is ours,
    // and it is the honest target (IPD 49).
    expect(document.activeElement?.className).toContain("consent-actions");
  });

  it("sends a one-time purchase to PayPal's approval page when the shopper pays with the plain button", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...payload, shape: "one_time" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          orderId: "ORDER-1",
          approveUrl: "https://www.sandbox.paypal.com/checkoutnow?token=ORDER-1",
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<ConsentScreen orderId="pending" slug="ch3-YyLUjLT" />);
    await screen.findByText("Charged today");

    await userEvent.click(screen.getByRole("button", { name: /pay now/i }));

    expect(fetchMock).toHaveBeenLastCalledWith("/api/paypal/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: "ch3-YyLUjLT" }),
    });
    expect(
      await screen.findByRole("link", { name: /approve the payment with paypal/i }),
    ).toHaveAttribute("href", "https://www.sandbox.paypal.com/checkoutnow?token=ORDER-1");
  });

  it("sends a repeating purchase to PayPal's subscription approval, not to a capture", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...payload, shape: "recurring" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          subscriptionId: "I-SUB-1",
          status: "APPROVAL_PENDING",
          approveUrl: "https://www.sandbox.paypal.com/webapps/billing/x",
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<ConsentScreen orderId="I-SUB-1" slug="ch3-YyLUjLT" />);
    await screen.findByText("Charged today");

    await userEvent.click(screen.getByRole("button", { name: /approve subscription with paypal/i }));

    expect(fetchMock).toHaveBeenLastCalledWith("/api/paypal/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug: "ch3-YyLUjLT" }),
    });
    expect(
      await screen.findByRole("link", { name: /approve .* with paypal/i }),
    ).toHaveAttribute("href", "https://www.sandbox.paypal.com/webapps/billing/x");
  });

  it("captures the order when the shopper comes back from approving", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...payload, shape: "one_time" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: "COMPLETED", amount: { currency: "USD", minor: 2499 } }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<ConsentScreen orderId="ORDER-1" slug="ch3-YyLUjLT" returning />);

    expect(
      await screen.findByText(/payment complete\. paypal has charged/i),
    ).toBeInTheDocument();
    expect(fetchMock).toHaveBeenLastCalledWith("/api/paypal/orders/ORDER-1/capture", {
      method: "POST",
    });
    expect(
      await screen.findByRole("link", { name: /keep a record of this payment/i }),
    ).toHaveAttribute("href", "/receipt/ORDER-1?slug=ch3-YyLUjLT");
  });

  it("reassures the shopper that nothing was charged when they back out at PayPal", async () => {
    render(<ConsentScreen orderId="ORDER-1" slug="ch3-YyLUjLT" cancelled />);

    expect(
      await screen.findByText(/you left paypal before approving\. nothing has been charged\./i),
    ).toBeInTheDocument();
  });
});

describe("a capture we did not get an answer to", () => {
  // The shopper has already approved at PayPal. If our own capture request comes
  // back with nothing, the payment may or may not have been completed — and
  // "nothing has been taken" is a claim only PayPal can make. It is the same
  // rule the cancel button keeps.
  const approvedThen = (answer: { ok: boolean; json: () => Promise<unknown> } | Error) => {
    const capture =
      answer instanceof Error ? Promise.reject(answer) : Promise.resolve(answer);
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({ ok: true, json: async () => ({ ...payload, shape: "one_time" }) })
        .mockReturnValueOnce(capture),
    );
  };

  it("says it cannot tell, rather than that no payment was taken", async () => {
    approvedThen(new TypeError("fetch failed"));

    render(<ConsentScreen orderId="ORDER-1" slug="ch3-YyLUjLT" returning />);

    expect(
      await screen.findByText(/could not confirm whether paypal completed this payment/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/no payment has been taken/i)).toBeNull();
  });

  it("says the same when PayPal answers with an error and no reason", async () => {
    approvedThen({ ok: false, json: async () => ({}) });

    render(<ConsentScreen orderId="ORDER-1" slug="ch3-YyLUjLT" returning />);

    expect(
      await screen.findByText(/could not confirm whether paypal completed this payment/i),
    ).toBeInTheDocument();
  });
});

describe("a refusal the server explained", () => {
  it("keeps the server's sentence when PayPal's script also reports a failure", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ...payload, shape: "one_time" }) })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: "The price changed while you were reading. Nothing was charged.",
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    render(<ConsentScreen orderId="pending" slug="ch3-YyLUjLT" clientId={CLIENT_ID} />);
    await screen.findByText("Charged today");

    // A rejected create callback is what PayPal's SDK turns into `onError`, so
    // both of these happen: the route's reason, then the SDK's generic failure.
    await userEvent.click(await screen.findByRole("button", { name: /stub create order/i }));
    expect(
      await screen.findByText(/the price changed while you were reading/i),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /stub fail/i }));

    // The vaguer sentence must not replace the one that says why.
    expect(screen.getByText(/the price changed while you were reading/i)).toBeInTheDocument();
    expect(screen.queryByText(/paypal could not complete this payment/i)).toBeNull();
  });
});

describe("GET /api/commitment/:orderId", () => {
  const request = (slug: string) =>
    new Request(`http://localhost/api/commitment/ORDER-1?slug=${slug}`);

  it("returns the live listing's figures and schedule without asking a model", async () => {
    const response = await GET(request("ch3-YyLUjLT"), {
      params: Promise.resolve({ orderId: "ORDER-1" }),
    });
    const body = await response.json();

    expect(body.degraded).toBe(false);
    expect(body.shape).toBe("recurring");
    expect(body.translation.today.minor).toBe(2499);
    expect(body.translation.acrossTerm.minor).toBe(14994);
    expect(body.sources.published).toContain("bark.co");
    expect(body.schedule).toMatch(/6 payments of \$24\.99, one a month/);
    expect(body.summary).toBe("");
    expect(extractTerms).not.toHaveBeenCalled();
  });

  it("names the parts itself, so the labels cannot change between two loads", async () => {
    const bodyOf = async () =>
      (await GET(request("ch3-YyLUjLT"), {
        params: Promise.resolve({ orderId: "ORDER-1" }),
      })).json();

    const first = await bodyOf();
    const second = await bodyOf();

    expect(first.labels).toEqual(second.labels);
    expect(first.labels).toEqual({
      item: "BARK 6 Month Subscription",
      shipping: "Shipping",
      tax: "Sales tax",
    });
  });

  it("reads a one-time listing from PayPal first, and names the plan", async () => {
    vi.mocked(readProductFromPayPal).mockResolvedValue({
      slug: "noise-cancelling-headphones",
      paypalProductId: "PROD-1",
      name: "Noise-Cancelling Headphones",
      description: "Ships in two working days.",
      terms: {
        shape: "one_time",
        itemPrice: money(4999),
        shipping: money(0),
        tax: money(0),
        exit: { kind: "none" },
      },
      planLabel: "the PayPal plan for Noise-Cancelling Headphones",
    });

    const response = await GET(request("noise-cancelling-headphones"), {
      params: Promise.resolve({ orderId: "ORDER-1" }),
    });
    const body = await response.json();

    expect(body.sources).toEqual({
      paypal: "the PayPal plan for Noise-Cancelling Headphones",
      published: null,
    });
    expect(body.translation.today).toEqual(money(4999));
  });

  it("keeps the figures when the exit read fails", async () => {
    vi.mocked(resolveExitTerm).mockRejectedValueOnce(new Error("model unavailable"));

    const response = await GET(request("ch3-YyLUjLT"), {
      params: Promise.resolve({ orderId: "ORDER-1" }),
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.exitUnreadable).toBe(true);
    expect(body.degraded).toBe(false);
    expect(body.labels.item).toBe("BARK 6 Month Subscription");
  });
});
