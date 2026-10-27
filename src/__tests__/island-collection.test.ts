import { Children, createElement, isValidElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import IslandCollectionPreview from '../IslandCollectionPreview';
import { islandCollection, type CollectionProfile } from '../island-collection';
import { SUBJECT_ISLANDS } from '../subject-islands';
import { chooseMonster, MONSTER_CATALOG } from '../monsters';
import { xpForLevel } from '../companion-growth';
const profile = (xp = 0, owned: Record<string, number> = {}): CollectionProfile => ({ equipped: 'sss-test', owned, growth: { xp: { 'sss-test': xp }, day: '', credited: [] } });
function elements(node: ReactNode, type: string): any[] {
  return Children.toArray(node).flatMap(child => isValidElement<{children?: ReactNode}>(child)
    ? [...(child.type === type ? [child] : []), ...elements(child.props.children, type)] : []);
}
describe('island companion preview', () => {
  it('lists only released recruitable species of the island element at every grade', () => {
    for (const island of SUBJECT_ISLANDS) {
      const c = islandCollection(island, profile());
      const count=['金','木','水'].includes(island.element)?26:16;
      expect(c.entries).toHaveLength(count);
      expect(new Set(c.entries.map(e => e.monster.id)).size).toBe(count);
      expect(c.entries.every(e => e.monster.element === island.element && MONSTER_CATALOG.includes(e.monster))).toBe(true);
      for (const grade of [1,2,4] as const) {
        const html = renderToStaticMarkup(createElement(IslandCollectionPreview,{island, profile:profile(), grade, onSpeak:()=>{}}));
        expect(html).toContain(`${island.name}可收集的夥伴`);
        expect((html.match(/<details/g) ?? []).length).toBe(1);
        expect(html).not.toMatch(/<details[^>]*\sopen/);
        for (const e of c.entries) expect(html).toContain((e.monster.thumbnail ?? e.monster.image).replace(/&/g,'&amp;'));
      }
    }
  });
  it('matches actual encounter eligibility at the practice boundary, regardless of native rarity', () => {
    for (const island of SUBJECT_ISLANDS) for (const xp of [0, xpForLevel(5)-1, xpForLevel(5), xpForLevel(8)]) {
      const c = islandCollection(island, profile(xp));
      const wardens=['金','木','水'].includes(island.element)?18:8;
      expect(c.current).toHaveLength(xp<xpForLevel(5)?8:wardens); expect(c.other).toHaveLength(xp<xpForLevel(5)?wardens:8);
      expect(c.current.every(e => e.monster.form === (xp < xpForLevel(5) ? 'scout' : 'warden'))).toBe(true);
      for (let seed=0;seed<24;seed++) for (const previous of [undefined,0,1,2]) {
        const encountered=chooseMonster(c.level,seed,previous,island.element);
        expect(c.current.some(e => e.monster.id===encountered.id)).toBe(true);
      }
    }
  });
  it('counts distinct positive holdings and immediately follows player and companion changes', () => {
    const island=SUBJECT_ISLANDS[1], ids=islandCollection(island,profile()).entries.map(e=>e.monster.id);
    const p=profile(0,{[ids[0]]:7,[ids[1]]:0,[ids[2]]:1,'cloud-scout-fire':2});
    const before=structuredClone(p);
    expect(islandCollection(island,p).collected).toBe(2);
    expect(islandCollection(island,profile()).collected).toBe(0);
    expect(islandCollection(island,profile()).entries.every(e=>!e.owned)).toBe(true);
    expect(islandCollection(island,{...p,equipped:'trained',growth:{...p.growth,xp:{trained:xpForLevel(5)}}}).current.every(e=>e.monster.form==='warden')).toBe(true);
    expect(p).toEqual(before);
  });
  it('provides recognizable art and text statuses, native keyboard expansion and narration without starting a journey', () => {
    const island=SUBJECT_ISLANDS[0], p=profile(0,{'cloud-scout-metal':2}), onSpeak=vi.fn();
    const tree=IslandCollectionPreview({island,profile:p,grade:4,onSpeak});
    const html=renderToStaticMarkup(tree), buttons=elements(tree,'button');
    expect(buttons).toHaveLength(1);
    buttons[0].props.onClick(); expect(onSpeak).toHaveBeenCalledWith(expect.stringContaining('可以收集26種夥伴')); expect(onSpeak).toHaveBeenCalledWith(expect.stringContaining('金羽雲靈，有了'));
    const strip=elements(tree,'ul').find(e=>e.props.className==='island-collection-strip');
    expect(elements(strip,'img')).toHaveLength(3);
    expect(html).toContain('金羽雲靈，有了');expect(html).toContain('銀鰓靈螈，還沒');
    expect(elements(tree,'summary')).toHaveLength(1);
    expect(elements(elements(tree,'summary')[0],'button')).toHaveLength(0);
    expect(html).not.toContain('disabled');
  });
  it('uses plain text for grade two and explains other stages truthfully in both directions', () => {
    const render=(xp:number,grade:1|2|4)=>renderToStaticMarkup(createElement(IslandCollectionPreview,{island:SUBJECT_ISLANDS[0],profile:profile(xp),grade,onSpeak:()=>{}}));
    expect(render(0,2)).not.toContain('<rt>');
    expect(render(0,4)).toContain('同行夥伴再練習提升 4 級');
    expect(render(xpForLevel(4),4)).toContain('同行夥伴再練習提升 1 級');
    expect(render(xpForLevel(5),4)).toContain('換成剛開始練習的同行夥伴');
    expect(render(xpForLevel(5),4)).not.toContain('解鎖');
  });
});
