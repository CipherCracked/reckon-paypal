import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CommitmentView } from "@/components/CommitmentView";
import { money } from "@/lib/money";
import type { CommitmentTranslation } from "@/lib/commitment/types";

const labels = { item: "Coffee, one bag", shipping: "Shipping", tax: "Sales tax" };

const known: CommitmentTranslation = {
  today: money(1200),
  acrossTerm: money(14400),
  exit: money(0),
  breakdown: { item: money(1000), shipping: money(100), tax: money(100) },
};

describe("CommitmentView", () => {
  it("states today, the term, and exit as three labelled figures", () => {
    render(<CommitmentView translation={known} labels={labels} summary="You pay monthly for 12 months." />);

    expect(screen.getByText("Charged today")).toBeInTheDocument();
    expect(screen.getByText("$12.00")).toBeInTheDocument();

    expect(screen.getByText("Across the term")).toBeInTheDocument();
    expect(screen.getByText("$144.00")).toBeInTheDocument();

    expect(screen.getByText("Cost to leave")).toBeInTheDocument();
    expect(screen.getByText("$0.00")).toBeInTheDocument();

    expect(screen.getByText("You pay monthly for 12 months.")).toBeInTheDocument();
  });

  it("itemises where the figures come from", () => {
    render(<CommitmentView translation={known} labels={labels} summary="" />);

    expect(screen.getByText("Coffee, one bag")).toBeInTheDocument();
    expect(screen.getByText("Shipping")).toBeInTheDocument();
    expect(screen.getByText("Sales tax")).toBeInTheDocument();
    expect(screen.getByText("$10.00")).toBeInTheDocument();
  });

  it("renders an unknown exit cost as Not stated, never as zero", () => {
    render(<CommitmentView translation={{ ...known, exit: null }} labels={labels} summary="" />);

    expect(screen.getByText(/not stated/i)).toBeInTheDocument();
    expect(screen.queryByText("$0.00")).toBeNull();
  });
});
