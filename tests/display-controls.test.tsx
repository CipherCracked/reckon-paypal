import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConsentScreen } from "@/components/ConsentScreen";
import { computeCommitment } from "@/lib/commitment/compute";
import { presentFigures } from "@/lib/commitment/present";
import { money } from "@/lib/money";
import type { CommitmentTerms } from "@/lib/commitment/types";

const terms: CommitmentTerms = {
  shape: "recurring",
  itemPrice: money(1100),
  shipping: money(0),
  tax: money(100),
  recurrence: { count: 12, period: "month" },
  exit: { kind: "fee", fee: money(0) },
};

const translation = computeCommitment(terms);

const payload = {
  translation,
  figures: presentFigures(terms, translation),
  labels: { item: "Coffee, one bag", shipping: "Shipping", tax: "Sales tax" },
  summary: "You pay monthly for one year.",
  sources: { paypal: null, published: "the terms shown on this page" },
  exitNote: null,
  exitUnreadable: false,
  quotedExit: null,
  degraded: false,
};

beforeEach(() => {
  window.localStorage.clear();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, json: async () => payload })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const consentSection = () => document.querySelector(".consent") as HTMLElement;

describe("reader-owned controls", () => {
  it("offers a text size, a pacing control, and read-aloud", async () => {
    render(<ConsentScreen orderId="ORDER-1" slug="coffee-subscription" />);
    await screen.findByText("Across the term");

    expect(screen.getByRole("group", { name: /make this page easier to read/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Largest" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /show one figure at a time/i })).toBeInTheDocument();
  });

  it("changes the text size and remembers it in this browser only", async () => {
    render(<ConsentScreen orderId="ORDER-1" slug="coffee-subscription" />);
    await screen.findByText("Across the term");

    await userEvent.click(screen.getByRole("button", { name: "Largest" }));

    expect(consentSection()).toHaveAttribute("data-text-scale", "larger");
    expect(window.localStorage.getItem("accessible-commerce-companion.preferences")).toContain(
      "larger",
    );
  });

  it("still works when the browser refuses to store a preference", async () => {
    const throwOnRead = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const throwOnWrite = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    render(<ConsentScreen orderId="ORDER-1" slug="coffee-subscription" />);
    await screen.findByText("Across the term");

    await userEvent.click(screen.getByRole("button", { name: "Large" }));

    expect(consentSection()).toHaveAttribute("data-text-scale", "large");
    expect(screen.getByText("Across the term")).toBeInTheDocument();

    throwOnRead.mockRestore();
    throwOnWrite.mockRestore();
  });

  it("can hold the figures back one at a time without removing them from the page", async () => {
    render(<ConsentScreen orderId="ORDER-1" slug="coffee-subscription" />);
    await screen.findByText("Across the term");

    await userEvent.click(screen.getByRole("checkbox", { name: /show one figure at a time/i }));

    const held = () =>
      Array.from(document.querySelectorAll(".commitment-figure")).filter(
        (figure) => figure.getAttribute("data-held") === "true",
      );

    expect(held()).toHaveLength(2);
    // Held back visually, still present for anyone reading by list.
    expect(screen.getAllByRole("term")).toHaveLength(6);

    await userEvent.click(screen.getByRole("button", { name: /show the next figure/i }));
    expect(held()).toHaveLength(1);
  });

  it("reads the commitment aloud with the browser, and stops when asked", async () => {
    const speak = vi.fn();
    const cancel = vi.fn();
    vi.stubGlobal("speechSynthesis", { speak, cancel });
    vi.stubGlobal(
      "SpeechSynthesisUtterance",
      class {
        text: string;
        onend: (() => void) | null = null;
        onerror: (() => void) | null = null;
        constructor(text: string) {
          this.text = text;
        }
      },
    );

    render(<ConsentScreen orderId="ORDER-1" slug="coffee-subscription" />);
    await screen.findByText("Across the term");

    await userEvent.click(await screen.findByRole("button", { name: /read this aloud/i }));

    expect(speak).toHaveBeenCalledTimes(1);
    const spoken = speak.mock.calls[0][0] as { text: string };
    expect(spoken.text).toContain("Across the term: $144.00");
    expect(spoken.text).toContain("12 × $12.00");

    await userEvent.click(screen.getByRole("button", { name: /stop reading/i }));
    expect(cancel).toHaveBeenCalled();
  });
});
