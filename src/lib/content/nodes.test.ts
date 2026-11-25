import { describe, expect, it } from 'vitest';

import { nodeLabels } from './nodes';

describe('nodeLabels', () => {
  it('names each node after the org of its experience entries', () => {
    const labels = nodeLabels(
      [
        { id: 'capgemini', data: { node: 'capgemini', org: 'Capgemini' } },
        { id: 'ta', data: { node: 'northeastern', org: 'Northeastern University' } },
      ],
      [{ id: 'mumbai', data: { node: 'mumbai', school: 'University of Mumbai' } }],
    );
    expect(labels.get('capgemini')).toBe('Capgemini');
    expect(labels.get('northeastern')).toBe('Northeastern University');
    expect(labels.get('mumbai')).toBe('University of Mumbai');
  });

  it('prefers the experience org when a node is declared twice, and skips nodeless degrees', () => {
    const labels = nodeLabels(
      [{ id: 'ta', data: { node: 'neu', org: 'Northeastern University' } }],
      [
        { id: 'ms', data: { node: 'neu', school: 'Northeastern (College of Engineering)' } },
        { id: 'other', data: { school: 'Somewhere' } },
      ],
    );
    expect(labels.get('neu')).toBe('Northeastern University');
    expect([...labels.keys()]).toEqual(['neu']);
  });
});
