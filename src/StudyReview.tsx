import { resetFamilyScroll } from './family-scroll';
import QuestionFigure,{useQuestionFigure} from './QuestionFigure';
import { useEffect, useRef, useState } from 'react';
import type { PublicQuestion } from './cloud';
import type { StudySession, studySummary } from './study-review';
import type { Grade, Course } from './learning';
import { COURSES } from './course-catalog';
import { SKILL_NAMES } from './learning-catalog';
import QuestionPrompt from './QuestionPrompt';
import ChoiceView from './ChoiceView';
import AnswerOption from './AnswerOption';
import ReadAloud from './ReadAloud';
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
    <h3>值得再練的能力</h3>{summary?.weak.length ? <ul>{summary.weak.map(x => <li key={x.skill}>{SKILL_NAMES[x.skill] ?? COURSES[grade].find(c => c.id === x.course)?.name}：{x.correct} / {x.attempts} 次獨立答對、{x.assisted} 次使用提示</li>)}</ul> : <p>目前沒有足夠紀錄判定弱項；每項至少累積三次作答（含使用提示）。</p>}
    <p className="f-muted">第一次獨立答對後隔 1 天，再次跨日答對後隔 3 天、7 天複習。舊精熟紀錄保留，沒有日期的舊題不列為逾期。</p>
  </section>;
}
export function StudyEntry({ summary, session, disabled, onStart, onFinish }: { summary?: Summary; session?: StudySession | null; disabled: boolean; onStart: (mode: StudySession['mode']) => void; onFinish: () => void }) {
  const resume = session && session.status !== 'complete';
  return <section className="f-panel study-entry"><div><h2>跟著你的步調學習</h2><p>今日到期 {summary?.due ?? 0} 題 · 待修復 {summary?.mistakes ?? 0} 題</p><p>每組最多六題，隨時休息。複習保留進度，不重複發放獎勵。</p></div>
    <div className="f-actions">{resume ? <><button className="f-primary" disabled={disabled} onClick={() => onStart(session.mode)}>接續複習 · 第 {session.index + 1} 題</button><button disabled={disabled} onClick={onFinish}>結束這組，重新選擇</button></> : <><button className="f-primary" disabled={disabled} onClick={() => onStart('learn')}>跟著我學</button><button disabled={disabled} onClick={() => onStart('due')}>今日複習</button><button disabled={disabled} onClick={() => onStart('mistakes')}>錯題修復</button><button disabled={disabled} onClick={() => onStart('all')}>自由複習</button></>}</div>
  </section>;
}
export default function StudyReview({ lesson, plan, session: r, question: q, grade, busy, online, onCommand, onStart, onHome, onCourse, onError }: {
  lesson?:ReturnType<typeof import('./study-review').publicLearningLesson>; plan?:ReturnType<typeof import('./adaptive-learning').adaptiveSummary>;
  session?: StudySession | null; question?: PublicQuestion; grade: Grade; busy: boolean; online: boolean;
  onCommand: (type: string, extra?: Record<string, unknown>) => Promise<unknown>;
  onStart: (mode: StudySession['mode'], course?: Course) => void; onHome: () => void; onCourse: () => void; onError: (message: string) => void;
}) {
  const figure=useQuestionFigure(q);
  const lessonFigure=useQuestionFigure(lesson?.example);
  const [heard, setHeard] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const key = `${r?.id}:${r?.index}`;
  useEffect(() => { setHeard(''); stopVoice(); heading.current?.focus(); resetFamilyScroll(); return stopVoice; }, [key]);
  const progressPanel=<details className="f-panel"><summary>我的學習安排</summary><p>這裡的學校進度依你的回報；答對不會自動表示學校教過。</p>{plan?.map(t=><div key={t.id}><b>{t.title}</b><p>{t.exposure==='taught'?'學校已教':t.exposure==='not-yet'?'學校還沒教':'進度待確認'} · 可挑戰 {t.ready} 題</p><button disabled={busy||!online} onClick={()=>void onCommand('learning-progress',{topic:t.id,state:'taught'})}>學校教過了</button><button disabled={busy||!online} onClick={()=>void onCommand('learning-progress',{topic:t.id,state:'not-yet'})}>還沒教</button></div>)}</details>;
  if (!r) return <section className="f-panel"><h1>依你的進度開始</h1><p>先選科目，從已教過的概念練起；不計時、不扣血。</p><div className="f-actions">{COURSES[grade].map(c=><button key={c.id} disabled={busy||!online} onClick={()=>onStart('learn',c.id)}>{c.name}</button>)}</div>{progressPanel}<button onClick={onHome}>返回港口</button></section>;
  if(r.mode==='learn'&&r.phase==='scope')return <section className="f-panel study-session"><h1>{lesson?.title}</h1><p>這個內容學校教過了嗎？先確認這一次，之後會依你的作答安排。</p><div className="f-actions">{([['taught','教過了，我先試試'],['not-yet','還沒教，換個內容'],['preview','還沒教，我想先學']] as const).map(([state,label])=><button disabled={busy||!online} key={state} onClick={()=>void onCommand('learning-scope',{sessionId:r.id,state})}>{label}</button>)}</div>{progressPanel}<button onClick={onHome}>先休息</button></section>;
  if(r.mode==='learn'&&r.phase==='lesson')return <section className="f-panel study-session"><h1>夥伴先教你：{lesson?.title}</h1><p className="hint-box">{lesson?.lesson}</p>{lesson?.example&&<div><h2>這一題需要的知識</h2><QuestionPrompt question={lesson.example} grade={grade}/>{lesson.example.visual&&<p className="math-visual">{lesson.example.visual}</p>}<QuestionFigure question={lesson.example} onReady={lessonFigure.onReady}/><p>答案：<ChoiceView choice={lesson.example.options[lesson.example.answer]} grade={grade}/></p><p>{lesson.example.explanation}</p><p>看過解法後先練一次；之後不用提示再答對，才會算獨立學會。</p></div>}<ReadAloud grade={grade}><button onClick={()=>speak([lesson?.lesson,lesson?.example?.prompt,lesson?.example?.explanation].filter(Boolean).join('。'),onError)}>聽夥伴說明</button></ReadAloud><button className="f-primary" disabled={busy||!online||!lessonFigure.ready} onClick={()=>void onCommand('learning-lesson',{sessionId:r.id,index:r.index,done:true})}>看懂了，我來練習</button><button onClick={onHome}>先休息</button></section>;
  if(!q)return <section className="f-panel"><p>正在同步學習題目…</p><button onClick={onHome}>返回港口</button></section>;
  const locked = busy || !online;
  const needsAudio = grade <= 2 && !!q.audio;
  const listen = () => q.audio ? playRecording(q.audio, q.end, () => setHeard(key), onError) : speak(questionSpeech({ ...q, grade }), onError, q.course === 'english' ? 'en-US' : 'zh-TW');
  const act = (type: string, extra: Record<string, unknown> = {}) => onCommand(type, { sessionId: r.id, ...(type === 'review-pause' || type === 'review-finish' ? {} : { index: r.index }), ...extra });
  return <section className="f-panel study-session" aria-label="複習題目">
    {r.status === 'paused' && <button className="f-primary" disabled={locked} onClick={() => onStart(r.mode)}>接續這組</button>}
    <p className="study-eyebrow">{r.mode==='learn'?'跟著我學':r.mode === 'mistakes' ? '錯題修復' : r.mode === 'due' ? '今日複習' : '自由複習'} · {r.index + 1} / {r.questions.length}{r.retries.includes(r.index) && ' · 間隔後的原題重試'}</p>
    <h1 ref={heading} tabIndex={-1}><QuestionPrompt question={q} grade={grade} /></h1>
    {q.visual && <p className="math-visual" data-learning-content>{q.visual}</p>}
    <QuestionFigure question={q} onReady={figure.onReady} />
    <ReadAloud grade={grade}><button data-read-aloud disabled={locked} onClick={listen}>👂 聽題目 {heard === key ? '✓' : ''}</button></ReadAloud>
    {needsAudio && heard !== key && !r.settled && <p>先聽完題目，再選答案。</p>}
    <div className="answer-grid">{q.options.map((option, i) => <AnswerOption key={i} disabled={locked || !figure.ready || r.status !== 'active' || r.settled || (needsAudio && heard !== key)} className={r.settled && i === q.answer ? 'correct' : ''} label={`選擇 ${i + 1}：${option.text}`} listening={canListenToEnglishChoices(grade, q) ? { text: option.text, disabled: locked || r.settled, play: () => speak(option.text, onError, 'en-US'), stop: stopVoice } : undefined} onAnswer={() => { stopVoice(); void act('review-answer', { choice: i }); }}>
      <ChoiceView choice={option} grade={grade} hideReadingHints={q.hideReadingHints} pictureOnly={grade === 1 && q.course === 'words'} />
    </AnswerOption>)}</div>
    {r.mode==='learn'&&!r.settled&&<div className="f-actions"><button disabled={locked} onClick={()=>void onCommand('learning-lesson',{sessionId:r.id,index:r.index,done:false})}>我還不會，先教我</button><button disabled={locked} onClick={async()=>{await onCommand('learning-progress',{topic:r.topic,state:'not-yet'});if(await act('review-finish'))onStart('learn',r.course);}}>學校還沒教，換一題</button></div>}
    {!r.settled && <button disabled={locked || r.assisted || r.status !== 'active'} onClick={() => void act('review-hint')}>💡 提示</button>}
    {r.assisted && <p className="hint-box">{q.hint}</p>}
    {r.settled && <div className="answer-explanation" role="status"><h2>{r.answers[r.index] ? '答對了' : '一起看解法'}</h2>
      {q.answer !== undefined && <p>正確答案：<ChoiceView choice={q.options[q.answer]} grade={grade} hideReadingHints={q.hideReadingHints} /></p>}
      <p>{q.explanation}</p>{q.target && <ChoiceView choice={q.target} grade={grade} />}
      {(!r.answers[r.index] || r.assisted) && <p>先理解解法，再間隔至少兩題練習；這組放不下的題目，會留到之後複習。</p>}
      <ReadAloud grade={grade}><button data-read-aloud onClick={() => speak(q.explanation ?? '', onError, q.course === 'english' ? 'en-US' : 'zh-TW')}>聽解法</button></ReadAloud>
    </div>}
    {r.status === 'complete' ? <div className="study-complete"><h2>這組完成了</h2><p>答對 {r.answers.filter(Boolean).length} / {r.questions.length} 題。進度已存好，原有獎勵也都保留。</p>
      <div className="f-actions"><button className="f-primary" disabled={locked} onClick={() => onStart(r.mode==='learn'?'learn':'all', r.course)}>再練一組</button><button disabled={locked} onClick={() => onStart('mistakes', r.course)}>複習錯題</button><button onClick={onCourse}>換個科目</button><button onClick={onHome}>休息一下</button></div></div>
      : <div className="f-actions">{r.settled && <button className="f-primary" disabled={locked} onClick={() => void act('review-next')}>看懂了，下一題</button>}<button disabled={locked} onClick={async () => { if (await act('review-pause')) onHome(); }}>先休息，保留這組</button><button disabled={locked} onClick={async () => { if (await act('review-finish')) onHome(); }}>結束這組</button></div>}
    {progressPanel}
    <p className="f-muted">到期題與錯題優先，搭配已學題目；舊題沒有作答日期，也可以從這裡開始複習。</p>
    <p className="f-muted">這裡不計時、不扣血。每組最多六題，數量不足時以實際可用題數練習。</p>
  </section>;
}
