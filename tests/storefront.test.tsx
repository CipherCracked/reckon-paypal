import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Home from "@/app/page";

describe("storefront", () => {
  it("lists every catalog product", () => {
    render(<Home />);
    expect(screen.getByText("Noise-Cancelling Headphones")).toBeInTheDocument();
    expect(screen.getByText("Coffee Subscription")).toBeInTheDocument();
    expect(screen.getByText("Mattress — 12 Months")).toBeInTheDocument();
  });
});
