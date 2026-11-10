import { randomBytes } from "node:crypto";
import { publicOrigin } from "@/lib/origin";
import { authorizeUrl, callbackUri, identityConfigured } from "@/lib/paypal/identity";
import { signInConfigured, stateCookie } from "@/lib/session";

/**
 * The first half of a sign-in: a random `state`, kept in a cookie this browser
 * can prove it set, and a redirect to PayPal's page.
 *
 * Nothing about the person is sent here. The redirect URI is read from the
 * address the browser used (see `callbackUri`), so the same code works on
 * localhost and on a deployment — the one thing that must match is the return
 * URL registered on the PayPal app.
 */
export async function GET(request: Request) {
  const origin = publicOrigin(request);

  // A half-configured deployment sends the person back to the page that can say
  // why, rather than to PayPal's error screen.
  if (!identityConfigured() || !signInConfigured()) {
    return Response.redirect(`${origin}/account?signin=unavailable`, 302);
  }

  const state = randomBytes(16).toString("base64url");
  const redirectUri = callbackUri(request);

  return new Response(null, {
    status: 302,
    headers: {
      Location: authorizeUrl(redirectUri, state),
      "Set-Cookie": stateCookie(state),
      "Cache-Control": "no-store",
    },
  });
}
