"use client";

import { useEffect, useState } from "react";
import { WRITTEN_FROM_RECORD } from "@/lib/commitment/provenance";

/**
 * The model's plain-language sentence about PayPal's record (IPD 46).
 *
 * It arrives after the page and is never waited for: the exact line above it is
 * the fact, and this is a second telling for a reader who finds numbers hard.
 * When the request fails, is refused, or returns nothing, the component renders
 * nothing at all — a record that has lost its explanation has not lost a figure.
 *
 * The server is asked with an id and nothing else. The figures are re-read from
 * PayPal on the server, because the sentence's claim is that every numeral in
 * it came from PayPal's own record (ITD 38).
 */
export function RecordWords({ subscriptionId }: { subscriptionId: string }) {
  const [sentence, setSentence] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let live = true;

    fetch("/api/record/words", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscriptionId }),
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((body: unknown) => {
        const answer = (body ?? {}) as { sentence?: unknown };
        const text = typeof answer.sentence === "string" ? answer.sentence.trim() : "";
        if (live && text) setSentence(text);
      })
      .catch(() => {
        // Nothing to say about a sentence that did not come. The line above it
        // is still the record.
      });

    return () => {
      live = false;
      controller.abort();
    };
  }, [subscriptionId]);

  if (!sentence) return null;

  return (
    <p className="record-words" role="status">
      {sentence} <span className="commitment-hint">{WRITTEN_FROM_RECORD}</span>
    </p>
  );
}
