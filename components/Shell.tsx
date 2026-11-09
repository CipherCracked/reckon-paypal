import Link from "next/link";
import { TextSizeControl } from "@/components/TextSizeControl";

/**
 * The frame every screen sits inside (ITD 13).
 *
 * It names the service, gives the keyboard one way past it, and renders no page
 * content — so a page's figures never depend on the frame, and the frame never
 * depends on a page. The footer names the service and nothing else: a status
 * line repeated on every screen stops being disclosure (IPD 14).
 *
 * The reader's text size lives here (IPD 24). A control that appears on some
 * screens and not others teaches the person to hunt for it; in the frame it is
 * in the same place on every screen, including the ones built later, and it
 * scales the document rather than one container.
 */
export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to the content
      </a>

      <header className="site-header">
        <Link className="service-name" href="/">
          Accessible Commerce Companion
        </Link>
        <TextSizeControl />
      </header>

      <main id="main" tabIndex={-1}>
        {children}
      </main>

      <footer className="site-footer">
        <p>Built with PayPal for the 2026 AI Hackathon.</p>
      </footer>
    </>
  );
}
