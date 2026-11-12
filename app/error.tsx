"use client";

import Link from "next/link";
import { Page } from "@/components/Page";

/**
 * The page for a screen that could not be built.
 *
 * This exists because the product's screens are assembled from four third
 * parties at render time, and until now there was no boundary between them and
 * the visitor: an unguarded read that threw became Next's own error page, which
 * shows a stack trace to someone who came here to avoid that kind of thing. The
 * unguarded read that made this concrete was the front door's catalogue lookup,
 * which is now handled where it happens and says which kind of nothing it is —
 * this is the backstop for the ones nobody has found yet.
 *
 * Three rules, all of them the product's own:
 *
 * 1. **No stack, no message, no digest.** `error.message` is written by whatever
 *    threw — a PayPal payload, a fetch — and is not a sentence for this audience.
 *    The operator gets the message in the server log; the visitor gets the truth
 *    that fits on a screen.
 * 2. **No claim about money.** A render failure cannot have charged anything,
 *    but saying "nothing has been charged" here would be an assurance from a
 *    component that cannot see PayPal. It says what it knows: the screen did not
 *    load, and nothing that was already at PayPal has been changed by it.
 * 3. **A way forward that is not the browser's back button.** `reset()` rebuilds
 *    the segment, which is right when the failure was a read that may answer next
 *    time; the link is right when it was not.
 */
export default function ScreenFailed({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Page
      title="This screen did not load"
      lede={
        <span>
          Something this page needed did not answer. Nothing you had already done was changed by
          it.
        </span>
      }
    >
      <div className="failed-actions">
        <button type="button" className="button-primary" onClick={reset}>
          Try this screen again
        </button>
        <Link className="button-secondary" href="/">
          Back to the front door
        </Link>
      </div>
    </Page>
  );
}
