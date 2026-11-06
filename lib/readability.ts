/**
 * Flesch–Kincaid grade level, by the standard syllable heuristic. It counts
 * letters, not sense: an indicator that two texts differ in difficulty, never a
 * verdict on whether either was understood (ITD 8).
 */
export type Readability = {
  words: number;
  sentences: number;
  syllables: number;
  /** Approximate US school grade a reader would need, to one decimal place. */
  grade: number;
};

function countSyllables(word: string): number {
  const cleaned = word.toLowerCase().replace(/[^a-z]/g, "");
  if (cleaned.length === 0) return 0;
  if (cleaned.length <= 3) return 1;

  const groups = cleaned
    .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "")
    .replace(/^y/, "")
    .match(/[aeiouy]{1,2}/g);

  return groups ? groups.length : 1;
}

export function measureReadability(text: string): Readability {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const sentences = text.split(/[.!?]+/).filter((part) => part.trim().length > 0);
  const syllables = words.reduce((total, word) => total + countSyllables(word), 0);

  const wordCount = Math.max(words.length, 1);
  const sentenceCount = Math.max(sentences.length, 1);

  const grade =
    0.39 * (wordCount / sentenceCount) + 11.8 * (syllables / wordCount) - 15.59;

  return {
    words: words.length,
    sentences: sentences.length,
    syllables,
    grade: Math.max(0, Math.round(grade * 10) / 10),
  };
}
