import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { RecordWords } from "@/components/RecordWords";

function answer(body: unknown, ok = true) {
  return vi.fn().mockResolvedValue({ ok, json: async () => body });
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("RecordWords", () => {
  it("shows the sentence when it arrives, and says who wrote it", async () => {
    vi.stubGlobal("fetch", answer({ sentence: "PayPal has taken $24.99 so far." }));

    const { container } = render(<RecordWords subscriptionId="I-SUB-1" />);

    // The page is whole without this: nothing is shown until there is a sentence.
    expect(container).toBeEmptyDOMElement();

    expect(await screen.findByText(/PayPal has taken \$24\.99 so far\./)).toBeInTheDocument();
    expect(screen.getByText(/written by the model, checked against PayPal's figures/i)).toBeInTheDocument();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("asks the server for a sentence about this agreement, and sends no figures", async () => {
    const fetchMock = answer({ sentence: "PayPal has taken $24.99 so far." });
    vi.stubGlobal("fetch", fetchMock);

    render(<RecordWords subscriptionId="I-SUB-1" />);

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/record/words");
    expect(JSON.parse(String(init.body))).toEqual({ subscriptionId: "I-SUB-1" });
  });

  it("shows nothing when the server wrote no sentence", async () => {
    vi.stubGlobal("fetch", answer({ sentence: null }));

    const { container } = render(<RecordWords subscriptionId="I-SUB-1" />);

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("shows nothing when the model could not be reached", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));

    const { container } = render(<RecordWords subscriptionId="I-SUB-1" />);

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("shows nothing when the route refuses", async () => {
    vi.stubGlobal("fetch", answer({ error: "bad id" }, false));

    const { container } = render(<RecordWords subscriptionId="I-SUB-1" />);

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
