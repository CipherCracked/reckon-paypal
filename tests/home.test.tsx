import { beforeEach, describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Home from "@/app/page";
import { signSession } from "@/lib/session";
import { readMarketProduct } from "@/lib/market/channel3";
import { findSubscriptionsFor } from "@/lib/paypal/records";
import { recordedProduct } from "./fixtures/channel3-listings";

// The front door asks who is calling before it decides which home to render
// (IPD 28). The test supplies the cookie store rather than mounting the app.
const cookie = vi.hoisted(() => ({ value: undefined as string | undefined }));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "acc_signed_in" && cookie.value ? { value: cookie.value } : undefined,
  }),
}));

// Signing in is a feature of a configured deployment; these tests are about the
// door, not about whether PayPal credentials happen to be present in the suite.
vi.mock("@/lib/paypal/identity", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/paypal/identity")>()),
  identityConfigured: () => true,
}));

// Signed in, the home is the person's own record, which is a scan of PayPal.
// The scan itself is tested where it lives; here the answer is fixed.
vi.mock("@/lib/paypal/records", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/paypal/records")>()),
  findSubscriptionsFor: vi.fn(),
}));

// The entry reads a real listing. This suite is about the screen's own
// behaviour, so the live read is fixed to the record captured from the
// catalogue; what `readMarketProduct` does with the wire is tested where it
// lives.
vi.mock("@/lib/market/channel3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/market/channel3")>();
  return { ...actual, readMarketProduct: vi.fn() };
});

// The BARK description states the term but says nothing about leaving. The
// reading is fixed so this suite tests how the entry renders that silence; the
// reader itself is tested where it lives.
vi.mock("@/lib/commitment/published-exit", async () => {
  const actual = await vi.importActual<typeof import("@/lib/commitment/published-exit")>(
    "@/lib/commitment/published-exit",
  );
  return {
    ...actual,
    resolveExitTerm: vi.fn(async () => ({
      kind: "silent" as const,
      exit: { kind: "unknown" as const },
      note: "The seller's published terms do not say what it costs to leave.",
      quoted: null,
    })),
  };
});

beforeEach(() => {
  cookie.value = undefined;
  vi.stubEnv("SESSION_SECRET", "a-test-secret-long-enough-to-sign");
  vi.mocked(readMarketProduct).mockReset();
  vi.mocked(readMarketProduct).mockResolvedValue(recordedProduct("YyLUjLT"));
  vi.mocked(findSubscriptionsFor).mockReset();
  vi.mocked(findSubscriptionsFor).mockResolvedValue({
    kind: "found",
    records: [],
    scanned: 0,
    stopped: false,
  });
});

describe("the front door", () => {
  it("states the promise, and who it is for, before asking anyone to choose", async () => {
    render(await Home());

    expect(
      screen.getByRole("heading", { name: /what it costs, before you agree to it/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/what it costs to leave/i).length).toBeGreaterThan(0);
    // IPD 21: the audience is named in words, not left to be inferred from the
    // scope of the vocabulary.
    expect(screen.getByText(/dyscalculia, ADHD, dyslexia/i)).toBeInTheDocument();
  });

  it("puts the seller's words beside the figures they produced", async () => {
    render(await Home());

    expect(
      screen.getByRole("heading", { name: /what the seller wrote/i }),
    ).toBeInTheDocument();
    // The listing's own copy, printed rather than summarised.
    expect(screen.getAllByText(/6 month BarkBox plan/i).length).toBeGreaterThan(0);
    // The merchant said nothing about leaving, so the figure says so rather
    // than filling in a zero.
    const exit = document.querySelector("[data-figure='exit']");
    expect(exit).not.toBeNull();
    expect(exit).toHaveTextContent(/not stated/i);
  });

  it("works one commitment in full before anything is clicked", async () => {
    render(await Home());

    expect(screen.getByText("Across the term")).toBeInTheDocument();
    expect(screen.getByText("$149.94")).toBeInTheDocument();
    expect(screen.getByText("Cost to leave")).toBeInTheDocument();
    expect(screen.getByText("Charged today")).toBeInTheDocument();
    expect(screen.getAllByText("$24.99").length).toBeGreaterThan(0);
  });

  it("says where the worked example's figures came from, and that nothing was created", async () => {
    render(await Home());

    expect(
      screen.getByText(/computed from the price Channel3 lists at bark\.co/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/nothing has been charged/i),
    ).toBeInTheDocument();
  });

  it("marks the seller's sentence in their paragraph, and carries it under the figure", async () => {
    render(await Home());

    // IPD 30: the term exists because a sentence says it, so the sentence is
    // marked where the seller wrote it and quoted under the figure it produced.
    // One mark, one quote — the pairing is seen rather than explained.
    const marks = Array.from(document.querySelectorAll("mark"));
    expect(marks).toHaveLength(1);
    expect(marks[0]).toHaveTextContent("6 month BarkBox plan");

    const term = document.querySelector("[data-figure='acrossTerm']");
    expect(term).toHaveAttribute("data-quoted", "true");
    expect(term).toHaveTextContent(/6 month BarkBox plan/i);
  });

  it("carries the one qualification, once, at the foot of the page", async () => {
    render(await Home());

    // IPD 29: the sandbox and the absence of storage are said in one place, in
    // one sentence, rather than in each screen's own words. IPD 35 moved
    // "nothing ships" here too, out of the product page's own apology.
    expect(
      screen.getAllByText(
        /sandbox store: no real money moves, nothing ships, and nothing you do is stored/i,
      ),
    ).toHaveLength(1);
  });

  it("performs no further request and creates nothing when it renders", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(await Home());

    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("offers one primary action into the journey", async () => {
    render(await Home());

    const primary = screen.getByRole("link", { name: /check this commitment/i });
    expect(primary).toHaveAttribute("href", "/product/ch3-YyLUjLT");
  });

  it("puts the two things a person came to do after the proof, not four equal doors", async () => {
    render(await Home());

    // IPD 28: their own record first, then something new. The invented
    // one-time-purchase door and the invented headphones listing are gone —
    // both were tiles about products the product does not have.
    expect(
      screen.getByRole("heading", { name: /see what you have already agreed to/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /check something new/i })).toBeInTheDocument();
    expect(screen.queryByText("A purchase you pay once")).toBeNull();
    expect(screen.queryByText("A bill you were sent")).toBeNull();
  });

  it("offers one sign-in on the front door, and it starts the sign-in", async () => {
    render(await Home());

    const signIn = screen.getAllByRole("link", { name: /sign in with paypal/i });
    expect(signIn).toHaveLength(1);
    // The control is the action. A link to a page that only repeats the button
    // is a click that does nothing (IPD 28).
    expect(signIn[0]).toHaveAttribute("href", "/auth/paypal/start");
  });

  it("lets a search go straight to the shop", async () => {
    render(await Home());

    expect(screen.getByRole("search")).toHaveAttribute("action", "/shop");
  });

  it("offers the shelf of things that repeat, beside the search for a name", async () => {
    // IPD 42: the worry the front door names has a screen that answers it.
    render(await Home());

    expect(screen.getByRole("link", { name: /charges more than once/i })).toHaveAttribute(
      "href",
      "/shop/subscriptions",
    );
  });
});

// The front door is the one screen reached without choosing anything, and it
// used to be the one screen whose whole body hung on an unguarded third-party
// read: no catalogue key, or a catalogue that answered nothing, and `/` threw —
// so the notice written for exactly that case could never be seen. A blind judge
// reading the code named it as the first thing worth fixing, because a 500 in
// front of a judge is indistinguishable from a product that does not work.
describe("the front door when the catalogue cannot answer", () => {
  it("says the listing could not be read, and leaves the rest of the page standing", async () => {
    vi.mocked(readMarketProduct).mockRejectedValue(new Error("No product catalogue key is configured."));

    render(await Home());

    expect(
      screen.getByText(/could not be read just now, so there is no commitment to show/i),
    ).toBeInTheDocument();
    // The two doors are the reason this is a notice and not an error screen: a
    // visitor who cannot see the worked example can still search, and can still
    // sign in.
    expect(screen.getByRole("heading", { name: /check something new/i })).toBeInTheDocument();
    expect(screen.getByRole("search")).toHaveAttribute("action", "/shop");
    // Nothing was worked through, so nothing may be claimed about figures.
    expect(screen.queryByText("Across the term")).toBeNull();
  });

  it("says a listing has left the catalogue differently, because it will not come back", async () => {
    // The catalogue answers 404 for a product it no longer carries, which
    // `readMarketProduct` has always turned into `null` — the one outcome that is
    // not a failure. Saying "try again" to that visitor would be a promise this
    // page cannot keep.
    vi.mocked(readMarketProduct).mockResolvedValue(null);

    render(await Home());

    expect(
      screen.getByText(/no longer in the catalogue, so there is no commitment to show/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/could not be read just now/i)).toBeNull();
  });
});

describe("the front door, signed in", () => {
  it("is the person's own record, not the proof", async () => {
    const session = signSession({ payerId: "PAYER-1", email: "shopper@example.com" });
    cookie.value = session ?? undefined;

    render(await Home());

    expect(
      screen.getByRole("heading", { name: /your commitments/i }),
    ).toBeInTheDocument();
    // The proof was the thing a returning shopper had to scroll past.
    expect(screen.queryByRole("heading", { name: /what the seller wrote/i })).toBeNull();
    expect(findSubscriptionsFor).toHaveBeenCalledWith("PAYER-1");
  });

  it("says it could not look, rather than saying there is nothing", async () => {
    cookie.value = signSession({ payerId: "PAYER-1", email: "shopper@example.com" }) ?? undefined;
    vi.mocked(findSubscriptionsFor).mockResolvedValue({ kind: "unavailable" });

    render(await Home());

    expect(screen.getByText(/this is not a statement that you have none/i))
      .toBeInTheDocument();
  });
});
