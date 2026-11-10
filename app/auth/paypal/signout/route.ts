import { clearedSessionCookie } from "@/lib/session";

/**
 * Signing out is deleting a cookie. There is no server-side session to revoke,
 * which is the point: the person's browser is the only place the sign-in exists.
 */
export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
  return new Response(null, {
    status: 303,
    headers: {
      Location: `${origin}/account`,
      "Set-Cookie": clearedSessionCookie(),
      "Cache-Control": "no-store",
    },
  });
}
