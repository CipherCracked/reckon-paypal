import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/record/words/route";
import { writeRecordSentence } from "@/lib/ai/record-words";
import { clearSentenceCache } from "@/lib/ai/sentence-cache";
import { UnknownNumeralError } from "@/lib/ai/guard";
import { money } from "@/lib/money";
import { retrieveSubscription } from "@/lib/paypal/retrieve";
import { retrievePaymentsTaken } from "@/lib/paypal/transactions";

vi.mock("@/lib/paypal/retrieve", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/paypal/retrieve")>()),
  retrieveSubscription: vi.fn(),
}));

vi.mock("@/lib/paypal/transactions", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/paypal/transactions")>()),
  retrievePaymentsTaken: vi.fn(),
}));

vi.mock("@/lib/ai/record-words", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/ai/record-words")>()),
  writeRecordSentence: vi.fn(),
}));

const SUBSCRIPTION = {
  id: "I-GPD3KPT15D79",
  status: "CANCELLED",
  nextBillingTime: null,
  statusChangeTime: null,
  startedAt: "2026-11-10T20:47:51Z",
  amount: money(2499),
  terms: {
    shape: "recurring" as const,
    itemPrice: money(2499),
    shipping: money(0),
    tax: money(0),
    recurrence: { count: 6, period: "month" as const },
    exit: { kind: "unknown" as const },
  },
};

const request = (subscriptionId: unknown) =>
  new Request("http://localhost/api/record/words", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscriptionId }),
  });

beforeEach(() => {
  clearSentenceCache();
  vi.mocked(retrieveSubscription).mockReset();
  vi.mocked(retrieveSubscription).mockResolvedValue(SUBSCRIPTION);
  vi.mocked(retrievePaymentsTaken).mockReset();
  vi.mocked(retrievePaymentsTaken).mockResolvedValue({
    kind: "read",
    count: 1,
    amount: money(2499),
  });
  vi.mocked(writeRecordSentence).mockReset();
  vi.mocked(writeRecordSentence).mockResolvedValue("PayPal has taken $24.99 so far.");
});

describe("POST /api/record/words", () => {
  it("writes a sentence over the figures PayPal's record holds", async () => {
    const response = await POST(request(SUBSCRIPTION.id));

    expect(await response.json()).toEqual({ sentence: "PayPal has taken $24.99 so far." });
    expect(writeRecordSentence).toHaveBeenCalledWith(
      {
        count: 1,
        taken: money(2499),
        termCount: 6,
        acrossTerm: money(14994),
        stillToCome: money(12495),
      },
      { retries: 0 },
    );
  });

  it("asks for nothing when the payment record could not be read", async () => {
    vi.mocked(retrievePaymentsTaken).mockResolvedValue({ kind: "unavailable" });

    const response = await POST(request(SUBSCRIPTION.id));

    expect(await response.json()).toEqual({ sentence: null });
    expect(writeRecordSentence).not.toHaveBeenCalled();
  });

  it("asks for nothing when the plan states no length", async () => {
    vi.mocked(retrieveSubscription).mockResolvedValue({ ...SUBSCRIPTION, terms: null });

    const response = await POST(request(SUBSCRIPTION.id));

    expect(await response.json()).toEqual({ sentence: null });
    expect(writeRecordSentence).not.toHaveBeenCalled();
  });

  it("says nothing rather than failing the page when a sentence is refused", async () => {
    vi.mocked(writeRecordSentence).mockRejectedValue(new UnknownNumeralError("$99.00"));

    const response = await POST(request(SUBSCRIPTION.id));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ sentence: null });
  });

  it("refuses an id that is not shaped like PayPal's", async () => {
    const response = await POST(request("not an id"));

    expect(response.status).toBe(400);
    expect(retrieveSubscription).not.toHaveBeenCalled();
  });

  it("does not pay for the same sentence twice", async () => {
    await POST(request(SUBSCRIPTION.id));
    const second = await POST(request(SUBSCRIPTION.id));

    expect(await second.json()).toEqual({ sentence: "PayPal has taken $24.99 so far." });
    expect(writeRecordSentence).toHaveBeenCalledTimes(1);
  });
});
