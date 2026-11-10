import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Shell } from "@/components/Shell";
import { ConsentScreen } from "@/components/ConsentScreen";
import { CommitmentView } from "@/components/CommitmentView";
import BillPage from "@/app/bill/[invoiceId]/page";
import { computeCommitment } from "@/lib/commitment/compute";
import { presentFigures } from "@/lib/commitment/present";
import { retrieveInvoice } from "@/lib/paypal/retrieve";
import { money } from "@/lib/money";
import type { CommitmentTerms } from "@/lib/commitment/types";

/**
 * The controls a reader owns (IPD 10), and where they live (IPD 24).
 *
 * The acceptance case is the bill: it is a real transaction, the biller's terms,
 * shown to someone who was handed it. If the text size and read-aloud work on
 * the consent screen and not there, the decision has not been implemented.
 */

vi.mock("@/lib/paypal/retrieve", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/paypal/retrieve")>();
  return { ...actual, retrieveInvoice: vi.fn() };
});

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

const STORAGE_KEY = "accessible-commerce-companion.preferences";

const root = () => document.documentElement;

beforeEach(() => {
  window.localStorage.clear();
  delete document.documentElement.dataset.textScale;
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, json: async () => payload })),
  );
  vi.mocked(retrieveInvoice).mockReset();
  vi.mocked(retrieveInvoice).mockResolvedValue({
    id: "INV2-1",
    status: "SENT",
    amount: money(26000),
    dueDate: "2026-11-21",
    payerUrl: null,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("the text size control", () => {
  it("is in the frame, so it is in the same place on every screen", async () => {
    render(
      <Shell>
        <p>page content</p>
      </Shell>,
    );

    expect(screen.getByRole("group", { name: /make this page easier to read/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Largest" })).toBeInTheDocument();
  });

  it("scales the document, not one container, so every rem follows", async () => {
    render(
      <Shell>
        <p>page content</p>
      </Shell>,
    );

    // Read after mount, so the first paint is the accessible default.
    await screen.findByRole("button", { name: "Largest" });
    expect(root().dataset.textScale).toBe("normal");

    await userEvent.click(screen.getByRole("button", { name: "Largest" }));

    // The stylesheet keys on `html[data-text-scale]`, because every size in it
    // is written in rem. The container rule this replaced could not reach them.
    expect(root().dataset.textScale).toBe("larger");
    expect(document.querySelector(".consent")).toBeNull();
  });

  it("remembers the size in this browser only", async () => {
    const { unmount } = render(
      <Shell>
        <p>page content</p>
      </Shell>,
    );
    await screen.findByRole("button", { name: "Largest" });
    await userEvent.click(screen.getByRole("button", { name: "Large" }));

    expect(window.localStorage.getItem(STORAGE_KEY)).toContain("large");
    unmount();

    // Coming back to the site is the same reader: the size is still theirs.
    delete root().dataset.textScale;
    render(
      <Shell>
        <p>page content on a second visit</p>
      </Shell>,
    );
    await screen.findByRole("button", { name: "Large" });
    expect(root().dataset.textScale).toBe("large");
    expect(screen.getByRole("button", { name: "Large" })).toHaveAttribute("aria-pressed", "true");
  });

  it("still works when the browser refuses to store a preference", async () => {
    const throwOnRead = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    const throwOnWrite = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    render(
      <Shell>
        <p>page content</p>
      </Shell>,
    );
    await screen.findByRole("button", { name: "Large" });
    await userEvent.click(screen.getByRole("button", { name: "Large" }));

    expect(root().dataset.textScale).toBe("large");
    expect(screen.getByText("page content")).toBeInTheDocument();

    throwOnRead.mockRestore();
    throwOnWrite.mockRestore();
  });
});

describe("the pacing control", () => {
  it("is offered with the figures it paces, not in the frame", async () => {
    render(
      <Shell>
        <p>page content</p>
      </Shell>,
    );
    await screen.findByRole("button", { name: "Largest" });

    // On a shop or a receipt it would be a switch that does nothing.
    expect(screen.queryByRole("checkbox", { name: /show one figure at a time/i })).toBeNull();
  });

  it("holds the figures back one at a time without removing them from the page", async () => {
    render(<ConsentScreen orderId="ORDER-1" slug="coffee-subscription" />);
    await screen.findByText("Across the term");

    await userEvent.click(screen.getByRole("checkbox", { name: /show one figure at a time/i }));

    const held = () =>
      Array.from(document.querySelectorAll(".commitment-figure")).filter(
        (figure) => figure.getAttribute("data-held") === "true",
      );

    expect(held()).toHaveLength(2);
    // Held back visually, still present for anyone reading by list: all three
    // figures stay in the document, plus every part of the charge the terms
    // actually have a non-zero amount for (zero parts get no row).
    expect(document.querySelectorAll(".commitment-figure")).toHaveLength(3);
    expect(screen.getAllByRole("term")).toHaveLength(5);

    await userEvent.click(screen.getByRole("button", { name: /show the next figure/i }));
    expect(held()).toHaveLength(1);
  });

  it("does not overwrite a text size chosen in the frame", async () => {
    // The two controls no longer share a screen, so each must merge with what is
    // stored rather than write a whole object from its own stale copy (IPD 24).
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ textScale: "larger", progressive: false }));

    render(<ConsentScreen orderId="ORDER-1" slug="coffee-subscription" />);
    await screen.findByText("Across the term");
    await userEvent.click(screen.getByRole("checkbox", { name: /show one figure at a time/i }));

    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}");
    expect(stored).toEqual({ textScale: "larger", progressive: true });
  });
});

describe("read-aloud", () => {
  it("says the figures with the arithmetic behind them", async () => {
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

  it("reads out what has been revealed, not what is held back", async () => {
    const speak = vi.fn();
    vi.stubGlobal("speechSynthesis", { speak, cancel: vi.fn() });
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
    await userEvent.click(screen.getByRole("checkbox", { name: /show one figure at a time/i }));
    await userEvent.click(await screen.findByRole("button", { name: /read this aloud/i }));

    const spoken = speak.mock.calls[0][0] as { text: string };
    expect(spoken.text).toContain("Across the term");
    // A reader who asked for one figure at a time does not want the rest spoken
    // past them.
    expect(spoken.text).not.toContain("Cost to leave");
  });

  it("says so where the browser cannot speak, rather than omitting the control", async () => {
    // A control that appears here and not there teaches the person to hunt.
    render(
      <CommitmentView
        figures={presentFigures(terms, translation)}
        breakdown={translation.breakdown}
        labels={{ item: "Coffee, one bag", shipping: "Shipping", tax: "Sales tax" }}
        summary="You pay monthly for one year."
        sourceNote="the terms shown on this page"
      />,
    );

    expect(await screen.findByText(/this browser cannot read the page aloud/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /read this aloud/i })).toBeNull();
  });
});

describe("the bill is the acceptance case", () => {
  it("offers the frame's text size and the content's read-aloud on a bill", async () => {
    render(
      <Shell>
        {await BillPage({
          params: Promise.resolve({ invoiceId: "INV2-1" }),
          searchParams: Promise.resolve({ slug: "clinic-visit" }),
        })}
      </Shell>,
    );

    expect(
      await screen.findByRole("group", { name: /make this page easier to read/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Largest" })).toBeInTheDocument();
    // jsdom cannot speak, so the honest sentence is what the bill shows.
    expect(screen.getByText(/this browser cannot read the page aloud/i)).toBeInTheDocument();
  });
});
