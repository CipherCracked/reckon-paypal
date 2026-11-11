import Link from "next/link";
import { TextSizeControl } from "@/components/TextSizeControl";

/**
 * The frame every screen sits inside (ITD 13, IPD 28).
 *
 * It names the service, gives the keyboard one way past it, and renders no page
 * content — so a page's figures never depend on the frame, and the frame never
 * depends on a page. The footer names the service and nothing else: a status
 * line repeated on every screen stops being disclosure (IPD 14).
 *
 * **Navigation lives here, and it did not before.** `/shop` and `/read` were
 * reachable only from a link in the body of the entry, so a person who landed on
 * a product, a receipt or a bill could not get to either of them (IPD 28). Two
 * destinations go in the frame; the entry is the service name, because a home
 * link with a second name for the same place is one more word to learn.
 *
 * The reader's text size also lives here (IPD 24), but behind a disclosure: a
 * control that appears on some screens teaches people to hunt for it, and a
 * fieldset that occupies the first line of every screen on a phone was doing
 * exactly that in reverse — it was the largest thing in the frame. It stays in
 * the same place on every screen; it just stops asking for attention first.
 *
 * The account control is the one thing in the frame that changes with the
 * person (IPD 27). It names the action rather than the destination, because a
 * control that names a page the person is already on is a button that does
 * nothing — the defect that produced IPD 28. Signed out it starts the sign-in;
 * signed in it ends it, and the home screen says whose record is being shown.
 */
export function Shell({
  children,
  signedIn = false,
  canSignIn = false,
}: {
  children: React.ReactNode;
  signedIn?: boolean;
  canSignIn?: boolean;
}) {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to the content
      </a>

      <header className="site-header">
        <Link className="service-name" href="/">
          Accessible Commerce Companion
        </Link>

        <nav className="site-nav" aria-label="Sections">
          <Link href="/shop">Shop</Link>
          <Link href="/read">Read a document</Link>
        </nav>

        <div className="frame-controls">
          <details className="text-size-disclosure">
            <summary>Text size</summary>
            <TextSizeControl />
          </details>

          {canSignIn ? (
            signedIn ? (
              <form method="post" action="/auth/paypal/signout">
                <button type="submit" className="account-control">
                  Sign out
                </button>
              </form>
            ) : (
              // A plain anchor: this route answers with a redirect to PayPal,
              // and a prefetch of it would be a request nobody asked for.
              <a className="account-control" href="/auth/paypal/start">
                Sign in
              </a>
            )
          ) : null}
        </div>
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
