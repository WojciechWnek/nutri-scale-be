import { FuzzyMatcher } from '../utils/fuzzy-matcher.util';

describe('FuzzyMatcher', () => {
  let matcher: FuzzyMatcher;
  const items = ['apple', 'banana', 'orange', 'grape', 'pineapple'];

  beforeEach(() => {
    matcher = new FuzzyMatcher(items);
  });

  describe('findBestMatch', () => {
    it('should return exact match for identical query', () => {
      const result = matcher.findBestMatch('apple');
      expect(result).not.toBeNull();
      expect(result?.item).toBe('apple');
      expect(result?.score).toBe(0);
      expect(result?.matches).toBe(true);
    });

    it('should return match for case-insensitive query', () => {
      const result = matcher.findBestMatch('APPLE');
      expect(result).not.toBeNull();
      expect(result?.item).toBe('apple');
      expect(result?.matches).toBe(true);
    });

    it('should return fuzzy match for similar query', () => {
      const result = matcher.findBestMatch('aple');
      expect(result).not.toBeNull();
      expect(result?.item).toBe('apple');
      expect(result?.matches).toBe(true);
    });

    it('should return null for query below threshold', () => {
      const matcherStrict = new FuzzyMatcher(items, 0.1);
      const result = matcherStrict.findBestMatch('xyz');
      expect(result).toBeNull();
    });

    it('should return null for non-matching query', () => {
      const result = matcher.findBestMatch('keyboard');
      expect(result).toBeNull();
    });

    it('should find partial matches', () => {
      const result = matcher.findBestMatch('pin');
      expect(result).not.toBeNull();
      expect(result?.item).toBe('pineapple');
      expect(result?.matches).toBe(true);
    });
  });

  describe('hasMatch', () => {
    it('should return true for exact match', () => {
      expect(matcher.hasMatch('apple')).toBe(true);
    });

    it('should return true for fuzzy match', () => {
      expect(matcher.hasMatch('bnana')).toBe(true);
    });

    it('should return false for no match', () => {
      expect(matcher.hasMatch('abcdef')).toBe(false);
    });
  });

  describe('updateItems', () => {
    it('should update searchable items', () => {
      matcher.updateItems(['cat', 'dog', 'mouse']);
      expect(matcher.findBestMatch('cat')?.item).toBe('cat');
      expect(matcher.findBestMatch('apple')).toBeNull();
    });
  });

  describe('threshold behavior', () => {
    it('should use custom threshold', () => {
      const matcherLowThreshold = new FuzzyMatcher(items, 0.5);
      const result = matcherLowThreshold.findBestMatch('oragne');
      expect(result?.item).toBe('orange');
    });
  });
});
