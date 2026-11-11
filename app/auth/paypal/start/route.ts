import { randomBytes } from "node:crypto";
import { publicOrigin, signInHop } from "@/lib/origin";
import { authorizeUrl, callbackUri, identityConfigured } from "@/lib/paypal/identity";
import { signInConfigured, stateCookie } from "@/lib/session";

/**
 * The first half of a sign-in: a random `state`, kept in a cookie this browser
 * can prove it set, and a redirect to PayPal's page.
 *
 * Nothing about the person is sent here. The redirect URI is the address
 * registered on the PayPal app (see `signInOrigin`), so the same code works on
 * localhost and on a deployment — the one thing that must match is the return
 * URL, and PayPal answers a mismatch on its own site with a sentence a person
 * can do nothing about. A browser that reached this page by a spelling PayPal
 * will not accept is therefore moved to the one it will, before any of that.
 */
export async function GET(request: Request) {
  const hop = signInHop(request);
  if (hop) return Response.redirect(hop, 302);

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
