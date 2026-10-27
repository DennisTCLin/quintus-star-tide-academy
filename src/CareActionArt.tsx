import { useState, type CSSProperties } from 'react';
import { CARE_ACTIONS, CARE_ICON_ATLAS, type CareAction } from './tideglow-companion';

/** One cached atlas keeps the six Higgsfield illustrations light on tablets. */
export default function CareActionArt({ action }: { action: CareAction }) {
  const [failed, setFailed] = useState(false);
  const index = CARE_ACTIONS.findIndex(item => item.id === action);
  return <span className="tide-care-art" aria-hidden="true" style={{ '--art-x': `${-(index % 3) * 100}%`, '--art-y': `${-Math.floor(index / 3) * 100}%` } as CSSProperties}>
    {failed ? <span className="tide-care-art-fallback">{CARE_ACTIONS[index].fallback}</span> : <img src={CARE_ICON_ATLAS} width="1536" height="1024" alt="" decoding="async" onError={() => setFailed(true)} />}
  </span>;
}
