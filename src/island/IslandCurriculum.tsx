import { useEffect, useRef, useState, type ReactNode } from 'react';
import { MATH_GRADES, MATH_UNIT_COUNT, curriculumBook, curriculumSpeech, gradeName, type MathGrade, type MathTerm } from './curriculum';
import { cancelSpeech, speakOnDemand } from './speech';
import { IslandIcon } from './IslandNavigation';
import './curriculum.css';
import { IslandAbility } from './IslandAbility';
import type { CloudIsland } from './schema';

/** The recovered curriculum is a content inventory, separate from scored activities. */
export function IslandCurriculum({ children, hasActiveRun, onResume, progress, onEnterUnit }: {
  children: ReactNode; hasActiveRun: boolean; onResume: () => void; progress?:CloudIsland; onEnterUnit?:(unit:string)=>void;
}) {
  const [grade, setGrade] = useState<MathGrade>(1);
  const [term, setTerm] = useState<MathTerm>('上');
  const [unitId, setUnitId] = useState<string | null>(null);
  const [speechError, setSpeechError] = useState('');
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const unitButtons = useRef(new Map<string, HTMLButtonElement>());
  const returnFocus = useRef<string | null>(null);
  const book = curriculumBook(grade, term);
  const unit = book.units.find(u => u.id === unitId);
  const yearCount = curriculumBook(grade, '上').units.length + curriculumBook(grade, '下').units.length;
  useEffect(() => () => cancelSpeech(), []);
  useEffect(() => {
    if (unitId) detailHeading.current?.focus();
    else if (returnFocus.current) { unitButtons.current.get(returnFocus.current)?.focus(); returnFocus.current=null; }
  }, [unitId]);
  function chooseGrade(next: MathGrade) {
    cancelSpeech(); setSpeechError(''); setGrade(next); setTerm('上'); setUnitId(null);
  }
  function backToUnits() {
    cancelSpeech(); setSpeechError(''); returnFocus.current=unitId; setUnitId(null);
  }
  return <div className="isl-curriculum">
    <section className="isl-grade-picker" aria-label="數學年級">
      <div className="isl-curriculum-heading"><h2>先選年級</h2><span>一到六年級・{MATH_UNIT_COUNT} 個單元</span></div>
      <div className="isl-grade-buttons" role="group" aria-label="選擇年級">
        {MATH_GRADES.map(g => <button key={g} className="isl-btn ghost" aria-pressed={grade === g} onClick={() => chooseGrade(g)}>{gradeName(g)}</button>)}
      </div>
    </section>
    {grade === 1 ? children : <section className="isl-curriculum-content" aria-label={`${gradeName(grade)}數學課程`}>
      <div className="isl-curriculum-heading"><h2>{gradeName(grade)}數學</h2><span>上下學期・{yearCount} 個單元</span></div>
      {hasActiveRun && <button className="isl-btn ghost isl-curriculum-resume" onClick={onResume}><IslandIcon name="flag"/>繼續剛才的挑戰</button>}
      <p className="isl-content-note">查看單元的學習重點，再進入小島看示範、動手練習。</p>
      {unit ? <article className="isl-panel isl-curriculum-detail">
        <button className="isl-link" onClick={backToUnits}>← 回到{term}學期單元</button>
        <p className="isl-curriculum-location">{gradeName(grade)} › {term}學期 › 第 {unit.unit} 單元</p>
        <h3 ref={detailHeading} tabIndex={-1}>{unit.title}</h3>
        <button className="isl-btn ghost" onClick={() => { setSpeechError(''); speakOnDemand(curriculumSpeech(grade,term,unit),setSpeechError); }}><IslandIcon name="sound"/>聽學習重點</button>
        {speechError && <p role="status">{speechError}</p>}
        <h4>這個單元要學什麼？</h4>
        <ol className="isl-concept-list">{unit.concepts.map((concept,i) => <li key={i}><span aria-hidden="true">{i+1}</span><p>{concept}</p></li>)}</ol>
        <h4>小節順序</h4>
        <ul className="isl-section-list">{unit.sections.map(section => <li key={section}>{section}</li>)}</ul>
        {progress&&<IslandAbility progress={progress} unit={unit.id} details/>}
        {onEnterUnit&&<button className="isl-btn" onClick={()=>{cancelSpeech();onEnterUnit(unit.id);}}>進入這個單元 →</button>}
        <details className="isl-curriculum-codes"><summary>課綱對照</summary><p>{unit.codes.join('、')}</p></details>
      </article> : <>
        <div className="isl-semester-tabs" role="group" aria-label="選擇學期">
          {(['上','下'] as const).map(t => <button key={t} className="isl-btn ghost" aria-pressed={term === t} onClick={() => { cancelSpeech(); setTerm(t); }}>{t}學期 <small>{curriculumBook(grade,t).units.length} 單元</small></button>)}
        </div>
        <p className="isl-curriculum-route">{gradeName(grade)}・{term}學期・依單元順序查看學習內容</p>
        <div className="isl-curriculum-grid">{book.units.map(u => <button key={u.id} ref={el => { if(el) unitButtons.current.set(u.id,el); else unitButtons.current.delete(u.id); }}
          className="isl-curriculum-unit" onClick={() => { cancelSpeech(); setUnitId(u.id); }}>
          <span className="isl-curriculum-number">第 {u.unit} 單元</span><b className="isl-curriculum-title">{u.title}</b>
          <p>{u.sections.length} 個小節・{u.concepts.length} 個學習重點</p>
          <span className="isl-curriculum-status">課程內容已收錄</span><span className="isl-curriculum-action">查看單元 <span aria-hidden="true">→</span></span>
        </button>)}</div>
      </>}
    </section>}
  </div>;
}
