import { describe, expect, it } from 'vitest';
import { placeHealthLabels, type HealthAnchor } from '../conquest-health-labels';

describe('readable battle health labels', () => {
  const assertVisibleAndSeparate = (anchors: HealthAnchor[], width: number, height: number, labelWidth = 66) => {
    const labels = placeHealthLabels(anchors, width, height, labelWidth);
    expect(labels.map(l => l.key).sort()).toEqual(anchors.map(a => a.key).sort());
    for (const [i, label] of labels.entries()) {
      expect(label.left).toBeGreaterThanOrEqual(0);
      expect(label.top).toBeGreaterThanOrEqual(0);
      expect(label.left + labelWidth).toBeLessThanOrEqual(width);
      expect(label.top + 26).toBeLessThanOrEqual(height);
      for (const other of labels.slice(i + 1)) {
        expect(label.left + labelWidth <= other.left || other.left + labelWidth <= label.left || label.top + 26 <= other.top || other.top + 26 <= label.top).toBe(true);
      }
    }
  };
  it('keeps ten full-sized labels separate during a melee pile-up in portrait and landscape', () => {
    for (const [width, height] of [[302, 440], [374, 540], [472, 180], [610, 230]]) {
      assertVisibleAndSeparate(Array.from({ length: 10 }, (_, i) => ({ key: String(i), x: width / 2 + i % 2, y: height / 2 })), width, height);
    }
  });
  it('also fits the wider labels needed for four- and five-digit HP', () => {
    for (const labelWidth of [84, 100]) assertVisibleAndSeparate(Array.from({ length: 10 }, (_, i) => ({ key: String(i), x: 150, y: 140 })), 302, 220, labelWidth);
  });
  it('keeps labels inside all four edges without losing their unit identity', () => {
    const anchors = [[0,0],[301,0],[0,439],[301,439],[150,1],[150,439]].map(([x,y], i) => ({ key: String(i), x, y }));
    assertVisibleAndSeparate(anchors, 302, 440);
  });
  it('is deterministic across incoming roster order and does not mutate anchors', () => {
    const anchors = ['c','a','b'].map(key => ({ key, x: 150, y: 180 }));
    const before = JSON.stringify(anchors);
    expect(placeHealthLabels(anchors, 302, 440)).toEqual(placeHealthLabels([...anchors].reverse(), 302, 440));
    expect(JSON.stringify(anchors)).toBe(before);
  });
});
