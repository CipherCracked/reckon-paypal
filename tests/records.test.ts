import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The scan is the only way from a signed-in person to their commitments (ITD 23),
 * and its bounds are what keep it honest: a bounded scan that stops must say so,
 * and a scan that could not run must never look like an empty list (IPD 26).
 */

const paypalRequest = vi.hoisted(() => vi.fn());

vi.mock("@/lib/paypal/client", () => ({
  paypalRequest,
  paypalBaseUrl: () => "https://api-m.sandbox.paypal.com",
}));

const { findSubscriptionsFor, MAX_PAGES, PAGE_SIZE } = await import("@/lib/paypal/records");

const PAYER = "D5CKAUQ8V7ADL";

/** A subscription read as PayPal sends it: the payer is on the per-id record. */
function subscription(id: string, payerId: string, status = "ACTIVE") {
  return { id, status, subscriber: { payer_id: payerId } };
}

/** Wires the mock to a fixed merchant list plus per-id reads. */
function wire(ids: string[], reads: Record<string, unknown>) {
  paypalRequest.mockImplementation((path: string) => {
    if (path.startsWith("/v1/billing/subscriptions?")) {
      const page = Number(new URL(`https://x${path}`).searchParams.get("page"));
      const slice = ids.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
      return Promise.resolve({ subscriptions: slice.map((id) => ({ id, status: "ACTIVE" })) });
    }
    const id = path.split("/").pop()!;
    const body = reads[id];
    if (body instanceof Error) return Promise.reject(body);
    return Promise.resolve(body);
  });
}

beforeEach(() => {
  paypalRequest.mockReset();
});

describe("finding one person's subscriptions", () => {
  it("keeps the ones under the account asking, and drops the rest", () => {
    wire(["I-ONE", "I-TWO"], {
      "I-ONE": subscription("I-ONE", PAYER),
      "I-TWO": subscription("I-TWO", "SOMEONE-ELSE"),
    });

    return expect(findSubscriptionsFor(PAYER)).resolves.toEqual({
      kind: "found",
      records: [{ id: "I-ONE", status: "ACTIVE" }],
      scanned: 2,
      stopped: false,
    });
  });

  it("says it stopped when the page limit is reached", async () => {
    // Five full pages: there may be more, and a list that cannot say so is a claim.
    const ids = Array.from({ length: MAX_PAGES * PAGE_SIZE }, (_, i) => `I-${i}`);
    const reads = Object.fromEntries(ids.map((id) => [id, subscription(id, PAYER)]));
    wire(ids, reads);

    const result = await findSubscriptionsFor(PAYER);

    expect(result).toMatchObject({ kind: "found", scanned: MAX_PAGES * PAGE_SIZE, stopped: true });
  });

  it("does not let one unreadable record hide the others", async () => {
    wire(["I-ONE", "I-TWO"], {
      "I-ONE": new Error("PayPal request failed with 500."),
      "I-TWO": subscription("I-TWO", PAYER),
    });

    const result = await findSubscriptionsFor(PAYER);

    expect(result).toEqual({
      kind: "found",
      records: [{ id: "I-TWO", status: "ACTIVE" }],
      scanned: 2,
      stopped: false,
    });
  });

  it("fails the whole scan on bad credentials rather than reporting none", async () => {
    paypalRequest.mockRejectedValue(Object.assign(new Error("PayPal rejected the credentials."), { status: 401 }));

    // "We could not look" is a fact about us; "you have none" would be a fact
    // about the person, and the scan learned nothing about them.
    await expect(findSubscriptionsFor(PAYER)).resolves.toEqual({ kind: "unavailable" });
  });

  it("reports a scan it could not finish as unavailable, not as empty", async () => {
    paypalRequest.mockRejectedValue(new Error("fetch failed"));

    await expect(findSubscriptionsFor(PAYER)).resolves.toEqual({ kind: "unavailable" });
  });

  it("treats a record with no subscriber as not this person's", async () => {
    wire(["I-ONE"], { "I-ONE": { id: "I-ONE", status: "ACTIVE" } });

    const result = await findSubscriptionsFor(PAYER);

    expect(result).toMatchObject({ kind: "found", records: [] });
  });
});
