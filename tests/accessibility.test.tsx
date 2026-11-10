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

const name = (element: Element | null) => (element?.textContent ?? "").trim();

beforeEach(() => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, json: async () => payload })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("consent screen accessibility", () => {
  it("reaches every control by keyboard alone, in reading order", async () => {
    render(<ConsentScreen orderId="ORDER-1" slug="ch3-YyLUjLT" />);
    await screen.findByText("Charged today");

    const controls = Array.from(
      document.querySelectorAll<HTMLElement>("button, a[href], input, select, textarea"),
    );
    expect(controls.length).toBeGreaterThan(0);

    const reachedByKeyboard: string[] = [];
    for (let i = 0; i < controls.length; i += 1) {
      await userEvent.tab();
      expect(document.activeElement).not.toBe(document.body);
      reachedByKeyboard.push(name(document.activeElement));
    }

    expect(reachedByKeyboard).toEqual(controls.map((element) => name(element)));
  });

  it("gives every button a unique accessible name", async () => {
    render(<ConsentScreen orderId="ORDER-1" slug="ch3-YyLUjLT" />);
    await screen.findByText("Charged today");

    const names = Array.from(document.querySelectorAll("button")).map((button) =>
      (button.getAttribute("aria-label") ?? button.textContent ?? "").trim(),
    );

    expect(names.length).toBeGreaterThan(0);
    expect(new Set(names).size).toBe(names.length);
  });

  it("never makes a clickable element that the keyboard cannot reach", async () => {
    render(<ConsentScreen orderId="ORDER-1" slug="ch3-YyLUjLT" />);
    await screen.findByText("Charged today");

    const clickHandlers = Array.from(document.querySelectorAll<HTMLElement>("*")).filter((element) =>
      element.getAttributeNames().some((attribute) => attribute.startsWith("onclick")),
    );

    expect(clickHandlers).toEqual([]);
  });
});
