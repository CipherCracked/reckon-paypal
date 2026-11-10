import { randomBytes } from "node:crypto";
import { authorizeUrl, identityConfigured } from "@/lib/paypal/identity";
import { signInConfigured, stateCookie } from "@/lib/session";

/**
 * The first half of a sign-in: a random `state`, kept in a cookie this browser
 * can prove it set, and a redirect to PayPal's page.
 *
 * Nothing about the person is sent here. The redirect URI is derived from the
 * request's own origin, so the same code works on localhost and on a deployment
 * without a variable to keep in step — the one thing that must match is the
 * return URL registered on the PayPal app.
 */
export async function GET(request: Request) {
  const origin = new URL(request.url).origin;

  // A half-configured deployment sends the person back to the page that can say
  // why, rather than to PayPal's error screen.
  if (!identityConfigured() || !signInConfigured()) {
    return Response.redirect(`${origin}/account?signin=unavailable`, 302);
  }

  const state = randomBytes(16).toString("base64url");
  const redirectUri = `${origin}/auth/paypal/callback`;

  return new Response(null, {
    status: 302,
    headers: {
      Location: authorizeUrl(redirectUri, state),
      "Set-Cookie": stateCookie(state),
      "Cache-Control": "no-store",
    },
  });
}
