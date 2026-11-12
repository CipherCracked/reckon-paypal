import { beforeEach, describe, expect, it, vi } from "vitest";
import { ModelError } from "@/lib/ai/client";
import { requestQuotations } from "@/lib/ai/read-document";
import { readProductCardFromPayPal, readProductFromPayPal } from "@/lib/paypal/catalog";
import { resolveCatalogue, resolveProduct, resolveProductCard, resolveProductOutcome } from "@/lib/catalog/resolve";
import { clearPublishedExitCache } from "@/lib/commitment/published-exit";
import { MarketError, readMarketProduct, type MarketProduct } from "@/lib/market/channel3";
import { money } from "@/lib/money";
import { recordedProduct } from "./fixtures/channel3-listings";

vi.mock("@/lib/paypal/catalog", () => ({
  readProductCardFromPayPal: vi.fn(),
  readProductFromPayPal: vi.fn(),
}));

vi.mock("@/lib/market/channel3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/market/channel3")>();
  return { ...actual, readMarketProduct: vi.fn() };
});

vi.mock("@/lib/ai/read-document", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/read-document")>();
  return { ...actual, requestQuotations: vi.fn() };
});

const card = {
  slug: "noise-cancelling-headphones",
  paypalProductId: "PROD-1",
  name: "Headphones Club",
  description: "Shipped from Leeds.",
};

const terms = {
  shape: "one_time" as const,
  itemPrice: money(4999),
  shipping: money(0),
  tax: money(0),
  exit: { kind: "none" as const },
};

function oneTimeListing(id: string): MarketProduct {
  return {
    id,
    title: "A real product",
    description: "What the seller wrote.",
    brand: null,
    image: null,
    rating: null,
    offers: [
      {
        domain: "shop.example",
        url: "https://shop.example/p",
        price: money(1999),
        compareAt: null,
        availability: "InStock",
      },
    ],
  };
}

/** A listing the map never curated, which states its own term. */
function statedListing(id: string): MarketProduct {
  return {
    ...oneTimeListing(id),
    title: "BarkBox 6-Month Subscription",
    description: "A 6-Month Subscription, delivered monthly.",
  };
}

beforeEach(() => {
  vi.mocked(readProductCardFromPayPal).mockReset();
  vi.mocked(readProductFromPayPal).mockReset();
  vi.mocked(readMarketProduct).mockReset();
  vi.mocked(requestQuotations).mockReset();
  vi.mocked(readProductCardFromPayPal).mockResolvedValue(null);
  vi.mocked(readProductFromPayPal).mockResolvedValue(null);
  // A model that was asked and found nothing to point at. Tests that care about
  // the reading set their own answer.
  vi.mocked(requestQuotations).mockResolvedValue({ quotations: [], summary: "" });
  clearPublishedExitCache();
});

describe("reading a listing from PayPal (IPD 20)", () => {
  it("names PayPal's catalogue when the card was read, not the file", async () => {
    vi.mocked(readProductCardFromPayPal).mockResolvedValue(card);

    await expect(resolveProductCard("noise-cancelling-headphones")).resolves.toEqual({
      slug: "noise-cancelling-headphones",
      name: "Headphones Club",
      description: "Shipped from Leeds.",
      sources: { paypal: "PayPal's catalogue", published: null },
    });
  });

  it("falls back to the file, and says so, when PayPal is unreachable", async () => {
    vi.mocked(readProductCardFromPayPal).mockRejectedValue(
      new Error("PayPal credentials are not configured."),
    );

    const resolved = await resolveProductCard("noise-cancelling-headphones");

    expect(resolved?.name).toBe("Noise-Cancelling Headphones");
    expect(resolved?.sources).toEqual({
      paypal: null,
      published: "the terms shown on this page",
    });
  });

  it("still refuses a slug the file does not have", async () => {
    await expect(resolveProductCard("not-a-product")).resolves.toBeNull();
  });
});

describe("reading a commitment from PayPal", () => {
  it("takes the plan's terms and names the plan, not the catalogue", async () => {
    vi.mocked(readProductFromPayPal).mockResolvedValue({
      ...card,
      terms,
      planLabel: "the PayPal plan for Headphones Club",
    });

    const resolved = await resolveProduct("noise-cancelling-headphones");

    expect(resolved?.terms).toEqual(terms);
    expect(resolved?.sources).toEqual({
      paypal: "the PayPal plan for Headphones Club",
      published: null,
    });
    expect(resolved?.descriptionLabel).toBe("the description published with the PayPal product");
    expect(resolved?.listed).toBeUndefined();
  });

  it("falls back to the file's terms and labels this page's description", async () => {
    const resolved = await resolveProduct("noise-cancelling-headphones");

    expect(resolved?.terms?.itemPrice).toEqual(money(4799));
    expect(resolved?.sources.published).toBe("the terms shown on this page");
    expect(resolved?.descriptionLabel).toBe("the description shown on this page");
  });
});

describe("reading a real listing", () => {
  it("turns a curated subscription into a recurring commitment at the live price", async () => {
    vi.mocked(readMarketProduct).mockResolvedValue(recordedProduct("YyLUjLT"));

    const resolved = await resolveProduct("ch3-YyLUjLT");

    expect(resolved?.listed).toBe(true);
    expect(resolved?.terms?.shape).toBe("recurring");
    expect(resolved?.terms?.itemPrice).toEqual(money(2499));
    expect(resolved?.terms?.recurrence).toEqual({ count: 6, period: "month" });
    expect(resolved?.terms?.exit).toEqual({ kind: "unknown" });
    expect(resolved?.termState).toEqual({ kind: "stated", quote: "6 month BarkBox plan" });
    expect(resolved?.sources.published).toContain("the price Channel3 lists at bark.co");
    expect(resolved?.sources.published).toContain("6 month BarkBox plan");
  });

  it("schedules a listing the map never curated, because its words say so", async () => {
    vi.mocked(readMarketProduct).mockResolvedValue(statedListing("prd00050"));
    vi.mocked(requestQuotations).mockResolvedValue({
      quotations: [{ field: "termLength", quote: "BarkBox 6-Month Subscription" }],
      summary: "",
    });

    const resolved = await resolveProduct("ch3-prd00050", { term: "wait" });

    expect(resolved?.terms?.shape).toBe("recurring");
    expect(resolved?.terms?.recurrence).toEqual({ count: 6, period: "month" });
    expect(resolved?.termState).toEqual({
      kind: "stated",
      quote: "BarkBox 6-Month Subscription",
    });
    expect(resolved?.sources.published).toContain("BarkBox 6-Month Subscription");
  });

  it("says a listing that states no term is paid once", async () => {
    vi.mocked(readMarketProduct).mockResolvedValue(oneTimeListing("prd00050"));

    const resolved = await resolveProduct("ch3-prd00050", { term: "wait" });

    expect(resolved?.terms?.shape).toBe("one_time");
    expect(resolved?.terms?.itemPrice).toEqual(money(1999));
    expect(resolved?.termState).toEqual({ kind: "silent" });
    expect(resolved?.sources.published).toBe("the price Channel3 lists at shop.example");
  });

  it("refuses a schedule the money path cannot express", async () => {
    vi.mocked(readMarketProduct).mockResolvedValue({
      ...oneTimeListing("prd00050"),
      title: "Coffee Club",
      description: "A 12-month Coffee Club membership, billed quarterly.",
    });
    vi.mocked(requestQuotations).mockResolvedValue({
      quotations: [
        { field: "termLength", quote: "12-month Coffee Club membership" },
        { field: "period", quote: "billed quarterly" },
      ],
      summary: "",
    });

    const resolved = await resolveProduct("ch3-prd00050", { term: "wait" });

    expect(resolved?.terms).toBeNull();
    expect(resolved?.termState).toEqual({
      kind: "unschedulable",
      reason: "cadence",
      quote: "12-month Coffee Club membership",
    });
    expect(resolved?.sources.published).toBe("the price Channel3 lists at shop.example");
  });

  it("keeps a curated listing schedulable when a listing states no term but its sentence is still there", async () => {
    // The model answered and pointed at nothing; the fixture's sentence is still
    // in the live record, so the fixture is not stale — it is what was missed.
    vi.mocked(readMarketProduct).mockResolvedValue(recordedProduct("DAaHyQc"));

    const resolved = await resolveProduct("ch3-DAaHyQc", { term: "wait" });

    expect(resolved?.terms?.recurrence).toEqual({ count: 3, period: "month" });
    expect(resolved?.termState).toEqual({ kind: "stated", quote: "3 Month Subscription" });
  });

  it("keeps a curated listing schedulable when the reading could not happen", async () => {
    // A model that is down is not the merchant's silence, and the front door
    // opens on a fixture listing: the checked fixture answers rather than the
    // demo losing its figures.
    vi.mocked(readMarketProduct).mockResolvedValue(recordedProduct("YyLUjLT"));
    vi.mocked(requestQuotations).mockRejectedValue(new ModelError("No model is configured."));

    const resolved = await resolveProduct("ch3-YyLUjLT", { term: "wait" });

    expect(resolved?.terms?.recurrence).toEqual({ count: 6, period: "month" });
    expect(resolved?.termState).toEqual({ kind: "stated", quote: "6 month BarkBox plan" });
  });

  it("answers nothing when the catalogue no longer lists the product", async () => {
    vi.mocked(readMarketProduct).mockResolvedValue(null);

    await expect(resolveProduct("ch3-YyLUjLT")).resolves.toBeNull();
  });

  it("does not quote a curated sentence the merchant has rewritten", async () => {
    const listing = recordedProduct("YyLUjLT");
    vi.mocked(readMarketProduct).mockResolvedValue({
      ...listing,
      description: "A box for dogs. No plan length is stated here.",
    });

    const resolved = await resolveProduct("ch3-YyLUjLT", { term: "wait" });

    expect(resolved?.termState).toEqual({ kind: "silent" });
    expect(resolved?.terms?.shape).toBe("one_time");
  });

  it("answers nothing when the listing has no offer anyone can buy", async () => {
    const listing = recordedProduct("YyLUjLT");
    vi.mocked(readMarketProduct).mockResolvedValue({
      ...listing,
      offers: [{ ...listing.offers[0], availability: "OutOfStock" }],
    });

    await expect(resolveProduct("ch3-YyLUjLT")).resolves.toBeNull();
  });
});

describe("a money route that cannot wait for a reading", () => {
  it("says the listing has not been read, and asks no model", async () => {
    vi.mocked(readMarketProduct).mockResolvedValue(statedListing("prd00050"));

    const resolved = await resolveProduct("ch3-prd00050");

    expect(resolved?.terms).toBeNull();
    expect(resolved?.termState).toEqual({ kind: "notRead" });
    expect(requestQuotations).not.toHaveBeenCalled();
  });

  it("takes the reading the product page already made", async () => {
    vi.mocked(readMarketProduct).mockResolvedValue(statedListing("prd00050"));
    vi.mocked(requestQuotations).mockResolvedValue({
      quotations: [{ field: "termLength", quote: "BarkBox 6-Month Subscription" }],
      summary: "",
    });

    await resolveProduct("ch3-prd00050", { term: "wait" });
    const again = await resolveProduct("ch3-prd00050");

    expect(again?.terms?.recurrence).toEqual({ count: 6, period: "month" });
    expect(again?.termState).toEqual({
      kind: "stated",
      quote: "BarkBox 6-Month Subscription",
    });
    expect(requestQuotations).toHaveBeenCalledTimes(1);
  });

  it("still answers a curated listing from the fixture, with no reading at all", async () => {
    vi.mocked(readMarketProduct).mockResolvedValue(recordedProduct("YyLUjLT"));

    const resolved = await resolveProduct("ch3-YyLUjLT");

    expect(resolved?.terms?.recurrence).toEqual({ count: 6, period: "month" });
    expect(requestQuotations).not.toHaveBeenCalled();
  });
});

// The three states, kept apart (IPD 26's distinction, applied to the catalogue).
// `resolveProduct` is still allowed to throw — a screen with something else to
// say may prefer to hear about it — but a screen that renders the answer has to
// be able to render all three without a 500.
describe("a lookup that cannot fail the page", () => {
  it("finds the listing", async () => {
    vi.mocked(readMarketProduct).mockResolvedValue(recordedProduct("YyLUjLT"));

    const outcome = await resolveProductOutcome("ch3-YyLUjLT");

    expect(outcome.kind).toBe("found");
  });

  it("says the listing is absent when the catalogue no longer carries it", async () => {
    vi.mocked(readMarketProduct).mockResolvedValue(null);

    await expect(resolveProductOutcome("ch3-YyLUjLT")).resolves.toEqual({ kind: "absent" });
  });

  it("says the catalogue could not be read when the read threw, rather than throwing on", async () => {
    // The three ways this happens in production all arrive here as a throw:
    // no key configured, a non-OK reply, and a deadline that fired. The visitor
    // gets one sentence for all of them; the log gets the difference.
    vi.mocked(readMarketProduct).mockRejectedValue(
      new MarketError("No product catalogue key is configured."),
    );
    const warned = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(resolveProductOutcome("ch3-YyLUjLT")).resolves.toEqual({ kind: "unreadable" });
    expect(warned).toHaveBeenCalledWith(
      expect.stringContaining("ch3-YyLUjLT"),
      "No product catalogue key is configured.",
    );
    warned.mockRestore();
  });

  it("says the catalogue could not be read when the deadline aborted the read", async () => {
    // `withinDeadline` aborts the fetch, so a timeout is not a `MarketError` —
    // it is whatever the platform throws for an aborted request. Catching only
    // the catalogue's own error class would leave the front door 500ing on the
    // slowest failure of all.
    vi.mocked(readMarketProduct).mockRejectedValue(
      Object.assign(new Error("The operation was aborted."), { name: "AbortError" }),
    );
    const warned = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(resolveProductOutcome("ch3-YyLUjLT")).resolves.toEqual({ kind: "unreadable" });
    warned.mockRestore();
  });
});

describe("listing the whole catalogue", () => {
  it("resolves each card on its own, so one PayPal answer does not relabel the rest", async () => {
    vi.mocked(readProductCardFromPayPal).mockImplementation(async (slug) =>
      slug === "noise-cancelling-headphones" ? card : null,
    );

    const catalogue = await resolveCatalogue();

    expect(catalogue).toHaveLength(1);
    expect(catalogue[0].sources.paypal).toBe("PayPal's catalogue");
  });
});
