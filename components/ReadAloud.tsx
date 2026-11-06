"use client";

import { useEffect, useState } from "react";

/**
 * Reads the figures aloud with the browser's own speech synthesis. No model, no
 * key, no service — and no substitute for a screen reader, which already works
 * on this page (IPD 10).
 */
export function ReadAloud({ text }: { text: string }) {
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "speechSynthesis" in window);
    return () => {
      window.speechSynthesis?.cancel();
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

  if (!supported) return null;

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
