import { describe, expect, it, vi, beforeEach } from "vitest";
import { isModelConfigured } from "@/lib/ai/client";
import { readPublishedExit } from "@/lib/commitment/published-exit";
import { warmPublishedExits } from "@/lib/commitment/warm";
import { bills } from "@/lib/catalog/bills";
import { products } from "@/lib/catalog/products";

vi.mock("@/lib/ai/client", () => ({ isModelConfigured: vi.fn() }));
vi.mock("@/lib/commitment/published-exit", () => ({ readPublishedExit: vi.fn() }));

const unknownExitTexts = new Set(
  [...bills, ...products]
    .filter((entry) => entry.terms.exit.kind === "unknown")
    .map((entry) => entry.description),
);

beforeEach(() => {
  vi.mocked(isModelConfigured).mockReset();
  vi.mocked(readPublishedExit).mockReset();
  vi.mocked(readPublishedExit).mockResolvedValue({ kind: "silent" });
});

describe("warming the exit readings at start-up", () => {
  it("reads the sellers' unknown exit terms once each, before anyone asks", async () => {
    vi.mocked(isModelConfigured).mockReturnValue(true);

    await warmPublishedExits();

    expect(readPublishedExit).toHaveBeenCalledTimes(unknownExitTexts.size);
    for (const text of unknownExitTexts) {
      expect(readPublishedExit).toHaveBeenCalledWith(text);
    }
  });

  it("reads them one at a time, because a free endpoint starves a burst", async () => {
    // Measured live: four descriptions sent at once against a free endpoint, one
    // came back in 37 seconds and the other three were still waiting a minute
    // later. In sequence each call gets the quota to itself.
    vi.mocked(isModelConfigured).mockReturnValue(true);
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let calls = 0;
    vi.mocked(readPublishedExit).mockImplementation(async () => {
      calls += 1;
      if (calls === 1) await gate;
      return { kind: "silent" };
    });

    const warming = warmPublishedExits();
    // Let the first call start and settle into its await.
    await Promise.resolve();
    await Promise.resolve();
    expect(readPublishedExit).toHaveBeenCalledTimes(1);

    release();
    await warming;

    expect(readPublishedExit).toHaveBeenCalledTimes(unknownExitTexts.size);
  });

  it("keeps reading after one text fails, rather than giving up on the rest", async () => {
    vi.mocked(isModelConfigured).mockReturnValue(true);
    vi.mocked(readPublishedExit).mockRejectedValueOnce(new Error("the endpoint dropped the call"));

    await expect(warmPublishedExits()).resolves.toBeUndefined();

    expect(readPublishedExit).toHaveBeenCalledTimes(unknownExitTexts.size);
  });

  it("does not spend model calls when no model is configured", () => {
    // Every reading would be "could not be read", and the cache would then hide
    // the figure long after a model was configured.
    vi.mocked(isModelConfigured).mockReturnValue(false);

    warmPublishedExits();

    expect(readPublishedExit).not.toHaveBeenCalled();
  });
});
