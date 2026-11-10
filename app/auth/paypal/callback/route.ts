import { publicOrigin } from "@/lib/origin";
import { callbackUri, exchangeCode, readProfile } from "@/lib/paypal/identity";
import {
  STATE_COOKIE,
  clearedStateCookie,
  sessionCookie,
  signSession,
} from "@/lib/session";

/**
 * The return from PayPal: check that this is the sign-in this browser started,
 * exchange the single-use code, and keep the answer in a signed cookie.
 *
 * Every failure lands on `/account?signin=…` with a reason, because the page's
 * job is to say what happened. Nothing about the person is written down here —
 * the cookie is the person's, and it expires.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  // The address the browser is on, not the one Next normalised it to: the
  // session cookie is about to be set for this host and must be read back from
  // the same one.
  const origin = publicOrigin(request);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const cookies = request.headers.get("cookie") ?? "";
  const expected = new RegExp(`(?:^|;\\s*)${STATE_COOKIE}=([^;]+)`).exec(cookies)?.[1];

  const back = (reason: string) =>
    new Response(null, {
      status: 302,
      headers: {
        Location: `${origin}/account?signin=${reason}`,
        "Set-Cookie": clearedStateCookie(),
        "Cache-Control": "no-store",
      },
    });

  // A return with no code, a missing state, or a state that is not the one this
  // browser was given: PayPal did not send this person back from a sign-in we
  // started, so there is nothing to exchange.
  if (!code || !state || !expected || state !== expected) return back("denied");

  try {
    // The exchange repeats the redirect URI, and PayPal compares it to the one
    // the code was issued for — the same source, or a working sign-in fails here.
    const token = await exchangeCode(code, callbackUri(request));
    const profile = await readProfile(token);
    if (!profile) return back("unreadable");

    const signed = signSession(profile);
    // No secret to sign with is not a session we may set: an unsigned cookie
    // would let anyone read anyone's records.
    if (!signed) return back("unavailable");

    // Two Set-Cookie headers, appended rather than joined: a comma between them
    // is ambiguous, and a browser that reads it as one cookie would drop both.
    const headers = new Headers({ Location: `${origin}/account`, "Cache-Control": "no-store" });
    headers.append("Set-Cookie", sessionCookie(signed));
    headers.append("Set-Cookie", clearedStateCookie());

    return new Response(null, { status: 302, headers });
  } catch {
    return back("failed");
  }
}
