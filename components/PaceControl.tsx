"use client";

export type PaceControlProps = {
  progressive: boolean;
  onProgressive: (progressive: boolean) => void;
};

/**
 * The pacing control, kept with the figures it paces (IPD 24).
 *
 * It used to share a fieldset with the text size. The text size belongs to the
 * frame, where it is the same on every screen; this one is a property of a
 * figure list, and on the shop or a receipt it would be a switch that does
 * nothing. So the two controls were split rather than moved together.
 */
export function PaceControl({ progressive, onProgressive }: PaceControlProps) {
  return (
    <fieldset className="display-controls">
      <legend>Read at your own pace</legend>
      <label className="display-control-check">
        <input
          type="checkbox"
          checked={progressive}
          onChange={(event) => onProgressive(event.target.checked)}
        />
        Show one figure at a time
      </label>
    </fieldset>
  );
}
