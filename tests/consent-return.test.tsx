import { describe, it, expect, vi, afterEach } from "vitest";
import type { ReactElement } from "react";
import ConsentPage from "@/app/consent/[orderId]/page";
import { ConsentScreen } from "@/components/ConsentScreen";

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

/** The elements the page rendered, so a prop boundary can be inspected. */
function elementsIn(
  node: unknown,
  found: ReactElement<Record<string, unknown>>[] = [],
): ReactElement<Record<string, unknown>>[] {
  if (!node) return found;
  if (Array.isArray(node)) {
    for (const child of node) elementsIn(child, found);
    return found;
  }
  if (typeof node === "object" && "props" in (node as object)) {
    const element = node as ReactElement<Record<string, unknown>>;
    found.push(element);
    elementsIn((element.props as { children?: unknown })?.children, found);
  }
  return found;
}

/** Every string the page hands down, so a secret would have nowhere to hide. */
function stringsIn(node: unknown, found: string[] = []): string[] {
  if (typeof node === "string") {
    found.push(node);
    return found;
  }
  if (Array.isArray(node)) {
    for (const child of node) stringsIn(child, found);
    return found;
  }
  if (node && typeof node === "object" && "props" in (node as object)) {
    for (const value of Object.values((node as ReactElement<{ [key: string]: unknown }>).props)) {
      stringsIn(value, found);
    }
  }
  return found;
}

describe("the consent page's props", () => {
  const before = {
    id: process.env.PAYPAL_CLIENT_ID,
    secret: process.env.PAYPAL_CLIENT_SECRET,
  };

  afterEach(() => {
    if (before.id === undefined) delete process.env.PAYPAL_CLIENT_ID;
    else process.env.PAYPAL_CLIENT_ID = before.id;
    if (before.secret === undefined) delete process.env.PAYPAL_CLIENT_SECRET;
    else process.env.PAYPAL_CLIENT_SECRET = before.secret;
  });

  it("hands the screen PayPal's public client id, and never its secret", async () => {
    process.env.PAYPAL_CLIENT_ID = "CLIENT-ID-VISIBLE";
    process.env.PAYPAL_CLIENT_SECRET = "SECRET-MUST-STAY";

    const tree = await visit({ slug: "noise-cancelling-headphones" });
    const screen = elementsIn(tree).find((element) => element.type === ConsentScreen);

    expect(screen?.props.clientId).toBe("CLIENT-ID-VISIBLE");
    // The environment is explicit because the SDK does not read it from the id:
    // a live id would still load the sandbox script (ITD 39).
    expect(screen?.props.environment).toBe("sandbox");
    // The browser gets the id and nothing else: the secret https nowhere.
    expect(stringsIn(tree).join(" ")).not.toContain("SECRET-MUST-STAY");
  });
});

describe("coming back from PayPal", () => {
  it("sends an approved subscription to its receipt, not through order capture", async () => {
    // Capture is for orders. Running it on a subscription id would report a
    // failure for a payment that succeeded, at the moment the shopper is
    // looking for reassurance.
    await expect(
      visit({ slug: "ch3-YyLUjLT", approved: "1", subscription_id: "I-SUB-1" }),
    ).rejects.toThrow("REDIRECT:/receipt/I-SUB-1?slug=ch3-YyLUjLT");
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
