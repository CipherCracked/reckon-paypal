import type { Metadata } from "next";
import { Shell } from "@/components/Shell";
import "./globals.css";

export const metadata: Metadata = {
  title: "Accessible Commerce Companion",
  description:
    "States what a commitment actually costs — what is charged today, what it adds up to across its term, and what it costs to leave — before anyone agrees to it.",
};

/** The document. The frame itself lives in `components/Shell.tsx`, where it can be tested. */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
