import { resetFamilyScroll } from './family-scroll';
import QuestionFigure,{useQuestionFigure} from './QuestionFigure';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import StudyBattle, { useStudyBattle } from './StudyBattle';
import type { PublicQuestion } from './cloud';
import type { StudySession, studySummary } from './study-review';
import type { Grade, Course } from './learning';
import { COURSES } from './course-catalog';
import { SKILL_NAMES } from './learning-catalog';
import QuestionPrompt from './QuestionPrompt';
import ChoiceView from './ChoiceView';
import AnswerOption from './AnswerOption';
import { questionSpeech } from './speech-text';
import { canListenToEnglishChoices } from './english-choice-listening';
import { playRecording, speak, stopVoice } from './voice';
import './study-review.css';

type Summary = ReturnType<typeof studySummary>;
export function StudySummary({ summary, name, grade }: { summary?: Summary; name: string; grade: Grade }) {
  return <section className="f-panel study-summary"><h2>{name}的複習摘要</h2>
    <p>依更新後每天每題的第一次作答統計；提示後答對不列入獨立答對。{grade === 1 && '數學島的示範與闖關另計，未包含在本摘要。'}</p>
    <dl><div><dt>不用提示的正確率</dt><dd>{summary?.accuracy == null ? '尚無紀錄' : `${summary.accuracy}%`}</dd></div>
      <div><dt>獨立作答</dt><dd>{summary?.correct ?? 0} / {summary?.independent ?? 0} 題次</dd></div>
      <div><dt>今日到期</dt><dd>{summary?.due ?? 0} 題</dd></div><div><dt>跨日再次答對</dt><dd>{summary?.crossDay ?? 0} 題次</dd></div></dl>
    {Boolean(summary?.held)&&<p>另有 {summary?.held} 題的內容或學習證據待確認，作答紀錄仍保留。</p>}<h3>值得再練的能力</h3>{summary?.weak.length ? <ul>{summary.weak.map(x => <li key={x.skill}>{SKILL_NAMES[x.skill] ?? COURSES[grade].find(c => c.id === x.course)?.name}：{x.correct} / {x.attempts} 次獨立答對、{x.assisted} 次使用提示</li>)}</ul> : <p>目前沒有足夠紀錄判定弱項；每項至少累積三次作答（含使用提示）。</p>}
    <p className="f-muted">第一次獨立答對後隔 1 天，再次跨日答對後隔 3 天、7 天複習。舊精熟紀錄保留，沒有日期的舊題不列為逾期。</p>
  </section>;
}
export function StudyEntry({ summary, session, disabled, onStart, onFinish }: { summary?: Summary; session?: StudySession | null; disabled: boolean; onStart: (mode: StudySession['mode']) => void; onFinish: () => void }) {
  const resume = session && session.status !== 'complete';
  return <section className="f-panel study-entry"><h2>🧭 自動領航</h2><div className="f-actions">
    <button className="f-primary" disabled={disabled} onClick={() => onStart(resume ? session.mode : 'learn')}>{resume ? '▶ 繼續' : '▶ 開始'}</button>
    <details><summary>複習</summary><div className="f-actions"><button disabled={disabled} onClick={() => onStart('due')}>到期 · {summary?.due ?? 0}</button><button disabled={disabled} onClick={() => onStart('mistakes')}>再練練 · {summary?.mistakes ?? 0}</button><button disabled={disabled} onClick={() => onStart('all')}>自由複習</button>{resume&&<button disabled={disabled} onClick={onFinish}>結束這組</button>}</div></details>
  </div></section>;
}
export default function StudyReview({ lesson, session: r, question: q, grade, busy, online, companion, opponent, reduced, onCommand, onStart, onHome, onCourse, onChallenge, onError }: {
  lesson?:ReturnType<typeof import('./study-review').publicLearningLesson>;
  session?: StudySession | null; question?: PublicQuestion; grade: Grade; busy: boolean; online: boolean;
  companion: string; opponent?: string; reduced: boolean;
  onCommand: (type: string, extra?: Record<string, unknown>) => Promise<unknown>;
  onStart: (mode: StudySession['mode'], course?: Course) => void; onHome: () => void; onCourse: () => void;
  onChallenge: (course: Course) => void; onError: (message: string) => void;
}) {
  const figure=useQuestionFigure(q), lessonFigure=useQuestionFigure(lesson?.example);
  const battle = useStudyBattle(r, companion, reduced);
  const [heard, setHeard] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const key = `${r?.id}:${r?.index}:${r?.phase}`;
  useEffect(() => { setHeard(''); stopVoice(); heading.current?.focus(); resetFamilyScroll(); return stopVoice; }, [key]);
  const locked=busy||!online;
  const act=(type:string,extra:Record<string,unknown>={})=>onCommand(type,{sessionId:r!.id,...(type==='review-pause'||type==='review-finish'?{}:{index:r!.index}),...extra});
  const rest=async()=>{stopVoice();if(!r||r.status==='complete'||await act('review-pause'))onHome();};
  const chrome=<header className="pilot-header"><span>🧭 {r?.mode==='learn'?'自動領航':'複習'}</span>{r&&<span className="pilot-steps" aria-label={`第 ${r.index+1} 題，共 ${r.questions.length} 題`}>{r.questions.map((_,i)=><i key={i} className={i<r.index||i===r.index&&r.settled?'done':i===r.index?'current':''}/>)}</span>}<button className="pilot-rest" aria-label="休息，保留進度" disabled={locked} onClick={()=>void rest()}>⏸</button></header>;
  const frame = (content: ReactNode) => <section className="f-panel study-session pilot-session" aria-label={r?.mode==='learn'?'領航題目':'複習題目'}>{chrome}
    <StudyBattle session={r} companion={companion} opponent={opponent} reduced={reduced} motion={battle.motion} onSkip={battle.skip} />
    <div className="pilot-controls">{content}</div>
  </section>;
  if(!r)return frame(<><h1 ref={heading} tabIndex={-1}>去哪一座島？</h1><div className="pilot-courses">{COURSES[grade].map(c=><button className="f-primary" key={c.id} disabled={locked} onClick={()=>onStart('learn',c.id)}>{c.name}</button>)}</div></>);
  if(r.status==='paused'||r.phase==='scope')return frame(<><h1 ref={heading} tabIndex={-1}>接著玩</h1><button className="f-primary" disabled={locked} onClick={()=>onStart(r.mode,r.course)}>▶ 繼續</button></>);
  if(r.mode==='learn'&&r.phase==='lesson')return frame(<>
    <div className="pilot-heading"><h1 ref={heading} tabIndex={-1}>一起看</h1><button aria-label="聽示範" disabled={locked} onClick={()=>speak([lesson?.example?.prompt,lesson?.example?.options[lesson.example.answer]?.text,lesson?.example?.explanation??lesson?.lesson].filter(Boolean).join('。'),onError)}>🔊 聽</button></div>
    {lesson?.example&&<div className="pilot-example"><QuestionPrompt question={lesson.example} grade={grade}/>{lesson.example.visual&&<p className="math-visual">{lesson.example.visual}</p>}<QuestionFigure question={lesson.example} onReady={lessonFigure.onReady}/>
      {lesson.example.audio&&<button aria-label="聽示範題的聲音" onClick={()=>playRecording(lesson.example!.audio!,lesson.example!.end,()=>{},onError)}>👂 聽聲音</button>}
      <p className="pilot-solution">→ <ChoiceView choice={lesson.example.options[lesson.example.answer]} grade={grade}/></p><p>{lesson.example.explanation}</p></div>}
    <div className="pilot-next"><button className="f-primary" disabled={locked||!lessonFigure.ready} onClick={()=>void act('learning-lesson',{done:true})}>▶ 換我試試</button></div>
  </>);
  if(!q)return frame(<p role="status">正在同步題目…</p>);
  const needsAudio=grade<=2&&!!q.audio;
  const listen=()=>q.audio?playRecording(q.audio,q.end,()=>setHeard(key),onError):speak(questionSpeech({...q,grade}),onError,q.course==='english'?'en-US':'zh-TW');
  return frame(<>
    <div className="pilot-heading"><span className="study-eyebrow">{r.mode==='learn'?(r.assisted?'練一練':'探路'):'複習'} · {r.index+1} / {r.questions.length}</span><button data-read-aloud aria-label="聽題目" disabled={locked} onClick={listen}>👂 聽 {heard===key?'✓':''}</button></div>
    <h1 ref={heading} tabIndex={-1}><QuestionPrompt question={q} grade={grade}/></h1>
    {q.visual&&<p className="math-visual" data-learning-content>{q.visual}</p>}<QuestionFigure question={q} onReady={figure.onReady}/>
    {needsAudio&&heard!==key&&!r.settled&&<p className="pilot-audio-cue">👆 先聽，再選</p>}
    <div className="answer-grid">{q.options.map((option,i)=><AnswerOption key={i} disabled={locked||!figure.ready||r.status!=='active'||r.settled||needsAudio&&heard!==key} className={r.settled&&i===q.answer?'correct':''} label={`選擇 ${i+1}：${option.text}`} listening={canListenToEnglishChoices(grade,q)?{text:option.text,disabled:locked||r.settled,play:()=>speak(option.text,onError,'en-US'),stop:stopVoice}:undefined} onAnswer={()=>{stopVoice();void act('review-answer',{choice:i});}}>
      <ChoiceView choice={option} grade={grade} hideReadingHints={q.hideReadingHints} pictureOnly={grade===1&&q.course==='words'}/>
    </AnswerOption>)}</div>
    {!r.settled&&<div className="pilot-help">{r.mode==='learn'?<button disabled={locked} onClick={()=>{stopVoice();void act('learning-lesson',{done:false});}}>💡 教我</button>:<button disabled={locked||r.assisted} onClick={()=>void act('review-hint')}>💡 提示</button>}<span>♡ 不扣血 · 不計時</span></div>}
    {r.assisted&&!r.settled&&r.mode!=='learn'&&<p className="hint-box">{q.hint}</p>}
    {r.settled&&<div className="answer-explanation" role="status"><div className="pilot-heading"><h2>{r.answers[r.index]?'✓ 答對了':'一起看解法'}</h2><button aria-label="聽解法" onClick={()=>speak(q.explanation??'',onError,q.course==='english'?'en-US':'zh-TW')}>🔊 聽</button></div>
      {!r.answers[r.index]&&q.answer!==undefined&&<p>→ <ChoiceView choice={q.options[q.answer]} grade={grade} hideReadingHints={q.hideReadingHints}/></p>}
      <p>{q.explanation}</p>{q.target&&<ChoiceView choice={q.target} grade={grade}/>}</div>}
    {r.status==='complete'?<div className="pilot-next study-complete"><button className="f-primary" disabled={locked||!!battle.motion} onClick={()=>r.mode==='learn'&&lesson?.challengeReady&&r.course?onChallenge(r.course):onStart(r.mode==='learn'?'learn':'all',r.course)}>{r.mode==='learn'&&lesson?.challengeReady?'⚔ 出發挑戰':'▶ 繼續'}</button><button disabled={locked} onClick={onCourse}>🗺 換島</button></div>
      :r.settled&&<div className="pilot-next"><button className="f-primary" disabled={locked||!!battle.motion} onClick={()=>{stopVoice();void act('review-next');}}>▶ 下一步</button></div>}
  </>);
}
