import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Who is asking, kept where the person can delete it (ITD 22).
 *
 * There is no session store, no user row and no database. The cookie carries a
 * payer id, an email and an expiry, and it is signed so that a payer id cannot
 * be edited into someone else's — which for this product is the whole of the
 * harm, because the only thing the cookie authorises is *"show me this payer's
 * records"*.
 *
 * A missing or too-short secret fails **closed**: sign-in is unavailable and the
 * page says so. Degrading to an unsigned cookie would let anyone read anyone's
 * records, and that is worse than a feature that is switched off.
 */
export const SESSION_COOKIE = "acc_signed_in";

/** Long enough for a visit, short enough that a copied cookie stops working. */
const LIFETIME_SECONDS = 2 * 60 * 60;

export type SignedIn = { payerId: string; email: string; expiresAt: number };

function secret(): string | null {
  const value = process.env.SESSION_SECRET?.trim();
  return value && value.length >= 16 ? value : null;
}

/** Whether this deployment can sign anyone in at all. */
export function signInConfigured(): boolean {
  return secret() !== null;
}

function mac(payload: string, key: string): string {
  return createHmac("sha256", key).update(payload).digest("base64url");
}

/** `null` when there is no secret to sign with — the caller shows "unavailable". */
export function signSession(person: { payerId: string; email: string }): string | null {
  const key = secret();
  if (!key) return null;

  const payload = Buffer.from(
    JSON.stringify({
      payerId: person.payerId,
      email: person.email,
      exp: Math.floor(Date.now() / 1000) + LIFETIME_SECONDS,
    }),
  ).toString("base64url");

  return `${payload}.${mac(payload, key)}`;
}

/**
 * Reads a cookie back, or `null` for anything that is not a signature this
 * deployment made and has not expired. Every failure is the same answer: an
 * unreadable cookie is the same as no cookie.
 */
export function readSession(raw: string | undefined | null): SignedIn | null {
  const key = secret();
  if (!key || !raw) return null;

  const [payload, signature] = raw.split(".");
  if (!payload || !signature) return null;

  const expected = Buffer.from(mac(payload, key));
  const received = Buffer.from(signature);
  // `timingSafeEqual` throws on a length mismatch, which is itself the answer.
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      payerId?: unknown;
      email?: unknown;
      exp?: unknown;
    };
    if (typeof parsed.payerId !== "string" || !parsed.payerId) return null;
    if (typeof parsed.exp !== "number") return null;
    if (parsed.exp * 1000 <= Date.now()) return null;
    return {
      payerId: parsed.payerId,
      email: typeof parsed.email === "string" ? parsed.email : "",
      expiresAt: parsed.exp * 1000,
    };
  } catch {
    return null;
  }
}

function secure(): string {
  return process.env.NODE_ENV === "production" ? "; Secure" : "";
}

export function sessionCookie(value: string): string {
  return `${SESSION_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${LIFETIME_SECONDS}${secure()}`;
}

export function clearedSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure()}`;
}

/**
 * The `state` value that ties a return to the sign-in this browser started
 * (double-submit). Ten minutes, because a person who takes longer than that to
 * sign in at PayPal is better off starting again than arriving at a page that
 * cannot say which attempt they belong to.
 */
export const STATE_COOKIE = "acc_signin_state";

export function stateCookie(value: string): string {
  return `${STATE_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=600${secure()}`;
}

export function clearedStateCookie(): string {
  return `${STATE_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure()}`;
}
