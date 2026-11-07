import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "@/app/page";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

describe("the front door", () => {
  it("states the promise before asking anyone to choose", async () => {
    render(await Home());

    expect(
      screen.getByRole("heading", { name: /every payment asks you to work something out/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/what it costs to leave/i)).toBeInTheDocument();
  });

  it("works one commitment in full before anything is clicked", async () => {
    render(await Home());

    expect(screen.getByText("Across the term")).toBeInTheDocument();
    expect(screen.getByText("$144.00")).toBeInTheDocument();
    expect(screen.getByText("Cost to leave")).toBeInTheDocument();
    expect(screen.getByText("Charged today")).toBeInTheDocument();
    expect(screen.getAllByText("$12.00").length).toBeGreaterThan(0);
  });

  it("says where the worked example's figures came from, and that nothing was created", async () => {
    render(await Home());

    expect(
      screen.getByText(/computed from the terms shown on this page\./i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/nothing has been charged and nothing has been created at paypal/i),
    ).toBeInTheDocument();
  });

  it("performs no request and creates nothing when it renders", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(await Home());

    expect(fetchMock).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("offers one primary action into the journey", async () => {
    render(await Home());

    const primary = screen.getByRole("link", { name: /continue with this commitment/i });
    expect(primary).toHaveAttribute("href", "/product/coffee-subscription");
  });

  it("keeps the other ways in at a second rank, not as four equal cards", async () => {
    render(await Home());

    const doors = screen.getAllByRole("listitem");
    expect(doors).toHaveLength(3);
    expect(screen.getByText("A purchase you pay once")).toBeInTheDocument();
    expect(screen.getByText("A bill you were sent")).toBeInTheDocument();
    expect(screen.getByText("A document someone sent you")).toBeInTheDocument();
  });

  it("keeps the shop reachable without making it the product", async () => {
    render(await Home());

    expect(screen.getByRole("link", { name: /browse the shop/i })).toBeInTheDocument();
  });
});

describe("the bill door", () => {
  it("asks PayPal for a bill and opens the screen it produces", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ invoiceId: "INV2-1" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(await Home());
    await userEvent.click(screen.getByRole("button", { name: /clinic visit/i }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/paypal/invoices",
      expect.objectContaining({ method: "POST" }),
    );
    expect(push).toHaveBeenCalledWith("/bill/INV2-1?slug=clinic-visit");
    vi.unstubAllGlobals();
  });

  it("says so when PayPal will not issue the bill, instead of opening a broken page", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "PayPal could not create this bill (INVALID_REQUEST)." }),
      }),
    );

    render(await Home());
    await userEvent.click(screen.getByRole("button", { name: /clinic visit/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(/INVALID_REQUEST/);
    expect(push).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
