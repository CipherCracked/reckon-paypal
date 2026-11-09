"use client";

import { useEffect, useState } from "react";

/**
 * Reads the figures aloud with the browser's own speech synthesis. No model, no
 * key, no service — and no substitute for a screen reader, which already works
 * on this page (IPD 10).
 *
 * Where the browser cannot speak, the control is not silently dropped (IPD 24).
 * A person who used this elsewhere and finds a gap where it was learns to hunt;
 * a sentence saying so is the honest answer, and it is also the one a screen
 * reader will read.
 */
export function ReadAloud({ text }: { text: string }) {
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState<boolean | null>(null);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    const speech = window.speechSynthesis;
    return () => {
      speech?.cancel();
    };
  }, []);

  function speak() {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }

  function stop() {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }

  // Nothing is decided until the browser has been asked: rendering the button
  // and then removing it on mount would move the page under the reader's finger.
  if (supported === null) return null;

  if (!supported) {
    return (
      <p className="read-aloud-note">
        This browser cannot read the page aloud. Your own screen reader will still read it.
      </p>
    );
  }

  return speaking ? (
    <button type="button" className="button-secondary" onClick={stop}>
      Stop reading
    </button>
  ) : (
    <button type="button" className="button-secondary" onClick={speak}>
      Read this aloud
    </button>
  );
}
