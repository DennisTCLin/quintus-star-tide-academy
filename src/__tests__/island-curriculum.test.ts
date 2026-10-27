import { describe, it, expect } from 'vitest';
import { MATH_BOOKS, MATH_GRADES, MATH_UNIT_COUNT, curriculumBook, curriculumSpeech, gradeName } from '../island/curriculum';
import { ISLAND_UNITS, GRADE_ONE_UNITS } from '../island/catalog';
import { emptyPlayer } from '../island/engine';
import { validateIsland } from '../island/schema';

describe('Recovered grade-one through grade-six math curriculum', () => {
  it('includes all twelve books and 110 unique units in semester order', () => {
    expect(MATH_BOOKS).toHaveLength(12);
    expect(MATH_UNIT_COUNT).toBe(110);
    const units=MATH_BOOKS.flatMap(book=>book.units);
    expect(new Set(units.map(u=>u.id)).size).toBe(110);
    expect(MATH_GRADES.map(grade=>['上','下'].map(term=>curriculumBook(grade,term as '上'|'下').units.length)))
      .toEqual([[9,9],[10,10],[9,9],[10,10],[10,10],[8,6]]);
    for(const book of MATH_BOOKS) for(const [i,unit] of book.units.entries()) {
      expect(unit.id).toBe(`${book.grade}${book.semester==='上'?'A':'B'}-${String(i+1).padStart(2,'0')}`);
      expect(unit.unit).toBe(i+1);
      for(const list of [unit.sections,unit.concepts,unit.codes]) {
        expect(list.length).toBeGreaterThan(0);
        expect(list.every(s=>typeof s==='string'&&s.trim().length>0)).toBe(true);
      }
    }
  });
  it('preserves grade-one identities and validates all newly playable grades without inventing progress', () => {
    expect(MATH_BOOKS.filter(b=>b.grade===1).flatMap(b=>b.units.map(u=>[u.id,u.title])))
      .toEqual(GRADE_ONE_UNITS.map(u=>[u.id,u.title]));
    expect(ISLAND_UNITS).toHaveLength(110);
    const progress=emptyPlayer();
    expect(()=>validateIsland(progress)).not.toThrow();
    expect(()=>validateIsland({...progress,units:{'6B-06':{learn:true}}})).not.toThrow();
    expect(progress.units).toEqual({});
    expect(()=>validateIsland({...progress,units:{'6B-07':{learn:true}}})).toThrow();
  });
  it('reads the selected grade, semester and all concept goals without claiming mastery', () => {
    const unit=curriculumBook(6,'下').units.at(-1)!;
    const speech=curriculumSpeech(6,'下',unit);
    expect(gradeName(6)).toBe('六年級');
    expect(speech).toContain('六年級，下學期，第6單元，角柱與圓柱');
    for(const concept of unit.concepts) expect(speech).toContain(concept);
    expect(speech).not.toMatch(/已完成|通關|精熟/);
  });
});
