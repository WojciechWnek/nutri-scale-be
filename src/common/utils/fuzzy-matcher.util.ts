import Fuse from 'fuse.js';

export interface FuzzyMatchResult {
  item: string;
  score: number;
  matches: boolean;
}

export class FuzzyMatcher {
  private fuse: Fuse<string>;
  private readonly threshold: number;

  constructor(items: string[], threshold: number = 0.3) {
    this.threshold = threshold;
    this.fuse = new Fuse(items, {
      threshold,
      includeScore: true,
      keys: [], // For string array
    });
  }

  /**
   * Finds the best match for a query string
   * @param query The string to search for
   * @returns Best match or null if no match found
   */
  findBestMatch(query: string): FuzzyMatchResult | null {
    const results = this.fuse.search(query);

    if (results.length === 0) {
      return null;
    }

    const bestMatch = results[0];
    const score = bestMatch.score ?? 1;

    // If score is below threshold, it's a good match
    // Note: In Fuse.js, lower score = better match (0 = perfect, 1 = no match)
    if (score <= this.threshold) {
      return {
        item: bestMatch.item,
        score: score,
        matches: true,
      };
    }

    return null;
  }

  /**
   * Checks if a query matches any item above threshold
   */
  hasMatch(query: string): boolean {
    return this.findBestMatch(query) !== null;
  }

  /**
   * Updates the searchable items
   */
  updateItems(items: string[]) {
    this.fuse = new Fuse(items, {
      threshold: this.threshold,
      includeScore: true,
    });
  }
}
