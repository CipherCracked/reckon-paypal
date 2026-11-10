import { paypalBaseUrl } from "./client";

/**
 * Log in with PayPal — the Identity API (ITD 22).
 *
 * This is the only way the product learns who is asking, and it learns it from
 * the party that holds the money. Nothing here is a credential of ours: the
 * person authenticates on PayPal's page, and what comes back is an authorization
 * code we exchange for a token we use once.
 *
 * `userinfo` returns `user_id` (documented as the payer id) and a **verified**
 * email. The email is shown to the person; the payer id is what records are
 * matched on, because an email is not an identity — two accounts can share one,
 * and a person can change theirs.
 */

export const SIGN_IN_SCOPES = "openid profile email";

/** Whether the two credentials a sign-in needs are present at all. */
export function identityConfigured(): boolean {
  return Boolean(process.env.PAYPAL_CLIENT_ID?.trim() && process.env.PAYPAL_CLIENT_SECRET?.trim());
}

/**
 * The page a person is sent to. Sandbox and live differ only in the host: the
 * REST base decides which, so a deployment cannot point its API at sandbox and
 * its sign-in at production.
 */
export function authorizeUrl(redirectUri: string, state: string): string {
  const host = paypalBaseUrl().includes("sandbox")
    ? "https://www.sandbox.paypal.com"
    : "https://www.paypal.com";

  const url = new URL(`${host}/connect/`);
  url.searchParams.set("flowEntry", "static");
  url.searchParams.set("client_id", process.env.PAYPAL_CLIENT_ID?.trim() ?? "");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", SIGN_IN_SCOPES);
  url.searchParams.set("state", state);
  return url.toString();
}

export class IdentityError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "IdentityError";
  }
}

async function postToken(form: Record<string, string>): Promise<{ access_token?: string }> {
  const id = process.env.PAYPAL_CLIENT_ID?.trim();
  const secret = process.env.PAYPAL_CLIENT_SECRET?.trim();
  if (!id || !secret) throw new IdentityError("PayPal sign-in is not configured.", 0);

  const response = await fetch(`${paypalBaseUrl()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(form).toString(),
    cache: "no-store",
  });

  if (!response.ok) {
    // The body of a failed token exchange can echo the credentials back in some
    // error shapes, so it is read for nothing and never surfaced.
    throw new IdentityError("PayPal would not complete the sign-in.", response.status);
  }

  return (await response.json()) as { access_token?: string };
}

/** The authorization code is single-use; this is the only exchange that should exist. */
export async function exchangeCode(code: string, redirectUri: string): Promise<string> {
  const body = await postToken({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });
  if (!body.access_token) throw new IdentityError("PayPal returned no token.", 200);
  return body.access_token;
}

export type IdentityProfile = { payerId: string; email: string };

/**
 * The one call the token is for. `user_id` is the payer id PayPal uses on a
 * subscription's `subscriber` block; `payer_id` is accepted too because the
 * field's spelling has moved between API versions and a sign-in must not fail on
 * which one answered.
 */
export async function readProfile(accessToken: string): Promise<IdentityProfile | null> {
  const response = await fetch(
    `${paypalBaseUrl()}/v1/identity/openidconnect/userinfo?schema=openid`,
    { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" },
  );

  if (!response.ok) throw new IdentityError("PayPal would not say who this is.", response.status);

  const body = (await response.json()) as {
    user_id?: unknown;
    payer_id?: unknown;
    email?: unknown;
  };

  const payerId =
    typeof body.user_id === "string" ? body.user_id : typeof body.payer_id === "string" ? body.payer_id : "";
  if (!payerId) return null;

  return { payerId, email: typeof body.email === "string" ? body.email : "" };
}
