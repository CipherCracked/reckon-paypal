import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Atkinson_Hyperlegible, IBM_Plex_Mono } from "next/font/google";
import { Shell } from "@/components/Shell";
import { identityConfigured } from "@/lib/paypal/identity";
import { SESSION_COOKIE, readSession, signInConfigured } from "@/lib/session";
import "./globals.css";

/**
 * The two faces are the style's argument, not decoration (ITD 24).
 *
 * The text face is drawn for low vision, which is the audience this product is
 * for; the figures face is a mono, so amounts with `tabular-nums` line up and a
 * column of money can be compared by eye. Both are fetched and self-hosted at
 * build, so a page load never asks a third party for a font.
 */
const textFace = Atkinson_Hyperlegible({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-text",
  display: "swap",
});

const figureFace = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-figure",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Reckon",
  applicationName: "Reckon",
  description:
    "States what a commitment actually costs — what is charged today, what it adds up to across its term, and what it costs to leave — before anyone agrees to it.",
};

/**
 * The document. The frame itself lives in `components/Shell.tsx`, where it can be tested.
 *
 * Since IPD 27 the frame carries the way in, on every screen, so the layout
 * tells it what it is: whether this person holds a signed session, and whether
 * signing in can work here at all. Both answers come from the request — a
 * cookie is parsed, nothing is looked up — so the header states the truth at
 * first paint rather than flipping once a client catches up. A deployment
 * without the credentials renders no account control, because a *Sign in* that
 * cannot work is a claim the frame is not allowed to make.
 */
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const person = readSession((await cookies()).get(SESSION_COOKIE)?.value);

  return (
    <html lang="en" className={`${textFace.variable} ${figureFace.variable}`}>
      <body>
        <Shell signedIn={Boolean(person)} canSignIn={identityConfigured() && signInConfigured()}>
          {children}
        </Shell>
      </body>
    </html>
  );
}
