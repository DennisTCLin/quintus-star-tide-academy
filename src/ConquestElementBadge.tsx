import type { CSSProperties } from 'react';
import { ELEMENT_COLOR, ELEMENT_LABEL, type Element } from './conquest';
import './conquest-elements.css';
const SIGILS: Record<Element, string> = { metal: '◇', wood: '❧', water: '≋', fire: '♨', earth: '▱' };
export default function ConquestElementBadge({ element }: { element: Element }) {
  return <span className="cq-element-badge" data-element={element} style={{ '--island-element': ELEMENT_COLOR[element] } as CSSProperties}><i aria-hidden="true">{SIGILS[element]}</i>{ELEMENT_LABEL[element]}之島</span>;
}
