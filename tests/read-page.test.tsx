import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ReadPage from "@/app/read/page";
import { money } from "@/lib/money";

const document = `Service Agreement
Monthly plan: $35.00 per month for 12 months.`;

function stubFetch(body: unknown, ok = true) {
  const fetchMock = vi.fn().mockResolvedValue({ ok, json: async () => body });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function submit() {
  await userEvent.type(screen.getByLabelText(/the document/i), document);
  await userEvent.click(screen.getByRole("button", { name: /read this document/i }));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("reading a document", () => {
  it("shows the three figures and the sentence each came from", async () => {
    stubFetch({
      mode: "read",
      summary: "A monthly plan running for a year.",
      figures: [
        { id: "acrossTerm", label: "Across the term", amount: money(42000), arithmetic: "12 × $35.00" },
        { id: "exit", label: "Cost to leave", amount: null, arithmetic: null },
        { id: "today", label: "Charged today", amount: money(3500), arithmetic: "$35.00" },
      ],
      breakdown: { item: money(3500), shipping: money(0), tax: money(0) },
      notes: { exit: "The document does not say what it costs to cancel or leave early." },
      sources: { acrossTerm: "$35.00 per month", exit: null, today: "$35.00 per month" },
      schedule: "12 payments of $35.00, one a month.",
      dueDate: null,
      quotationCount: 2,
      rejected: 0,
    });

    render(<ReadPage />);
    await submit();

    expect(await screen.findByText("$420.00")).toBeInTheDocument();
    // The same sentence is the source of two figures, so it appears beside each.
    expect(screen.getAllByText("$35.00 per month")).toHaveLength(2);
    expect(screen.getByText(/not by the model/i)).toBeInTheDocument();
    expect(screen.getByText(/does not say what it costs to cancel/i)).toBeInTheDocument();
  });

  it("says a figure is absent when the document is silent, rather than showing a zero", async () => {
    stubFetch({
      mode: "read",
      summary: "",
      figures: [
        { id: "acrossTerm", label: "Across the term", amount: null, arithmetic: null },
        { id: "exit", label: "Cost to leave", amount: null, arithmetic: null },
        { id: "today", label: "Charged today", amount: money(999), arithmetic: null },
      ],
      breakdown: { item: money(999), shipping: money(0), tax: money(0) },
      notes: { acrossTerm: "The document does not say how many payments there are." },
      sources: { acrossTerm: null, exit: null, today: "$9.99 a month" },
      schedule: "$9.99 is charged at a time.",
      dueDate: null,
      quotationCount: 1,
      rejected: 0,
    });

    render(<ReadPage />);
    await submit();

    expect(await screen.findByText(/how many payments there are/i)).toBeInTheDocument();
    // Neither the total nor the cost to leave has a sentence behind it.
    expect(screen.getAllByText(/the document does not state this/i)).toHaveLength(2);
  });

  it("states what it could not do before listing the amounts it found", async () => {
    stubFetch({
      mode: "candidates",
      notice:
        "No model is configured here, so nothing was interpreted. These are the amounts written in your document, exactly as they appear.",
      candidates: { amounts: ["$35.00"], dates: ["21 November 2026"] },
    });

    render(<ReadPage />);
    await submit();

    expect(await screen.findByText(/nothing was interpreted/i)).toBeInTheDocument();
    expect(screen.getByText("$35.00")).toBeInTheDocument();
    // No computed figure appears in this mode at all.
    expect(screen.queryByText(/across the term/i)).not.toBeInTheDocument();
    expect(screen.getByText(/none of them is a total/i)).toBeInTheDocument();
  });

  it("shows the reason when the document is refused", async () => {
    stubFetch({ error: "Paste at least 40 characters." }, false);

    render(<ReadPage />);
    await submit();

    expect(await screen.findByRole("alert")).toHaveTextContent(/at least 40 characters/i);
  });
});
