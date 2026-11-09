import { describe, it, expect, vi, beforeEach } from "vitest";
import { isModelConfigured } from "@/lib/ai/client";
import { exampleDocuments } from "@/lib/catalog/examples";
import { answerReading } from "@/lib/document/answer";
import { clearReadingCache } from "@/lib/document/reading-cache";
import { warmExampleReadings } from "@/lib/document/warm";

vi.mock("@/lib/ai/client", () => ({ isModelConfigured: vi.fn() }));
vi.mock("@/lib/document/answer", () => ({ answerReading: vi.fn() }));

/** Enough microtask turns for the cache to have started the first reading. */
async function settle(turns = 8): Promise<void> {
  for (let turn = 0; turn < turns; turn += 1) await Promise.resolve();
}

const answered = {
  answer: { mode: "candidates" as const, notice: "read", candidates: { amounts: [], dates: [] } },
  keep: true,
};

beforeEach(() => {
  clearReadingCache();
  vi.mocked(answerReading).mockReset();
  vi.mocked(answerReading).mockResolvedValue(answered);
  vi.mocked(isModelConfigured).mockReturnValue(true);
});

describe("warming the example documents", () => {
  it("reads every example once", async () => {
    await warmExampleReadings();

    expect(vi.mocked(answerReading).mock.calls.map(([text]) => text)).toEqual(
      exampleDocuments.map((example) => example.text),
    );
  });

  it("reads them one at a time", async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let calls = 0;
    vi.mocked(answerReading).mockImplementation(async () => {
      calls += 1;
      if (calls === 1) await gate;
      return answered;
    });

    const warming = warmExampleReadings();
    await settle();

    // A burst against one endpoint starves itself: the second reading must wait
    // for the first rather than run beside it.
    expect(answerReading).toHaveBeenCalledTimes(1);

    release();
    await warming;
    expect(answerReading).toHaveBeenCalledTimes(exampleDocuments.length);
  });

  it("keeps going when one example could not be read", async () => {
    vi.mocked(answerReading).mockRejectedValueOnce(new Error("the endpoint did not answer"));

    await warmExampleReadings();

    expect(answerReading).toHaveBeenCalledTimes(exampleDocuments.length);
  });

  it("spends nothing when no model is configured", async () => {
    vi.mocked(isModelConfigured).mockReturnValue(false);

    await warmExampleReadings();

    // Every example would read "could not be interpreted", and remembering that
    // would turn the demonstration into the opposite of what it shows.
    expect(answerReading).not.toHaveBeenCalled();
  });
});
