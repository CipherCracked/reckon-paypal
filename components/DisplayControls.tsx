"use client";

import type { TextScale } from "@/lib/preferences";

export type DisplayControlsProps = {
  textScale: TextScale;
  progressive: boolean;
  onTextScale: (scale: TextScale) => void;
  onProgressive: (progressive: boolean) => void;
};

const SCALES: Array<{ value: TextScale; label: string }> = [
  { value: "normal", label: "Normal" },
  { value: "large", label: "Large" },
  { value: "larger", label: "Largest" },
];

/**
 * Three controls the reader owns, and nothing about them leaves the page. There
 * is no "accessible mode": the default already is the accessible rendering, and
 * these only adjust it (IPD 10).
 */
export function DisplayControls({
  textScale,
  progressive,
  onTextScale,
  onProgressive,
}: DisplayControlsProps) {
  return (
    <fieldset className="display-controls">
      <legend>Make this page easier to read</legend>

      <div className="display-control">
        <span className="display-control-label" id="text-size-label">
          Text size
        </span>
        <div role="group" aria-labelledby="text-size-label" className="display-control-options">
          {SCALES.map((scale) => (
            <button
              key={scale.value}
              type="button"
              className={textScale === scale.value ? "chip chip-active" : "chip"}
              aria-pressed={textScale === scale.value}
              onClick={() => onTextScale(scale.value)}
            >
              {scale.label}
            </button>
          ))}
        </div>
      </div>

      <div className="display-control">
        <label className="display-control-check">
          <input
            type="checkbox"
            checked={progressive}
            onChange={(event) => onProgressive(event.target.checked)}
          />
          Show one figure at a time
        </label>
      </div>
    </fieldset>
  );
}
