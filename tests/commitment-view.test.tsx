import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CommitmentView } from "@/components/CommitmentView";
import { computeCommitment } from "@/lib/commitment/compute";
import { presentFigures } from "@/lib/commitment/present";
import { money } from "@/lib/money";
import type { CommitmentTerms } from "@/lib/commitment/types";

const labels = { item: "Coffee, one bag", shipping: "Shipping", tax: "Sales tax" };

const knownTerms: CommitmentTerms = {
  shape: "recurring",
  itemPrice: money(1100),
  shipping: money(0),
  tax: money(100),
  recurrence: { count: 12, period: "month" },
  exit: { kind: "fee", fee: money(0) },
};

function renderView(terms: CommitmentTerms, summary = "") {
  return render(
    <CommitmentView
      figures={presentFigures(terms, computeCommitment(terms))}
      breakdown={computeCommitment(terms).breakdown}
      labels={labels}
      summary={summary}
      sourceNote="Computed from the terms in this test."
    />,
  );
}

describe("CommitmentView", () => {
  const figure = (container: HTMLElement, id: string) =>
    container.querySelector(`[data-figure="${id}"]`) as HTMLElement;

  it("states the term, the exit and today's charge as three labelled figures", () => {
    const { container } = renderView(knownTerms, "You pay monthly for 12 months.");

    expect(screen.getByText("Charged today")).toBeInTheDocument();
    expect(figure(container, "today")).toHaveTextContent("$12.00");

    expect(screen.getByText("Across the term")).toBeInTheDocument();
    expect(figure(container, "acrossTerm")).toHaveTextContent("$144.00");

    expect(screen.getByText("Cost to leave")).toBeInTheDocument();
    expect(figure(container, "exit")).toHaveTextContent("$0.00");

    expect(screen.getByText("You pay monthly for 12 months.")).toBeInTheDocument();
  });

  it("reads the figures in the order it is given, largest commitment first", () => {
    const { container } = renderView(knownTerms);

    const labelsInOrder = Array.from(container.querySelectorAll(".commitment-figure dt")).map(
      (term) => term.textContent,
    );

    expect(labelsInOrder).toEqual(["Across the term", "Cost to leave", "Charged today"]);
  });

  it("shows the arithmetic behind each figure", () => {
    renderView(knownTerms);

    expect(screen.getByText("12 × $12.00")).toBeInTheDocument();
    expect(screen.getByText("$11.00 + $1.00")).toBeInTheDocument();
  });

  it("itemises the parts of the charge, and leaves out a part worth nothing", () => {
    renderView(knownTerms);

    expect(screen.getByText("Coffee, one bag")).toBeInTheDocument();
    expect(screen.getByText("$11.00")).toBeInTheDocument();
    expect(screen.getByText("Sales tax")).toBeInTheDocument();
    expect(screen.getByText("$1.00")).toBeInTheDocument();
    // The terms cannot say whether a zero part was priced at nothing or never
    // mentioned, so the row is left out rather than printed as "$0.00" — which
    // would claim the seller said the first.
    expect(screen.queryByText("Shipping")).not.toBeInTheDocument();
  });

  it("renders an unknown exit cost as Not stated, never as zero", () => {
    const { container } = renderView({ ...knownTerms, exit: { kind: "unknown" } });

    expect(screen.getByText(/not stated/i)).toBeInTheDocument();
    expect(figure(container, "exit")).not.toHaveTextContent("$0.00");
  });
});
