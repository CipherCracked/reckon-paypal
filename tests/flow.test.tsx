import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "@/app/page";
import { ProductScreen } from "@/components/ProductScreen";
import { ConsentScreen } from "@/components/ConsentScreen";
import { findProduct } from "@/lib/catalog/products";
import { computeCommitment } from "@/lib/commitment/compute";
import { presentFigures } from "@/lib/commitment/present";
import { describeSchedule } from "@/lib/commitment/schedule";
import { readMarketProduct } from "@/lib/market/channel3";
import { curatedTerm, subscriptionTerms } from "@/lib/market/subscriptions";
import { recordedProduct } from "./fixtures/channel3-listings";

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

// The front door asks who is calling; the journey below is the signed-out one.
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
}));

// The front door reads a real listing, and the exit sentence with a model. No
// model runs in the suite, so both are fixed here. What each does is tested
// where it lives — this test is about the journey between screens.
vi.mock("@/lib/market/channel3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/market/channel3")>();
  return { ...actual, readMarketProduct: vi.fn() };
});

vi.mock("@/lib/commitment/published-exit", async () => {
  const actual = await vi.importActual<typeof import("@/lib/commitment/published-exit")>(
    "@/lib/commitment/published-exit",
  );
  return {
    ...actual,
    resolveExitTerm: vi.fn(async () => ({
      kind: "silent" as const,
      exit: { kind: "unknown" as const },
      note: "The seller's published terms do not say what it costs to leave.",
      quoted: null,
    })),
  };
});

const headphones = findProduct("noise-cancelling-headphones");
const subscription = recordedProduct("YyLUjLT");
const subscriptionTermsForScreen = subscriptionTerms(
  subscription.offers[0],
  curatedTerm("YyLUjLT")!,
);

beforeEach(() => {
  pushMock.mockReset();
  vi.mocked(readMarketProduct).mockReset();
  vi.mocked(readMarketProduct).mockResolvedValue(subscription);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("demo flow", () => {
  it("takes a shopper from the storefront to a stated commitment", async () => {
    // 1. The front door works one commitment through in full and offers the
    // next step on it. (The headphones that used to be a second door here were
    // an invented listing for a product the shop does not sell, IPD 28.)
    const firstScreen = render(await Home());
    expect(
      screen.getByRole("link", { name: /check this commitment/i }),
    ).toHaveAttribute("href", "/product/ch3-YyLUjLT");
    // The next step is a different screen rather than what a click would replace,
    // so the first one is taken down before it is rendered.
    firstScreen.unmount();

    // 2. The product page hands over to consent without creating anything.
    vi.stubGlobal("fetch", vi.fn());

    const productScreen = render(
      <ProductScreen
        slug="noise-cancelling-headphones"
        name={headphones!.name}
        description={headphones!.description}
        figures={presentFigures(headphones!.terms, computeCommitment(headphones!.terms))}
        breakdown={computeCommitment(headphones!.terms).breakdown}
        schedule={describeSchedule(headphones!.terms)}
        exitNote={null}
        sourceNote="Computed from the terms shown on this page."
      />,
    );

    // The product page states the figures too, so it is taken down before the
    // consent screen is rendered — otherwise both screens answer to the same
    // label and the test cannot tell which one it is looking at.
    expect(screen.getByText("Across the term")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /check this commitment/i }));

    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith("/consent/pending?slug=noise-cancelling-headphones"),
    );
    productScreen.unmount();

    // 3. The consent screen states all three figures for the order.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          translation: computeCommitment(headphones!.terms),
          figures: presentFigures(headphones!.terms, computeCommitment(headphones!.terms)),
          labels: { item: "Headphones", shipping: "Shipping", tax: "Sales tax" },
          summary: "You pay once, today.",
          sources: { paypal: null, published: "the terms shown on this page" },
          exitNote: null,
          exitUnreadable: false,
          quotedExit: null,
          degraded: false,
        }),
      })),
    );

    render(<ConsentScreen orderId="pending" slug="noise-cancelling-headphones" />);

    expect(await screen.findByText("Charged today")).toBeInTheDocument();
    expect(screen.getAllByText("$58.95").length).toBeGreaterThan(0);
    expect(screen.getByText("Across the term")).toBeInTheDocument();
    expect(screen.getByText("Cost to leave")).toBeInTheDocument();
  });

  it("sends a repeating product to the consent screen without creating an order", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(
      <ProductScreen
        slug="ch3-YyLUjLT"
        name={subscription.title}
        description={subscription.description}
        figures={presentFigures(
          subscriptionTermsForScreen,
          computeCommitment(subscriptionTermsForScreen),
        )}
        breakdown={computeCommitment(subscriptionTermsForScreen).breakdown}
        schedule={describeSchedule(subscriptionTermsForScreen)}
        exitNote={null}
        sourceNote="Computed from the price Channel3 lists at bark.co."
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /check this commitment/i }));

    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith("/consent/pending?slug=ch3-YyLUjLT"),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
