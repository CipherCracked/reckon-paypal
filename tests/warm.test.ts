import { describe, expect, it, vi, beforeEach } from "vitest";
import { isModelConfigured } from "@/lib/ai/client";
import { readPublishedExit } from "@/lib/commitment/published-exit";
import { warmPublishedExits } from "@/lib/commitment/warm";
import { bills } from "@/lib/catalog/bills";
import { products } from "@/lib/catalog/products";
import { readMarketProduct } from "@/lib/market/channel3";
import { recordedProduct } from "./fixtures/channel3-listings";

vi.mock("@/lib/ai/client", () => ({ isModelConfigured: vi.fn() }));
vi.mock("@/lib/commitment/published-exit", () => ({ readPublishedExit: vi.fn() }));
vi.mock("@/lib/market/channel3", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/market/channel3")>()),
  readMarketProduct: vi.fn(),
}));

const unknownExitTexts = new Set(
  [...bills, ...products]
    .filter((entry) => entry.terms.exit.kind === "unknown")
    .map((entry) => entry.description),
);

beforeEach(() => {
  vi.mocked(isModelConfigured).mockReset();
  vi.mocked(readPublishedExit).mockReset();
  vi.mocked(readPublishedExit).mockResolvedValue({ kind: "silent" });
  vi.mocked(readMarketProduct).mockReset();
  vi.mocked(readMarketProduct).mockResolvedValue(null);
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
    // The listings are read from the catalogue first, so wait for those to
    // settle and for the first model call to begin. The gate holds it there.
    await new Promise((resolve) => setTimeout(resolve, 10));
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

describe("warming the listings the front door leads to", () => {
  it("reads the live catalogue's description, not only the ones in the file", async () => {
    // The curated listings are not in lib/catalog — they are read live from the
    // catalogue. Without this the front door's own listing was never warmed, and
    // the first shopper to open it paid the model's forty seconds out of the one
    // screen that has to be quick.
    vi.mocked(isModelConfigured).mockReturnValue(true);
    const listing = recordedProduct("YyLUjLT");
    vi.mocked(readMarketProduct).mockImplementation(async (slug: string) =>
      slug === "ch3-YyLUjLT" ? listing : null,
    );

    await warmPublishedExits();

    expect(readMarketProduct).toHaveBeenCalledWith("ch3-YyLUjLT");
    expect(readPublishedExit).toHaveBeenCalledWith(listing.description);
  });

  it("reads the front door's listing before the file's, because order is what decides", async () => {
    // In sequence, so whichever is read first is the one ready when someone
    // opens the app. The front door listing is YyLUjLT.
    vi.mocked(isModelConfigured).mockReturnValue(true);
    const listing = recordedProduct("YyLUjLT");
    vi.mocked(readMarketProduct).mockResolvedValue(listing);

    await warmPublishedExits();

    expect(vi.mocked(readPublishedExit).mock.calls[0][0]).toBe(listing.description);
  });

  it("still warms the file's texts when the catalogue does not answer", async () => {
    vi.mocked(isModelConfigured).mockReturnValue(true);
    vi.mocked(readMarketProduct).mockRejectedValue(new Error("fetch failed"));

    await expect(warmPublishedExits()).resolves.toBeUndefined();

    expect(readPublishedExit).toHaveBeenCalledTimes(unknownExitTexts.size);
  });
});
