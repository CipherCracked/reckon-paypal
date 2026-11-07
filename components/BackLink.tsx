import Link from "next/link";

/**
 * A way out of the room you are in, naming the place it goes (IPD 15).
 *
 * The target is declared by the page, never derived from history: the browser's
 * back button can leave the app, and after the PayPal redirect it would return
 * to a document that no longer exists (ITD 14). A page that declares nothing
 * gets no back link, which is a gap a test can see.
 */
export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <nav aria-label="Back">
      <Link className="back-link" href={href}>
        {children}
      </Link>
    </nav>
  );
}
