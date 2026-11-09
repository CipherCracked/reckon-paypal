import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { exampleDocuments } from "@/lib/catalog/examples";
import type { Attempt, ReadingAnswer } from "@/lib/document/answer";
import { cachedReading, clearReadingCache } from "@/lib/document/reading-cache";

function candidates(notice: string): ReadingAnswer {
  return { mode: "candidates", notice, candidates: { amounts: [], dates: [] } };
}

function answerWith(notice: string, keep = true): Promise<Attempt> {
  return Promise.resolve({ answer: candidates(notice), keep });
}

const document = "A document long enough to be read, saying what it asks for.";

beforeEach(() => {
  clearReadingCache();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("remembering a reading", () => {
  it("answers a text it has already read without reading it again", async () => {
    const work = vi.fn(() => answerWith("read once"));

    await cachedReading(document, work);
    const second = await cachedReading(document, work);

    expect(second).toEqual(candidates("read once"));
    expect(work).toHaveBeenCalledTimes(1);
  });

  it("finds the same document whatever spacing it was pasted with", async () => {
    const work = vi.fn(() => answerWith("read once"));

    await cachedReading("one   two\nthree", work);
    await cachedReading(" one two three ", work);

    expect(work).toHaveBeenCalledTimes(1);
  });

  it("reads a text once when two requests arrive together", async () => {
    let release!: (result: Attempt) => void;
    const gate = new Promise<Attempt>((resolve) => {
      release = resolve;
    });
    const work = vi.fn(() => gate);

    const first = cachedReading(document, work);
    const second = cachedReading(document, work);
    await Promise.resolve();
    // The second request joined the first rather than starting one of its own.
    expect(work).toHaveBeenCalledTimes(1);

    release({ answer: candidates("joined"), keep: true });

    await expect(first).resolves.toEqual(candidates("joined"));
    await expect(second).resolves.toEqual(candidates("joined"));
  });

  it("does not remember an answer the reading would not stand behind", async () => {
    const work = vi.fn(() => answerWith("could not be interpreted", false));

    await cachedReading(document, work);
    await cachedReading(document, work);

    // A timeout is a fact about one attempt; the next click reads again.
    expect(work).toHaveBeenCalledTimes(2);
  });

  it("does not remember a reading that threw", async () => {
    const work = vi
      .fn<() => Promise<Attempt>>()
      .mockRejectedValueOnce(new Error("the endpoint did not answer"))
      .mockResolvedValueOnce({ answer: candidates("second attempt"), keep: true });

    await expect(cachedReading(document, work)).rejects.toThrow("did not answer");
    await expect(cachedReading(document, work)).resolves.toEqual(
      candidates("second attempt"),
    );
    expect(work).toHaveBeenCalledTimes(2);
  });

  it("keeps an example for good, and a visitor's document only for a while", async () => {
    vi.useFakeTimers();
    const work = vi.fn(() => answerWith("once"));
    const example = exampleDocuments[0].text;

    await cachedReading(example, work);
    await cachedReading(document, work);
    expect(work).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(11 * 60 * 1000);

    // The example is content that never changes: its reading is still the
    // answer, and it is not read again.
    await cachedReading(example, work);
    expect(work).toHaveBeenCalledTimes(2);

    // The visitor's document is served from what is there, and read again
    // behind them rather than making them wait for the same words twice.
    const served = cachedReading(document, work);
    await expect(served).resolves.toEqual(candidates("once"));
    expect(work).toHaveBeenCalledTimes(3);
  });

  it("drops the oldest visitor document rather than growing without a limit", async () => {
    const work = vi.fn(() => answerWith("once"));
    const documentAt = (index: number) =>
      `Document number ${index}, long enough for the reader to accept it.`;

    for (let index = 0; index < 51; index += 1) {
      await cachedReading(documentAt(index), work);
    }
    expect(work).toHaveBeenCalledTimes(51);

    // The first one had to go to keep the store bounded, so it is read again.
    await cachedReading(documentAt(0), work);
    expect(work).toHaveBeenCalledTimes(52);
  });
});
