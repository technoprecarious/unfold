/**
 * Fuzzy matcher for forgiving command matching
 */

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Find the closest match from a list of options
 */
export function findClosestMatch(
  input: string,
  options: string[],
  threshold: number = 3
): string | null {
  let closest: string | null = null;
  let minDistance = Infinity;

  const lowerInput = input.toLowerCase();

  for (const option of options) {
    const lowerOption = option.toLowerCase();
    const distance = levenshteinDistance(lowerInput, lowerOption);

    if (distance < minDistance && distance <= threshold) {
      minDistance = distance;
      closest = option;
    }
  }

  return closest;
}

/**
 * Get suggestions for a misspelled command
 */
export function getSuggestions(
  input: string,
  validCommands: string[]
): string[] {
  const suggestions: string[] = [];
  const lowerInput = input.toLowerCase();

  for (const cmd of validCommands) {
    const distance = levenshteinDistance(lowerInput, cmd.toLowerCase());
    if (distance <= 2) {
      suggestions.push(cmd);
    }
  }

  return suggestions.sort((a, b) => {
    const distA = levenshteinDistance(lowerInput, a.toLowerCase());
    const distB = levenshteinDistance(lowerInput, b.toLowerCase());
    return distA - distB;
  }).slice(0, 3);
}

/**
 * Check if input is a close match to any valid option
 */
export function isFuzzyMatch(
  input: string,
  options: string[],
  threshold: number = 2
): boolean {
  return findClosestMatch(input, options, threshold) !== null;
}
