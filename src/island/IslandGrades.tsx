import { MATH_GRADES, MATH_UNIT_COUNT, gradeName, type MathGrade } from './curriculum';
import { cancelSpeech } from './speech';
import './curriculum.css';
export function IslandGrades({grade,onChange}:{grade:MathGrade;onChange:(grade:MathGrade)=>void}) {
  return <section className="isl-grade-picker" aria-label="數學年級">
    <div className="isl-curriculum-heading"><h2>先選年級</h2><span>一到六年級・{MATH_UNIT_COUNT} 個單元</span></div>
    <div className="isl-grade-buttons" role="group" aria-label="選擇年級">{MATH_GRADES.map(g=><button key={g} className="isl-btn ghost" aria-pressed={grade===g} onClick={()=>{cancelSpeech();onChange(g);}}>{gradeName(g)}</button>)}</div>
  </section>;
}
