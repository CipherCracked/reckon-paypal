import { beforeEach, describe, expect, it, vi } from "vitest";
import { ModelError } from "@/lib/ai/client";
import { requestQuotations } from "@/lib/ai/read-document";
import {
  clearPublishedExitCache,
  peekListing,
  readListing,
  readPublishedExit,
  readPublishedTerm,
} from "@/lib/commitment/published-exit";

vi.mock("@/lib/ai/read-document", () => ({
  requestQuotations: vi.fn(),
}));

/**
 * A listing is read once for everything the product asks of it (ITD 33, ITD 35).
 *
 * The model charges the same for one span as for five, and this product asks a
 * listing two questions that share one text: how long it runs, and what leaving
 * costs. Reading it twice would double the wait on the first visitor and the
 * quota spent on every listing, for no fact the first reading did not already
 * carry. The cache is keyed by the text itself, because an edited listing is a
 * different listing.
 */

const listing =
  "BarkBox 6-Month Subscription. $30.00 a box. Cancel any time, no fee.";

beforeEach(() => {
  vi.mocked(requestQuotations).mockReset();
  clearPublishedExitCache();
});

describe("one reading, both questions", () => {
  it("answers the term and the exit from a single model call", async () => {
    vi.mocked(requestQuotations).mockResolvedValue({
      quotations: [
        { field: "termLength", quote: "6-Month Subscription" },
        { field: "freeToLeave", quote: "Cancel any time, no fee." },
      ],
      summary: "",
    });

    const reading = await readListing(listing);

    expect(reading.term).toMatchObject({ kind: "stated", count: 6, period: "month" });
    expect(reading.exit).toMatchObject({ kind: "stated", exit: { kind: "none" } });
    expect(requestQuotations).toHaveBeenCalledTimes(1);
  });

  it("serves both questions from the memory of that one call", async () => {
    vi.mocked(requestQuotations).mockResolvedValue({ quotations: [], summary: "" });

    await readPublishedTerm(listing);
    await readPublishedExit(listing);

    expect(requestQuotations).toHaveBeenCalledTimes(1);
  });

  it("reads an edited listing again, because the words are the key", async () => {
    vi.mocked(requestQuotations).mockImplementation(async (text) => ({
      quotations: text.includes("12-Month")
        ? [{ field: "termLength", quote: "12-Month Subscription" }]
        : [{ field: "termLength", quote: "6-Month Subscription" }],
      summary: "",
    }));

    const before = await readPublishedTerm(listing);
    const after = await readPublishedTerm(`${listing} Now a 12-Month Subscription.`);

    expect(before).toMatchObject({ kind: "stated", count: 6 });
    expect(after).toMatchObject({ kind: "stated", count: 12 });
    expect(requestQuotations).toHaveBeenCalledTimes(2);
  });

  it("reports a failed read on both questions, and remembers neither", async () => {
    vi.mocked(requestQuotations).mockRejectedValueOnce(new ModelError("Request timed out."));

    const failed = await readListing(listing);
    expect(failed.term).toMatchObject({ kind: "unreadable", reason: "Request timed out." });
    expect(failed.exit).toMatchObject({ kind: "unreadable", reason: "Request timed out." });

    vi.mocked(requestQuotations).mockResolvedValue({ quotations: [], summary: "" });
    const second = await readPublishedExit(listing);

    expect(requestQuotations).toHaveBeenCalledTimes(2);
    expect(second).toEqual({ kind: "silent" });
  });

  it("answers an empty listing as silence without asking the model", async () => {
    const reading = await readListing("  ");

    expect(reading).toEqual({ term: { kind: "silent" }, exit: { kind: "silent" } });
    expect(requestQuotations).not.toHaveBeenCalled();
  });

  it("shares one reading between the two questions asked while it runs", async () => {
    let release: (value: { quotations: never[]; summary: string }) => void = () => {};
    vi.mocked(requestQuotations).mockReturnValue(
      new Promise((resolve) => {
        release = resolve;
      }),
    );

    const term = readPublishedTerm(listing);
    const exit = readPublishedExit(listing);
    release({ quotations: [], summary: "" });

    await expect(term).resolves.toEqual({ kind: "silent" });
    await expect(exit).resolves.toEqual({ kind: "silent" });
    expect(requestQuotations).toHaveBeenCalledTimes(1);
  });
});

describe("a caller that cannot wait", () => {
  it("answers from memory and starts nothing", () => {
    // A request that is about to move money must not spend a minute on a model,
    // so it gets what is remembered or nothing — never a new call.
    expect(peekListing(listing)).toBeNull();
    expect(requestQuotations).not.toHaveBeenCalled();
  });

  it("answers with the reading it remembered", async () => {
    vi.mocked(requestQuotations).mockResolvedValue({
      quotations: [{ field: "termLength", quote: "6-Month Subscription" }],
      summary: "",
    });

    await readListing(listing);

    expect(peekListing(listing)?.term).toMatchObject({ kind: "stated", count: 6 });
    expect(requestQuotations).toHaveBeenCalledTimes(1);
  });
});
