import Link from "next/link";

/**
 * The frame every screen sits inside (ITD 13).
 *
 * It names the service, gives the keyboard one way past it, and renders no page
 * content — so a page's figures never depend on the frame, and the frame never
 * depends on a page. The footer names the service and nothing else: a status
 * line repeated on every screen stops being disclosure (IPD 14).
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
