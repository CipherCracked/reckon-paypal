import { publicOrigin } from "../origin";
import { paypalBaseUrl } from "./client";

/**
 * Log in with PayPal — the Identity API (ITD 22).
 *
 * This is the only way the product learns who is asking, and it learns it from
 * the party that holds the money. Nothing here is a credential of ours: the
 * person authenticates on PayPal's page, and what comes back is an authorization
 * code we exchange for a token we use once.
 *
 * What `userinfo` returns depends on what the app was granted. The payer id is
 * what records are matched on, because an email is not an identity — two
 * accounts can share one, and a person can change theirs. Measured against the
 * sandbox app, 2026-11-11: with only `openid` granted, PayPal answers with an
 * opaque subject URL and nothing else, so a sign-in that looks complete can
 * identify a person without naming their account.
 */

/**
 * `openid` alone identifies a person to PayPal but does not say *which PayPal
 * account* they are: it returns an opaque subject URL, and the payer id — the
 * thing a subscription's `subscriber.payer_id` is — is behind the attributes
 * scope. Requesting it is therefore not optional, and PayPal refuses the whole
 * sign-in with "invalid scope" until the app's Log in with PayPal settings tick
 * **Email** and **PayPal account ID (payer ID)**.
 */
export const SIGN_IN_SCOPES =
  "openid email https://uri.paypal.com/services/paypalattributes";

/** Whether the two credentials a sign-in needs are present at all. */
export function identityConfigured(): boolean {
  return Boolean(process.env.PAYPAL_CLIENT_ID?.trim() && process.env.PAYPAL_CLIENT_SECRET?.trim());
}

/**
 * The address PayPal must send the person back to.
 *
 * It has to be character-for-character the return URL registered on the app,
 * and PayPal treats `localhost` and `127.0.0.1` as two different addresses — the
 * dashboard took one and refused the other (see `publicOrigin`).
 */
export function callbackUri(request: Request): string {
  return `${publicOrigin(request)}/auth/paypal/callback`;
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
 * The payer id, or nothing.
 *
 * `payer_id` is the field the attributes scope fills in. `user_id` is the older
 * spelling of the same thing and is still the payer id on some accounts — but
 * without the attributes scope PayPal puts an **opaque subject URL** there
 * (`https://www.paypal.com/webapps/auth/identity/user/…`), which is a stable
 * name for a person and not the id any subscription is filed under. Reading
 * that as a payer id would sign someone in and then tell them, wrongly, that the
 * store holds nothing for them.
 */
function payerIdFrom(body: { user_id?: unknown; payer_id?: unknown; sub?: unknown }): string {
  const candidates = [body.payer_id, body.user_id, body.sub];
  for (const candidate of candidates) {
    if (typeof candidate !== "string") continue;
    const value = candidate.trim();
    if (value && !value.includes("://")) return value;
  }
  return "";
}

/**
 * The one call the token is for. The email is shown to the person and is a
 * courtesy; the payer id is what records are matched on, so a sign-in that does
 * not carry one is not a sign-in (see `payerIdFrom`).
 */
export async function readProfile(accessToken: string): Promise<IdentityProfile | null> {
  const response = await fetch(
    `${paypalBaseUrl()}/v1/identity/openidconnect/userinfo?schema=openid`,
    { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" },
  );

  if (!response.ok) throw new IdentityError("PayPal would not say who this is.", response.status);

  const body = (await response.json()) as { user_id?: unknown; payer_id?: unknown; email?: unknown };
  const payerId = payerIdFrom(body);
  if (!payerId) return null;

  return { payerId, email: typeof body.email === "string" ? body.email : "" };
}
