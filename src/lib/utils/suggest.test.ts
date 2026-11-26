import { describe, expect, it } from 'vitest';

import { levenshtein, suggest } from './suggest';

describe('levenshtein', () => {
  it('counts edits', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3);
    expect(levenshtein('', 'abc')).toBe(3);
    expect(levenshtein('get', 'get')).toBe(0);
  });
});

describe('suggest', () => {
  it('finds the closest candidate within two edits', () => {
    expect(suggest('gt', ['get', 'describe'])).toBe('get');
    expect(suggest('descrbe', ['get', 'describe'])).toBe('describe');
  });

  it('returns nothing when no candidate is close', () => {
    expect(suggest('xyz', ['get'])).toBeUndefined();
    expect(suggest('', ['get'])).toBeUndefined();
  });

  it('ignores an exact match and case', () => {
    expect(suggest('GET', ['get'])).toBeUndefined();
    expect(suggest('Gte', ['get'])).toBe('get');
  });

  it('breaks ties with the first candidate', () => {
    expect(suggest('bat', ['cat', 'hat'])).toBe('cat');
  });
});
