import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RecognitionCheck } from "@/components/RecognitionCheck";
import { money } from "@/lib/money";

describe("RecognitionCheck", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });
  it("shows the amount and asks a recognition question, never a recall question", () => {
    render(<RecognitionCheck amount={money(1200)} onResult={vi.fn()} />);

    expect(screen.getByText("$12.00")).toBeInTheDocument();
    expect(screen.getByText(/does this match what you expected\?/i)).toBeInTheDocument();
  });

  it("reports a match when the shopper says yes", async () => {
    const onResult = vi.fn();
    render(<RecognitionCheck amount={money(1200)} onResult={onResult} />);

    await userEvent.click(screen.getByRole("button", { name: "Yes" }));

    expect(onResult).toHaveBeenCalledWith(true);
  });

  it("asks for the breakdown when the shopper says no", async () => {
    const onResult = vi.fn();
    render(<RecognitionCheck amount={money(1200)} onResult={onResult} />);

    await userEvent.click(screen.getByRole("button", { name: /show me the breakdown/i }));

    expect(onResult).toHaveBeenCalledWith(false);
  });

  it("can be skipped without reporting a result and without changing anything", async () => {
    const onResult = vi.fn();
    render(<RecognitionCheck amount={money(1200)} onResult={onResult} />);

    await userEvent.click(screen.getByRole("button", { name: /skip/i }));

    expect(onResult).not.toHaveBeenCalled();
    expect(screen.queryByText(/does this match what you expected\?/i)).toBeNull();
    expect(screen.getByText(/check skipped/i)).toBeInTheDocument();
  });

  it("sends nothing anywhere, whichever answer is given", async () => {
    const fetchSpy = vi.fn();
    const beaconSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    Object.defineProperty(navigator, "sendBeacon", {
      value: beaconSpy,
      configurable: true,
    });

    const answered = render(<RecognitionCheck amount={money(1200)} onResult={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Yes" }));
    answered.unmount();

    const asked = render(<RecognitionCheck amount={money(1200)} onResult={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /show me the breakdown/i }));
    asked.unmount();

    render(<RecognitionCheck amount={money(1200)} onResult={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /skip/i }));

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(beaconSpy).not.toHaveBeenCalled();
  });
});
