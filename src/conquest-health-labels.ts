export type HealthAnchor = { key: string; x: number; y: number };
export type HealthLabel = HealthAnchor & { left: number; top: number };

/** Keep pixel-sized labels readable, inside the canvas, and apart during attacks. */
export function placeHealthLabels(anchors: readonly HealthAnchor[], width: number, height: number, labelWidth = 66, labelHeight = 26): HealthLabel[] {
  const edge = 3, gap = 3, maxX = Math.max(edge, width - labelWidth - edge), maxY = Math.max(edge, height - labelHeight - edge);
  const clamp = (n: number, max: number) => Math.max(edge, Math.min(max, n));
  const placed: HealthLabel[] = [];
  const ordered = [...anchors].sort((a, b) => a.y - b.y || a.x - b.x || a.key.localeCompare(b.key));
  for (const anchor of ordered) {
    const left = clamp(anchor.x - labelWidth / 2, maxX), top = clamp(anchor.y - labelHeight, maxY);
    const candidates = [{ left, top }];
    // Prefer a nearby vertical stagger. The grid provides a bounded fallback for a melee pile-up.
    for (let dy = labelHeight + gap; dy < height; dy += labelHeight + gap) {
      candidates.push({ left, top: clamp(top - dy, maxY) }, { left, top: clamp(top + dy, maxY) });
    }
    for (let y = edge; y <= maxY; y += labelHeight + gap) for (let x = edge; x <= maxX; x += labelWidth + gap) candidates.push({ left: x, top: y });
    const distance = (p: { left: number; top: number }) => (p.left - left) ** 2 + (p.top - top) ** 2;
    candidates.sort((a, b) => distance(a) - distance(b));
    const position = candidates.find(p => placed.every(other => p.left + labelWidth + gap <= other.left || other.left + labelWidth + gap <= p.left || p.top + labelHeight + gap <= other.top || other.top + labelHeight + gap <= p.top));
    if (!position) {
      // Free placement can fragment the available space. Reflow the whole cluster
      // onto disjoint slots instead of letting the last few labels overlap.
      const slots: { left: number; top: number }[] = [];
      for (let y = edge; y <= maxY; y += labelHeight + gap) for (let x = edge; x <= maxX; x += labelWidth + gap) slots.push({ left: x, top: y });
      if (slots.length >= ordered.length) return ordered.map(a => {
        const cost = (p: { left: number; top: number }) => (p.left + labelWidth / 2 - a.x) ** 2 + (p.top + labelHeight - a.y) ** 2;
        slots.sort((a, b) => cost(a) - cost(b));
        return { ...a, ...slots.shift()! };
      });
    }
    placed.push({ ...anchor, ...(position ?? { left, top }) });
  }
  return placed;
}
