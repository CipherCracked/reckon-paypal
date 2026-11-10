import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RecognitionCheck } from "@/components/RecognitionCheck";
import { money } from "@/lib/money";

const note = "This is today's charge, not the total across the term.";

function renderCheck(onResult = vi.fn()) {
  return render(
    <RecognitionCheck
      amount={money(1200)}
      label="Charged today"
      note={note}
      onResult={onResult}
    />,
  );
}

describe("RecognitionCheck", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("names the figure before showing it, so the reader knows what is being checked", () => {
    renderCheck();

    expect(screen.getByText("Charged today")).toBeInTheDocument();
    expect(screen.getByText("$12.00")).toBeInTheDocument();
    // The term context is the difference between "$12.00 does not match the
    // $144.00 above" and a check that is actually correct.
    expect(screen.getByText(/not the total across the term/i)).toBeInTheDocument();
  });

  it("shows the amount and asks a recognition question, never a recall question", () => {
    renderCheck();

    expect(screen.getByText("$12.00")).toBeInTheDocument();
    expect(screen.getByText(/does that match what you expected\?/i)).toBeInTheDocument();
  });

  it("reports a match when the shopper says yes", async () => {
    const onResult = vi.fn();
    renderCheck(onResult);

    await userEvent.click(screen.getByRole("button", { name: "Yes" }));

    expect(onResult).toHaveBeenCalledWith(true);
    expect(screen.getByText(/confirmed: \$12\.00/i)).toBeInTheDocument();
  });

  it("asks for the breakdown when the shopper says no", async () => {
    const onResult = vi.fn();
    renderCheck(onResult);

    await userEvent.click(screen.getByRole("button", { name: /show me the breakdown/i }));

    expect(onResult).toHaveBeenCalledWith(false);
  });

  it("can be skipped without reporting a result and without changing anything", async () => {
    const onResult = vi.fn();
    renderCheck(onResult);

    await userEvent.click(screen.getByRole("button", { name: /skip/i }));

    expect(onResult).not.toHaveBeenCalled();
    expect(screen.queryByText(/does that match what you expected\?/i)).toBeNull();
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

    const answered = renderCheck();
    await userEvent.click(screen.getByRole("button", { name: "Yes" }));
    answered.unmount();

    const asked = renderCheck();
    await userEvent.click(screen.getByRole("button", { name: /show me the breakdown/i }));
    asked.unmount();

    renderCheck();
    await userEvent.click(screen.getByRole("button", { name: /skip/i }));

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(beaconSpy).not.toHaveBeenCalled();
  });
});
