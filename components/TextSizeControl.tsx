"use client";

import { useEffect, useState } from "react";
import { readPreferences, savePreference, type TextScale } from "@/lib/preferences";

const SCALES: Array<{ value: TextScale; label: string }> = [
  { value: "normal", label: "Normal" },
  { value: "large", label: "Large" },
  { value: "larger", label: "Largest" },
];

/**
 * The reader's text size, in the frame rather than on a page (IPD 24).
 *
 * Two things about it are the decision. It sits in the shell, so it is in the
 * same place on every screen and a screen added next year inherits it. And it
 * sets the size on the document element, not on a container: every size in
 * `globals.css` is written in `rem`, which is root-relative, so the container
 * rule this replaces — `font-size` on `.consent` — could not reach any of them.
 *
 * The stored value is read after mount, so the first paint is the accessible
 * default rather than one person's remembered choice appearing on someone
 * else's screen.
 */
export function TextSizeControl() {
  const [scale, setScale] = useState<TextScale>("normal");

  useEffect(() => {
    // Read after mount, not during render: the stored value is the reader's and
    // a server render cannot see it, so reading it earlier is a hydration
    // mismatch waiting for a slow browser.
    const stored = readPreferences().textScale;
    setScale(stored);
    applyScale(stored);
  }, []);

  function choose(next: TextScale) {
    setScale(next);
    applyScale(next);
    savePreference("textScale", next);
  }

  return (
    <fieldset className="display-controls text-size-controls">
      <legend>Make this page easier to read</legend>
      <div role="group" aria-labelledby="text-size-label" className="display-control-options">
        <span className="display-control-label" id="text-size-label">
          Text size
        </span>
        {SCALES.map((option) => (
          <button
            key={option.value}
            type="button"
            className={scale === option.value ? "chip chip-active" : "chip"}
            aria-pressed={scale === option.value}
            onClick={() => choose(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/** The root attribute every rule in the stylesheet keys on. */
function applyScale(scale: TextScale): void {
  document.documentElement.dataset.textScale = scale;
}
