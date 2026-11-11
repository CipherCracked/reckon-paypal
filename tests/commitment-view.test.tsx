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

  it("prints a total the source only partly stated as a floor", () => {
    // A real listing: a price and nothing else.
    const { container } = renderView({
      shape: "one_time",
      itemPrice: money(17995),
      shipping: null,
      tax: null,
      exit: { kind: "unknown" },
    });

    expect(figure(container, "today")).toHaveTextContent("At least $179.95");
    expect(figure(container, "acrossTerm")).toHaveTextContent("At least $179.95");
    // The exit figure is not a sum of parts, so it never reads "At least".
    expect(figure(container, "exit")).not.toHaveTextContent("At least");
    expect(
      screen.getAllByText("$179.95, plus shipping and sales tax not stated").length,
    ).toBeGreaterThan(0);
  });

  it("gives an unstated part its own row, which a zero part does not get", () => {
    renderView({
      shape: "one_time",
      itemPrice: money(17995),
      shipping: null,
      tax: null,
      exit: { kind: "unknown" },
    });

    // "Not stated" is a different fact from "$0.00", and the row now says which
    // one it is instead of the row disappearing.
    expect(screen.getAllByText("Not stated").length).toBe(3);
    expect(screen.queryByText("$0.00")).not.toBeInTheDocument();
  });

  it("renders a breakdown from an older server that has no fee key at all", () => {
    // The reading cache lives on `globalThis` and outlives a recompile, so a
    // payload built by this morning's build can still arrive this afternoon.
    // It cost the reader page three of its four example documents; a page that
    // cannot reload its way out of an error must not crash on a missing key.
    const { breakdown } = computeCommitment(knownTerms);
    const { item, shipping, tax } = breakdown;

    render(
      <CommitmentView
        figures={presentFigures(knownTerms, computeCommitment(knownTerms))}
        breakdown={{ item, shipping, tax } as typeof breakdown}
        labels={labels}
        summary=""
        sourceNote="Computed from the terms in this test."
      />,
    );

    expect(screen.getByText("Charged today")).toBeInTheDocument();
    expect(screen.queryByText("Fee taken once")).toBeNull();
  });
});
