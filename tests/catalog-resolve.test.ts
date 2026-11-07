import { beforeEach, describe, expect, it, vi } from "vitest";
import { readProductCardFromPayPal, readProductFromPayPal } from "@/lib/paypal/catalog";
import { resolveCatalogue, resolveProduct, resolveProductCard } from "@/lib/catalog/resolve";
import { money } from "@/lib/money";

vi.mock("@/lib/paypal/catalog", () => ({
  readProductCardFromPayPal: vi.fn(),
  readProductFromPayPal: vi.fn(),
}));

const card = {
  slug: "coffee-subscription",
  paypalProductId: "PROD-1",
  name: "Coffee Club",
  description: "Roasted in Leeds.",
};

const terms = {
  shape: "recurring" as const,
  itemPrice: money(1500),
  shipping: money(0),
  tax: money(0),
  recurrence: { count: 6, period: "month" as const },
  exit: { kind: "unknown" as const },
};

beforeEach(() => {
  vi.mocked(readProductCardFromPayPal).mockReset();
  vi.mocked(readProductFromPayPal).mockReset();
  vi.mocked(readProductCardFromPayPal).mockResolvedValue(null);
  vi.mocked(readProductFromPayPal).mockResolvedValue(null);
});

describe("reading a listing from PayPal (IPD 20)", () => {
  it("names PayPal's catalogue when the card was read, not the file", async () => {
    vi.mocked(readProductCardFromPayPal).mockResolvedValue(card);

    await expect(resolveProductCard("coffee-subscription")).resolves.toEqual({
      slug: "coffee-subscription",
      name: "Coffee Club",
      description: "Roasted in Leeds.",
      sources: { paypal: "PayPal's catalogue", published: null },
    });
  });

  it("falls back to the file, and says so, when PayPal is unreachable", async () => {
    vi.mocked(readProductCardFromPayPal).mockRejectedValue(new Error("PayPal credentials are not configured."));

    const resolved = await resolveProductCard("coffee-subscription");

    expect(resolved?.name).toBe("Coffee Subscription");
    expect(resolved?.sources).toEqual({
      paypal: null,
      published: "the terms shown on this page",
    });
  });

  it("falls back when PayPal has no id for the slug", async () => {
    const resolved = await resolveProductCard("mattress-financed");

    expect(resolved?.slug).toBe("mattress-financed");
    expect(resolved?.sources.paypal).toBeNull();
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
      planLabel: "the PayPal plan for Coffee Club",
    });

    const resolved = await resolveProduct("coffee-subscription");

    expect(resolved?.terms).toEqual(terms);
    expect(resolved?.sources).toEqual({ paypal: "the PayPal plan for Coffee Club", published: null });
    expect(resolved?.descriptionLabel).toBe("the description published with the PayPal product");
  });

  it("never mixes a PayPal price with the file's exit term", async () => {
    // The file says `fee(0)` for this product; the plan says nothing. The
    // resolved terms must be the plan's alone, or one figure would come from a
    // source the provenance line does not name.
    vi.mocked(readProductFromPayPal).mockResolvedValue({
      ...card,
      terms,
      planLabel: "the PayPal plan for Coffee Club",
    });

    const resolved = await resolveProduct("coffee-subscription");

    expect(resolved?.terms.exit).toEqual({ kind: "unknown" });
  });

  it("falls back to the file's terms and labels this page's description", async () => {
    const resolved = await resolveProduct("coffee-subscription");

    expect(resolved?.terms.recurrence).toEqual({ count: 12, period: "month" });
    expect(resolved?.sources.published).toBe("the terms shown on this page");
    expect(resolved?.descriptionLabel).toBe("the description shown on this page");
  });
});

describe("listing the whole catalogue", () => {
  it("resolves each card on its own, so one PayPal answer does not relabel the rest", async () => {
    vi.mocked(readProductCardFromPayPal).mockImplementation(async (slug) =>
      slug === "coffee-subscription" ? card : null,
    );

    const catalogue = await resolveCatalogue();

    expect(catalogue).toHaveLength(3);
    expect(catalogue.find((entry) => entry.slug === "coffee-subscription")?.sources.paypal).toBe(
      "PayPal's catalogue",
    );
    expect(catalogue.filter((entry) => entry.sources.paypal === null)).toHaveLength(2);
  });
});
