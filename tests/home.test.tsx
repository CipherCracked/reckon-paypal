import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Home from "@/app/page";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

describe("the front door", () => {
  it("states the promise before asking anyone to choose", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { name: /every payment asks you to work something out/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/what it costs to leave/i)).toBeInTheDocument();
  });

  it("offers the three ways money is asked of a person, not three products", () => {
    render(<Home />);

    const doors = screen.getAllByRole("listitem");
    expect(doors).toHaveLength(3);
    expect(screen.getByText("A purchase")).toBeInTheDocument();
    expect(screen.getByText("A subscription")).toBeInTheDocument();
    expect(screen.getByText("A bill")).toBeInTheDocument();
  });

  it("puts a real figure on each door", () => {
    render(<Home />);

    expect(screen.getByText(/\$58\.95 today/)).toBeInTheDocument();
    expect(screen.getByText(/\$144\.00 across the term/)).toBeInTheDocument();
    expect(screen.getByText(/\$260\.00/)).toBeInTheDocument();
  });

  it("keeps the shop reachable without making it the product", () => {
    render(<Home />);

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

    render(<Home />);
    await userEvent.click(screen.getByRole("button", { name: /open this bill/i }));

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

    render(<Home />);
    await userEvent.click(screen.getByRole("button", { name: /open this bill/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(/INVALID_REQUEST/);
    expect(push).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});
