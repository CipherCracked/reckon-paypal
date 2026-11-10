import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/commitment/[orderId]/route";
import { readProductCardFromPayPal, readProductFromPayPal } from "@/lib/paypal/catalog";
import { readMarketProduct } from "@/lib/market/channel3";
import { EXIT_UNREADABLE_NOTE, resolveExitTerm } from "@/lib/commitment/published-exit";
import { money } from "@/lib/money";
import { recordedProduct } from "./fixtures/channel3-listings";

vi.mock("@/lib/paypal/catalog", () => ({
  readProductFromPayPal: vi.fn(),
  readProductCardFromPayPal: vi.fn(),
}));

vi.mock("@/lib/market/channel3", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/market/channel3")>()),
  readMarketProduct: vi.fn(),
}));

vi.mock("@/lib/commitment/published-exit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/commitment/published-exit")>()),
  resolveExitTerm: vi.fn(),
}));

async function get(slug: string) {
  const response = await GET(
    new Request(`http://localhost/api/commitment/ORDER-1?slug=${slug}`),
    { params: Promise.resolve({ orderId: "ORDER-1" }) },
  );
  return { status: response.status, body: await response.json() };
}

beforeEach(() => {
  vi.mocked(readProductFromPayPal).mockReset();
  vi.mocked(readProductFromPayPal).mockResolvedValue(null);
  vi.mocked(readProductCardFromPayPal).mockReset();
  vi.mocked(readProductCardFromPayPal).mockResolvedValue(null);
  vi.mocked(readMarketProduct).mockReset();
  vi.mocked(readMarketProduct).mockResolvedValue(recordedProduct("YyLUjLT"));
  vi.mocked(resolveExitTerm).mockReset();
  // By default the rule changes nothing: whatever the terms said is what the
  // screen gets, and the tests that care about the read override it.
  vi.mocked(resolveExitTerm).mockImplementation(async (exit) => ({
    kind: "stated",
    exit,
    note: null,
    quoted: null,
  }));
});

describe("where the commitment route reads its terms (ITD 17)", () => {
  it("reads a curated subscription at the price the live offer carries", async () => {
    const { status, body } = await get("ch3-YyLUjLT");

    expect(status).toBe(200);
    expect(body.shape).toBe("recurring");
    expect(body.sources).toEqual({
      paypal: null,
      published:
        "the price Channel3 lists at bark.co and the term the listing states (“6 month BarkBox plan”)",
    });
    // Six payments of $24.99, the offer's price today — not a number in a file.
    expect(body.translation.today).toEqual(money(2499));
    expect(body.translation.acrossTerm).toEqual(money(14994));
    expect(body.schedule).toMatch(/6 payments of \$24\.99, one a month/);
  });

  it("reads the plan from PayPal first, and names it", async () => {
    vi.mocked(readProductFromPayPal).mockResolvedValue({
      slug: "noise-cancelling-headphones",
      paypalProductId: "PROD-1",
      name: "Headphones Club",
      description: "Freshly tuned.",
      terms: {
        shape: "recurring",
        itemPrice: money(1500),
        shipping: money(0),
        tax: money(0),
        recurrence: { count: 6, period: "month" },
        exit: { kind: "unknown" },
      },
      planLabel: "the PayPal plan for Headphones Club",
    });

    const { body } = await get("noise-cancelling-headphones");

    expect(body.sources).toEqual({
      paypal: "the PayPal plan for Headphones Club",
      published: null,
    });
    // The plan's numbers, not the file's: 6 months at $15.00.
    expect(body.translation.acrossTerm).toEqual(money(9000));
    // PayPal cannot answer the exit figure, so it stays absent (IPD 19).
    expect(body.translation.exit).toBeNull();
  });

  it("falls back to the published terms when PayPal is unreachable", async () => {
    vi.mocked(readProductFromPayPal).mockRejectedValue(
      new Error("PayPal credentials are not configured."),
    );

    const { status, body } = await get("noise-cancelling-headphones");

    expect(status).toBe(200);
    expect(body.sources.published).toBe("the terms shown on this page");
    // $47.99 plus $6.95 shipping and $4.01 tax.
    expect(body.translation.today).toEqual(money(5895));
  });

  it("still refuses a slug it does not know, in either source", async () => {
    const { status } = await get("not-a-product");
    expect(status).toBe(404);
  });
});

describe("the exit figure the seller publishes (IPD 19)", () => {
  it("hands the merchant's own description to the exit rule, not PayPal's silence", async () => {
    // A curated subscription's exit is unknown on purpose, so the description is
    // what can answer — and it is labelled as the catalogue's description.
    await get("ch3-YyLUjLT");

    expect(resolveExitTerm).toHaveBeenCalledWith(
      { kind: "unknown" },
      expect.stringContaining("recurring subscription"),
      "the description Channel3 lists for this product",
    );
  });

  it("uses the stated exit and keeps the sentence it came from", async () => {
    vi.mocked(resolveExitTerm).mockResolvedValue({
      kind: "stated",
      exit: { kind: "none" },
      note: null,
      quoted: {
        label: "the description Channel3 lists for this product",
        span: "cancel any time, no fee",
      },
    });

    const { body } = await get("ch3-YyLUjLT");

    expect(body.translation.exit).toEqual(money(0));
    // The sentence rides on the figure it produced, not on a field beside it
    // (ITD 19) — so a screen cannot show the figure without it.
    const exitFigure = body.figures.find((figure: { id: string }) => figure.id === "exit");
    expect(exitFigure.source).toEqual({
      label: "the description Channel3 lists for this product",
      span: "cancel any time, no fee",
    });
    expect(body.exitNote).toBeNull();
  });

  it("passes the reason a figure is absent through to the screen", async () => {
    vi.mocked(resolveExitTerm).mockResolvedValue({
      kind: "silent",
      exit: { kind: "unknown" },
      note: "The seller's published terms do not say what it costs to leave.",
      quoted: null,
    });

    const { body } = await get("ch3-YyLUjLT");

    expect(body.translation.exit).toBeNull();
    expect(body.exitNote).toBe("The seller's published terms do not say what it costs to leave.");
    // The seller's silence, not a failed read — the two are worded differently
    // on the provenance line (IPD 19).
    expect(body.exitUnreadable).toBe(false);
  });

  it("tells the screen when the absence is a failed read rather than a silence", async () => {
    vi.mocked(resolveExitTerm).mockResolvedValue({
      kind: "unreadable",
      exit: { kind: "unknown" },
      note: EXIT_UNREADABLE_NOTE,
      quoted: null,
    });

    const { body } = await get("ch3-YyLUjLT");

    expect(body.exitUnreadable).toBe(true);
  });

  it("gives a failed exit read a reason, and does not call the wording degraded", async () => {
    vi.mocked(resolveExitTerm).mockRejectedValue(new Error("unexpected"));

    const { status, body } = await get("ch3-YyLUjLT");

    expect(status).toBe(200);
    expect(body.translation.exit).toBeNull();
    expect(body.exitNote).toBe(EXIT_UNREADABLE_NOTE);
    expect(body.exitUnreadable).toBe(true);
    // The figures are still computed from terms that were read; only the third
    // line is missing, and the summary is unaffected.
    expect(body.degraded).toBe(false);
  });
});

describe("the labels the screen prints beside each part", () => {
  it("names the parts from the resolved listing, so the table never changes between loads", async () => {
    // The names used to come from a model, which called the same item
    // "headphones" on one load and by its full title on the next. The table a
    // reader is told to rely on has to be the same table on every load, so the
    // names are the resolver's.
    const first = await get("ch3-YyLUjLT");
    const second = await get("ch3-YyLUjLT");

    expect(first.body.labels).toEqual({
      item: "BARK 6 Month Subscription",
      shipping: "Shipping",
      tax: "Sales tax",
    });
    expect(second.body.labels).toEqual(first.body.labels);
  });
});
