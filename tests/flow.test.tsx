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

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

// The front door reads the seller's exit sentence with a model; no model runs in
// the suite, so the reading is fixed here. What the reading does is tested where
// it lives â€” this test is about the journey between screens.
vi.mock("@/lib/commitment/published-exit", async () => {
  const actual = await vi.importActual<typeof import("@/lib/commitment/published-exit")>(
    "@/lib/commitment/published-exit",
  );
  return {
    ...actual,
    resolveExitTerm: vi.fn(async () => ({
      kind: "stated" as const,
      exit: { kind: "none" as const },
      note: null,
      quoted: {
        label: "the description shown on this page",
        span: "cancel any time, no fee.",
      },
    })),
  };
});

const headphones = findProduct("noise-cancelling-headphones");
const subscription = findProduct("coffee-subscription");

beforeEach(() => {
  pushMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("demo flow", () => {
  it("takes a shopper from the storefront to a stated commitment", async () => {
    // 1. The front door offers the purchase as one of the ways in.
    const firstScreen = render(await Home());
    expect(
      screen.getByRole("link", { name: /Noise-Cancelling Headphones/ }),
    ).toHaveAttribute("href", "/product/noise-cancelling-headphones");
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
    // consent screen is rendered â€” otherwise both screens answer to the same
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
        slug="coffee-subscription"
        name="Coffee Subscription"
        description="Delivered every month."
        figures={presentFigures(subscription!.terms, computeCommitment(subscription!.terms))}
        breakdown={computeCommitment(subscription!.terms).breakdown}
        schedule={describeSchedule(subscription!.terms)}
        exitNote={null}
        sourceNote="Computed from the terms shown on this page."
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /check this commitment/i }));

    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith("/consent/pending?slug=coffee-subscription"),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
