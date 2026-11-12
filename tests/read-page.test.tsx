import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ReadPage from "@/app/read/page";
import { exampleDocuments } from "@/lib/catalog/examples";
import { money } from "@/lib/money";

const document = `Service Agreement
Monthly plan: $35.00 per month for 12 months.`;

// The bill line is the one thing on this page that creates something, and it
// navigates once PayPal answers. The router is the frame's, so the test supplies
// one rather than mounting the whole app.
const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

function stubFetch(body: unknown, ok = true) {
  const fetchMock = vi.fn().mockResolvedValue({ ok, json: async () => body });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

async function submit() {
  await userEvent.type(screen.getByLabelText(/the document/i), document);
  await userEvent.click(screen.getByRole("button", { name: /read this document/i }));
}

beforeEach(() => {
  push.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("reading a document", () => {
  it("shows the three figures and the sentence each came from", async () => {
    stubFetch({
      mode: "read",
      summary: "A monthly plan running for a year.",
      figures: [
        { id: "acrossTerm", label: "Across the term", amount: money(42000), arithmetic: "12 × $35.00", source: { label: "your document", span: "$35.00 per month" } },
        { id: "exit", label: "Cost to leave", amount: null, arithmetic: null, source: null },
        { id: "today", label: "Charged today", amount: money(3500), arithmetic: "$35.00", source: { label: "your document", span: "$35.00 per month" } },
      ],
      breakdown: { item: money(3500), shipping: money(0), tax: money(0), fee: null },
      notes: { exit: "The document does not say what it costs to cancel or leave early." },
      schedule: "12 payments of $35.00, one a month.",
      dueDate: null,
      quotationCount: 2,
      rejected: 0,
    });

    render(<ReadPage />);
    await submit();

    expect(await screen.findByText("$420.00")).toBeInTheDocument();
    // The same sentence is the source of two figures, so it appears beside each
    // — on the figure itself, not in a list of sources further down (ITD 19).
    expect(screen.getAllByText("$35.00 per month")).toHaveLength(2);
    // The checking is one closed line under the figures, not a paragraph above
    // them (IPD 32). The claim it used to make is inside, one click away.
    const line = screen.getByText(/checked against it word for word/i);
    const disclosure = line.closest("details");
    expect(disclosure).not.toHaveAttribute("open");

    await userEvent.click(line);

    expect(disclosure).toHaveAttribute("open");
    expect(screen.getByText(/not by the model/i)).toBeInTheDocument();
    expect(screen.getByText(/does not say what it costs to cancel/i)).toBeInTheDocument();
  });

  it("shows the sentence the model offered and the check refused (IPD 32, ITD 29)", async () => {
    stubFetch({
      mode: "read",
      summary: "",
      figures: [
        { id: "acrossTerm", label: "Across the term", amount: money(42000), arithmetic: "12 × $35.00", source: { label: "your document", span: "$35.00 per month" } },
        { id: "exit", label: "Cost to leave", amount: null, arithmetic: null, source: null },
        { id: "today", label: "Charged today", amount: money(3500), arithmetic: "$35.00", source: { label: "your document", span: "$35.00 per month" } },
      ],
      breakdown: { item: money(3500), shipping: money(0), tax: money(0), fee: null },
      notes: { exit: "The document does not say what it costs to cancel or leave early." },
      schedule: "12 payments of $35.00, one a month.",
      dueDate: null,
      quotationCount: 2,
      rejected: 1,
      refused: [{ field: "exitFee", text: "Cancellation costs $25.00" }],
    });

    render(<ReadPage />);
    await submit();
    await userEvent.click(await screen.findByText(/checked against it word for word/i));

    // The refused sentence is on the screen — that is the product catching its
    // own model, and it is the whole point of carrying it.
    const refused = screen.getByText("Cancellation costs $25.00");
    expect(refused).toBeInTheDocument();
    // But it is never dressed as a quotation of the reader's document: no
    // `<q>`, no mark, and none of the classes that make a verified span look
    // like one (ITD 29).
    expect(refused.closest("q")).toBeNull();
    expect(refused.querySelector("mark")).toBeNull();
    expect(refused).not.toHaveClass("commitment-quote");
    // And nothing was computed from it: the figures are the two the document
    // states, and the exit figure is still absent.
    expect(screen.getByText("$420.00")).toBeInTheDocument();
    expect(screen.queryByText("$25.00")).not.toBeInTheDocument();
  });

  it("says a figure is absent when the document is silent, rather than showing a zero", async () => {
    stubFetch({
      mode: "read",
      summary: "",
      figures: [
        { id: "acrossTerm", label: "Across the term", amount: null, arithmetic: null, source: null },
        { id: "exit", label: "Cost to leave", amount: null, arithmetic: null, source: null },
        { id: "today", label: "Charged today", amount: money(999), arithmetic: null, source: { label: "your document", span: "$9.99 a month" } },
      ],
      breakdown: { item: money(999), shipping: money(0), tax: money(0), fee: null },
      notes: { acrossTerm: "The document does not say how many payments there are." },
      schedule: "$9.99 is charged at a time.",
      dueDate: null,
      quotationCount: 1,
      rejected: 0,
    });

    render(<ReadPage />);
    await submit();

    expect(await screen.findByText(/how many payments there are/i)).toBeInTheDocument();
    // Only the figure the document supported carries a sentence; the other two
    // say why they are absent and quote nothing (ITD 19).
    expect(globalThis.document.querySelectorAll(".commitment-quote")).toHaveLength(1);
    expect(screen.getByText("$9.99 a month")).toBeInTheDocument();
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
    expect(screen.getByText(/none of these is a total/i)).toBeInTheDocument();
  });

  it("reads a named example on one click, with no typing", async () => {
    const fetchMock = stubFetch({
      mode: "candidates",
      notice:
        "The document does not state enough to work out a commitment, so no total was computed.",
      candidates: { amounts: ["$15.00", "$25.00", "$50.00"], dates: ["10 November 2026"] },
    });
    const example = exampleDocuments[0];

    render(<ReadPage />);
    await userEvent.click(screen.getByRole("button", { name: example.label }));

    expect(await screen.findByText("$25.00")).toBeInTheDocument();
    // The box was filled with the example, so the visitor can see what was read
    // and edit it — the reading is not of text that appeared from nowhere.
    expect(screen.getByLabelText(/the document/i)).toHaveValue(example.text);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).text).toBe(example.text);
  });

  it("says the examples are examples before the click", async () => {
    render(<ReadPage />);

    expect(screen.getByText(/not yours, and not a real seller/i)).toBeInTheDocument();
    // The one written to be refused says so in its own words, not only after
    // the reading comes back.
    const refused = exampleDocuments.find((example) => example.refused);
    expect(refused).toBeDefined();
    expect(screen.getByRole("button", { name: refused?.label })).toBeInTheDocument();
    expect(screen.getByText(refused?.note ?? "")).toBeInTheDocument();
  });

  it("shows the reason when the document is refused", async () => {
    stubFetch({ error: "Paste at least 40 characters." }, false);

    render(<ReadPage />);
    await submit();

    expect(await screen.findByRole("alert")).toHaveTextContent(/at least 40 characters/i);
  });
});

describe("the note under the box", () => {
  it("says how long a paste is kept, because it is kept", () => {
    // The reading cache holds the normalised text as a map key for ten minutes,
    // in process memory. "Nothing you paste is stored" was absolute and untrue,
    // and this is the one place where the honesty claim outran the behaviour.
    render(<ReadPage />);

    const hint = screen.getByText(/sent once to the model/i);
    expect(hint).toHaveTextContent(/ten minutes/i);
    expect(hint).not.toHaveTextContent(/nothing you paste is stored/i);
  });
});

describe("the bill line", () => {
  it("asks PayPal for a bill and opens the screen it produces", async () => {
    const fetchMock = stubFetch({ invoiceId: "INV2-1" });

    render(<ReadPage />);
    await userEvent.click(screen.getByRole("button", { name: /clinic visit/i }));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/paypal/invoices",
      expect.objectContaining({ method: "POST" }),
    );
    expect(push).toHaveBeenCalledWith("/bill/INV2-1?slug=clinic-visit");
  });

  it("says so when PayPal will not issue the bill, instead of opening a broken page", async () => {
    stubFetch({ error: "PayPal could not create this bill (INVALID_REQUEST)." }, false);

    render(<ReadPage />);
    await userEvent.click(screen.getByRole("button", { name: /clinic visit/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/INVALID_REQUEST/);
    expect(push).not.toHaveBeenCalled();
  });
});
