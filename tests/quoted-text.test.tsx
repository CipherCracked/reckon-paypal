import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { QuotedText } from "@/components/QuotedText";

// The mark is the product's claim made visible (IPD 30): this sentence in the
// seller's paragraph is the one a figure was read out of. So the tests are
// about two things only — that the text is never altered, and that a mark
// appears only where the span is found character for character.

describe("QuotedText", () => {
  it("marks the span and leaves every other word where it was", () => {
    const text = "This listing is for a 6 month BarkBox plan, delivered monthly.";
    const { container } = render(<QuotedText text={text} spans={["6 month BarkBox plan"]} />);

    expect(screen.getByText("6 month BarkBox plan").tagName).toBe("MARK");
    // The paragraph is printed whole, in the seller's order, punctuation
    // included: a mark is a mark, not an edit.
    expect(container.textContent).toBe(text);
  });

  it("marks two spans without letting them overlap", () => {
    const text = "Six months at $24.99. A $42.50 closure fee applies.";
    const { container } = render(
      <QuotedText text={text} spans={["$42.50 closure fee applies", "$24.99"]} />,
    );

    const marks = Array.from(container.querySelectorAll("mark")).map((mark) => mark.textContent);
    expect(marks).toEqual(["$24.99", "$42.50 closure fee applies"]);
    expect(container.textContent).toBe(text);
  });

  it("marks nothing when the span cannot be found, rather than approximating", () => {
    // A rewritten listing, a re-wrapped quote, or a span that is a paraphrase:
    // a mark on the wrong words would falsify the one promise the screen makes.
    const text = "This listing is for a six month plan.";
    const { container } = render(<QuotedText text={text} spans={["6 month BarkBox plan"]} />);

    expect(container.querySelectorAll("mark")).toHaveLength(0);
    expect(container.textContent).toBe(text);
  });

  it("ignores absent spans, so a caller can pass what it has", () => {
    const text = "A sentence.";
    const { container } = render(<QuotedText text={text} spans={[null, undefined, ""]} />);

    expect(container.querySelectorAll("mark")).toHaveLength(0);
    expect(container.textContent).toBe(text);
  });
});
