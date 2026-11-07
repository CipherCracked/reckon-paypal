import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Shop from "@/app/shop/page";
import { resolveCatalogue } from "@/lib/catalog/resolve";

vi.mock("@/lib/catalog/resolve", () => ({ resolveCatalogue: vi.fn() }));

const card = (slug: string, name: string, fromPayPal: boolean) => ({
  slug,
  name,
  description: `${name} description.`,
  sources: fromPayPal
    ? { paypal: "PayPal's catalogue", published: null }
    : { paypal: null, published: "the terms shown on this page" },
});

beforeEach(() => {
  vi.mocked(resolveCatalogue).mockReset();
});

describe("where the shop's listing comes from (IPD 20)", () => {
  it("says so when every card was read from PayPal", async () => {
    vi.mocked(resolveCatalogue).mockResolvedValue([
      card("a", "Coffee", true),
      card("b", "Headphones", true),
    ]);

    render(await Shop());

    expect(
      screen.getByText("Every product above is read from PayPal's catalogue."),
    ).toBeInTheDocument();
  });

  it("says which are PayPal's when the listing is mixed", async () => {
    vi.mocked(resolveCatalogue).mockResolvedValue([card("a", "Coffee", true), card("b", "Mattress", false)]);

    render(await Shop());

    expect(
      screen.getByText(/some products above are read from paypal's catalogue/i),
    ).toBeInTheDocument();
  });

  it("makes no provenance claim when nothing came from PayPal", async () => {
    vi.mocked(resolveCatalogue).mockResolvedValue([card("a", "Coffee", false)]);

    render(await Shop());

    expect(screen.queryByText(/paypal's catalogue/i)).toBeNull();
  });
});
