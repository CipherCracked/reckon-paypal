import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "@/app/page";
import { ProductScreen } from "@/components/ProductScreen";
import { ConsentScreen } from "@/components/ConsentScreen";
import { findProduct } from "@/lib/catalog/products";
import { computeCommitment } from "@/lib/commitment/compute";

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

const headphones = findProduct("noise-cancelling-headphones");

beforeEach(() => {
  pushMock.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("demo flow", () => {
  it("takes a shopper from the storefront to a stated commitment", async () => {
    // 1. The storefront offers the product.
    render(<Home />);
    const productLinks = screen.getAllByRole("link", { name: /Noise-Cancelling Headphones/ });
    expect(productLinks.length).toBeGreaterThan(0);
    for (const link of productLinks) {
      expect(link).toHaveAttribute("href", "/product/noise-cancelling-headphones");
    }

    // 2. The product page creates the PayPal order and hands over to consent.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ orderId: "ORDER-1" }) })),
    );

    render(
      <ProductScreen
        slug="noise-cancelling-headphones"
        name={headphones!.name}
        description={headphones!.description}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /continue to payment/i }));

    await waitFor(() =>
      expect(pushMock).toHaveBeenCalledWith(
        "/consent/ORDER-1?slug=noise-cancelling-headphones",
      ),
    );

    // 3. The consent screen states all three figures for the order.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          translation: computeCommitment(headphones!.terms),
          labels: { item: "Headphones", shipping: "Shipping", tax: "Sales tax" },
          summary: "You pay once, today.",
          degraded: false,
        }),
      })),
    );

    render(<ConsentScreen orderId="ORDER-1" slug="noise-cancelling-headphones" />);

    expect(await screen.findByText("Charged today")).toBeInTheDocument();
    expect(screen.getAllByText("$58.95").length).toBeGreaterThan(0);
    expect(screen.getByText("Across the term")).toBeInTheDocument();
    expect(screen.getByText("Cost to leave")).toBeInTheDocument();
  });
});
