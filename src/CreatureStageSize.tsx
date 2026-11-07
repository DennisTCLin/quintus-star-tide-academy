import type { CSSProperties, ReactNode } from 'react';
import { creatureStageScale } from './creature-body';

/** A separate layer keeps attack, facing and reduced-motion transforms intact. */
export default function CreatureStageSize({ id, children }: { id: string; children: ReactNode }) {
  return <div className="creature-stage-size" data-body-species={id} style={{ '--creature-stage-scale': creatureStageScale(id) } as CSSProperties}>{children}</div>;
}
