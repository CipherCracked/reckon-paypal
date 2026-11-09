import type { Currency, Money } from "@/lib/money";

export class PayPalError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly issue?: string,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = "PayPalError";
  }
}

export function paypalBaseUrl(): string {
  const configured = process.env.PAYPAL_BASE_URL?.trim();
  return (configured || "https://api-m.sandbox.paypal.com").replace(/\/$/, "");
}

type CachedToken = { value: string; expiresAt: number };

let tokenCache: CachedToken | null = null;

/** Test hook: the cache is module state, so a test that stubs `fetch` clears it first. */
export function resetTokenCache(): void {
  tokenCache = null;
}

export async function getAccessToken(signal?: AbortSignal | null): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now()) {
    return tokenCache.value;
  }

  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("PayPal credentials are not configured.");
  }

  const response = await fetch(`${paypalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
    // A caller with a deadline applies it to the token too, or a slow handshake
    // would outlast the budget it was given.
    signal,
  });

  if (!response.ok) {
    throw new PayPalError("PayPal rejected the credentials.", response.status);
  }

  const body = (await response.json()) as { access_token: string; expires_in: number };
  const lifetimeMs = Math.max(body.expires_in - 60, 0) * 1000;
  tokenCache = { value: body.access_token, expiresAt: Date.now() + lifetimeMs };
  return tokenCache.value;
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function firstIssue(body: unknown): string | undefined {
  const details = (body as { details?: Array<{ issue?: string }> } | null)?.details;
  return Array.isArray(details) ? details[0]?.issue : undefined;
}

export type PayPalResponse<T> = {
  body: T;
  /** Where PayPal created the resource. Invoicing answers 201 with a body-less create. */
  location: string | null;
};

export async function paypalRequestDetailed<T>(
  path: string,
  init: RequestInit = {},
): Promise<PayPalResponse<T>> {
  const token = await getAccessToken(init.signal);

  const response = await fetch(`${paypalBaseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  const body = await readJson(response);

  if (!response.ok) {
    const issue = firstIssue(body);
    throw new PayPalError(
      issue ? `PayPal returned ${issue}.` : `PayPal request failed with ${response.status}.`,
      response.status,
      issue,
      body,
    );
  }

  return {
    body: body as T,
    // A stubbed response in a test has no headers; a real one always does.
    location: response.headers?.get?.("location") ?? null,
  };
}

export async function paypalRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  return (await paypalRequestDetailed<T>(path, init)).body;
}

/**
 * Reads made during a page render carry a deadline; the helper lives in
 * `lib/deadline.ts` because a model read needs one too. Re-exported here so the
 * PayPal callers keep importing it from the module that makes them slow.
 */
export { READ_DEADLINE_MS, withinDeadline } from "../deadline";

/**
 * The wire spelling of a money amount, built from integers. Dividing by 100
 * would put the figure through binary floating point on its way out, and this is
 * the one value PayPal will actually charge.
 */
export function toPayPalAmount(amount: Money): { currency_code: Currency; value: string } {
  const sign = amount.minor < 0 ? "-" : "";
  const abs = Math.abs(amount.minor);
  return {
    currency_code: amount.currency,
    value: `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`,
  };
}
