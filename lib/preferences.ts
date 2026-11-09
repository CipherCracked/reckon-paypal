export type TextScale = "normal" | "large" | "larger";

export type Preferences = {
  textScale: TextScale;
  /** Show one figure at a time, revealed by the reader. */
  progressive: boolean;
};

export const DEFAULT_PREFERENCES: Preferences = {
  textScale: "normal",
  progressive: false,
};

const STORAGE_KEY = "accessible-commerce-companion.preferences";

const SCALES: TextScale[] = ["normal", "large", "larger"];

function isPreferences(value: unknown): value is Preferences {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<Preferences>;
  return (
    typeof candidate.textScale === "string" &&
    SCALES.includes(candidate.textScale as TextScale) &&
    typeof candidate.progressive === "boolean"
  );
}

/**
 * Preferences live in this browser and nowhere else (IPD 10). Storage can throw
 * or be absent — in a private window, with site data blocked — so both reads
 * and writes are guarded and the page works with the defaults when they fail.
 */
export function readPreferences(): Preferences {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed: unknown = JSON.parse(raw);
    return isPreferences(parsed) ? parsed : DEFAULT_PREFERENCES;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function writePreferences(preferences: Preferences): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  } catch {
    // A reader who cannot store a preference still gets the control this visit.
  }
}

/**
 * Changes one preference and leaves the others as the reader last chose them.
 *
 * Written as a merge rather than a whole-object write because the two controls
 * no longer live on the same screen (IPD 24): the text size belongs to the frame
 * and the pacing to the figures, so each writes its own key from a screen that
 * does not hold the other's current value. Writing the whole object from a stale
 * copy is how a reader's text size disappears when they tick a checkbox.
 */
export function savePreference<K extends keyof Preferences>(
  key: K,
  value: Preferences[K],
): void {
  writePreferences({ ...readPreferences(), [key]: value });
}
