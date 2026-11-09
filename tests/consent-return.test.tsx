import { describe, it, expect, vi } from "vitest";
import ConsentPage from "@/app/consent/[orderId]/page";

// `redirect` is how the page answers a subscription return; here it throws so
// the test can see where it would have sent the shopper.
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
}));

function visit(searchParams: Record<string, string>) {
  return ConsentPage({
    params: Promise.resolve({ orderId: "pending" }),
    searchParams: Promise.resolve(searchParams),
  });
}

describe("coming back from PayPal", () => {
  it("sends an approved subscription to its receipt, not through order capture", async () => {
    // Capture is for orders. Running it on a subscription id would report a
    // failure for a payment that succeeded, at the moment the shopper is
    // looking for reassurance.
    await expect(
      visit({ slug: "coffee-subscription", approved: "1", subscription_id: "I-SUB-1" }),
    ).rejects.toThrow("REDIRECT:/receipt/I-SUB-1?slug=coffee-subscription");
  });

  it("leaves an approved order on the consent screen so it can be captured", async () => {
    // No token here, so the page renders the screen with "returning" set; the
    // capture itself is the screen's job. Reaching this assertion means no
    // redirect was thrown.
    await expect(
      visit({ slug: "noise-cancelling-headphones", approved: "1" }),
    ).resolves.toBeTruthy();
  });
});
