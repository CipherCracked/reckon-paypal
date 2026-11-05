import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Accessible Commerce Companion",
  description:
    "A demo store that states what a purchase charges today, what it costs across its term, and what it costs to leave — before you agree.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
