import { publicOrigin } from "@/lib/origin";
import { clearedSessionCookie } from "@/lib/session";

/**
 * Signing out is deleting a cookie. There is no server-side session to revoke,
 * which is the point: the person's browser is the only place the sign-in exists.
 *
 * The landing is the home screen, not the account page: signed out, the home is
 * the proof and the way in, which is where a person who has just left their
 * record belongs. Sending them to `/account` would give them a screen whose only
 * job is to offer the sign-in they have just cancelled.
 */
export async function POST(request: Request) {
  const origin = publicOrigin(request);
  return new Response(null, {
    status: 303,
    headers: {
      Location: `${origin}/`,
      "Set-Cookie": clearedSessionCookie(),
      "Cache-Control": "no-store",
    },
  });
}
