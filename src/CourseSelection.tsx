import ReadAloud from './ReadAloud';
import type { CSSProperties } from 'react';
import { COURSES } from './course-catalog';
import type { Course, Grade } from './learning';
import type { IslandRun } from './island/schema';
import { annotateTree, syllables } from './readability';
import { PhoneticText } from './PhoneticText';
import { SUBJECT_ISLANDS, islandArt, islandForCourse } from './subject-islands';
import AnimatedArchipelago from './AnimatedArchipelago';
import { unfinishedJourney, journeyProgress, mathJourneyProgress, type Journey, type ChallengeProgress } from './journey-progress';
import './course-selection.css';
import './island-journey.css';
import IslandCollectionPreview from './IslandCollectionPreview';
import type { CollectionProfile } from './island-collection';
export { unfinishedJourney } from './journey-progress';

type Props = {
  grade: Grade;
  profile: CollectionProfile;
  run?: Journey | null;
  islandRun?: IslandRun;
  online: boolean;
  busy: boolean;
  reduced?: boolean;
  motionGranted?: boolean;
  motionSuspended?: boolean;
  onMotionActivity?: (active: boolean) => void;
  onIsland?: () => void;
  onStart: (course: Course) => void;
  onResume: () => void;
  onSpeak: (text: string) => void;
};
function IslandText({ text, grade, zy }: { text: string; grade: Grade; zy?: string }) {
  if (grade !== 2) return <>{text}</>;
  const parts = zy?.split(' ');
  return <span className="island-reading" data-learning-content>{syllables(text).map((part, i) => {
    const sound = parts?.length === [...text].length ? parts[i] : part.zy;
    return sound ? <ruby className="island-ruby" key={i}>{part.text}<rt><PhoneticText text={sound} /></rt></ruby> : part.text;
  })}</span>;
}
function ListenIcon() {
  return <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M11 4 5 9H2v6h3l6 5zM15 8a6 6 0 0 1 0 8M18 4a11 11 0 0 1 0 16" /></svg>;
}
function JourneyCard({ name, zy, grade, art, progress, pending, disabled, onResume }: {
  name: string; zy?: string; grade: Grade; art?: string; progress: ChallengeProgress; pending: boolean; disabled: boolean; onResume: () => void;
}) {
  return <div className="course-current journey-card" aria-label="目前這一趟">
    <span className="journey-portrait" aria-hidden="true">{art ? <img src={art} alt="" width="96" height="96" onError={e => { e.currentTarget.hidden = true; }} /> : <span>⛵</span>}</span>
    <div className="course-current-copy">{progress.label !== '挑戰中' && <small className="journey-status">{progress.label}</small>}<strong><IslandText text={name} zy={zy} grade={grade} /></strong>
      <span className="journey-count">已答 {progress.done} / {progress.total} 題</span>
      <progress className="journey-native-progress" aria-label={`${name}挑戰進度`} value={progress.done} max={progress.total || 1} />
      <span className="journey-stones" aria-hidden="true">{Array.from({ length: Math.min(progress.total, 12) }, (_, i) => <i key={i} className={i < (progress.total > 12 ? Math.floor(progress.done / progress.total * 12) : progress.done) ? 'is-complete' : ''} />)}</span>
    </div>
    <button type="button" className="f-primary journey-resume" disabled={disabled} aria-label={pending ? `領取獎勵：${name}` : `繼續玩：${name}`} onClick={onResume}>
      <span aria-hidden="true">{pending ? '🎁' : '▶'}</span><IslandText text={pending ? '領取獎勵' : '繼續玩'} grade={grade} />
    </button>
  </div>;
}
function Progress({ progress, name }: { progress: ChallengeProgress; name: string }) {
  return <span className="island-challenge-progress">
    <span><b>{progress.label}</b><span>{progress.done} / {progress.total} 題</span></span>
    <progress aria-label={`${name}挑戰進度`} value={progress.done} max={progress.total || 1} />
    <small>{progress.done === progress.total ? '題目已完成' : `還有 ${progress.total - progress.done} 題`}</small>
  </span>;
}
export default function CourseSelection({ grade, profile, run, islandRun, online, busy, onStart, onResume, onSpeak, onIsland, reduced, motionGranted, motionSuspended, onMotionActivity }: Props) {
  const journey = unfinishedJourney(run);
  const mathActive = !!islandRun && !islandRun.completed;
  const current = journey && (COURSES[grade].find(c => c.id === journey.course)
    ?? { name: grade === 1 && journey.course === 'words' ? '聽音找圖' : '目前的航線', icon: '⛵' });
  const pending = journey?.reward === 'pending';
  const blocked = !online || busy;
  const speech = `這裡有${COURSES[grade].map(c => c.name).join('、')}。` + '點一座島就能出發。挑戰進度會顯示已回答的題數。有進行中的挑戰時，點原來的島繼續；換島前會先確認。完成挑戰，有機會邀請怪物成為夥伴。';
  const act = (action: () => void) => { if (!blocked) action(); };
  const stops = SUBJECT_ISLANDS.filter(island => COURSES[grade].some(c => c.id === island.courses[grade])).map((island, index) => {
    const course = COURSES[grade].find(c => c.id === island.courses[grade])!;
    const isCurrent = journey?.course === course.id;
    const isMathCurrent = course.id === 'math' && mathActive && !journey;
    const progress = isMathCurrent ? mathJourneyProgress(islandRun!) : run?.course === course.id ? journeyProgress(run) : undefined;
    const action = isMathCurrent ? '繼續數學島' : isCurrent ? pending ? '領取獎勵' : '繼續挑戰' : journey || mathActive ? '前往這座島' : '出發探險';
    const label = isMathCurrent ? '繼續數學島冒險' : isCurrent ? `${pending ? '領取' : '繼續'}${course.name}${pending ? '獎勵' : '挑戰'}` : `開始${course.name}`;
    const choose = () => act(() => isMathCurrent ? onIsland?.() : isCurrent ? onResume() : onStart(course.id));
    const [x, y] = [[23,43],[65,45],[49,77],[86,80],[18,84]][index];
    const style = { '--island-tone': island.color, '--map-x': `${x}%`, '--map-y': `${y}%` } as CSSProperties;
    return { island, course, isCurrent, isMathCurrent, progress, action, label, choose, style, number:index+1 };
  });
  return annotateTree(<section id="adventure-islands" className="course-section subject-islands has-archipelago journey-islands" aria-label="選擇航線">
    <div className="section-title"><div><span className="islands-eyebrow">夥伴陪你一起出發</span><h2>{journey || mathActive ? '繼續你的冒險' : '選一座島出發'}</h2></div>
      <ReadAloud grade={grade}><button data-read-aloud type="button" className="course-listen" aria-label="聽介紹：航線說明" onClick={() => onSpeak(!online ? `${speech}目前離線，連線後再出發。` : speech)}><ListenIcon /><span>聽介紹</span></button></ReadAloud>
    </div>
    {journey && current && <JourneyCard name={current.name} zy={'zy' in current ? current.zy : undefined} grade={grade}
      art={islandForCourse(grade, journey.course) ? islandArt(islandForCourse(grade, journey.course)!.id) : undefined}
      progress={journeyProgress(journey)} pending={pending} disabled={blocked} onResume={() => act(onResume)} />}
    {!journey && mathActive && <JourneyCard name="動手玩數學" grade={grade} art={islandArt('metal')}
      progress={mathJourneyProgress(islandRun!)} pending={false} disabled={blocked || !onIsland} onResume={() => act(() => onIsland?.())} />}
    <div className="island-map-heading"><h3>{journey || mathActive ? '也可以換一座島' : '想去哪裡玩？'}</h3><span>點島嶼出發</span></div>
    <p className="course-availability" role="status">{!online ? '目前離線，進度已保留，連線後再出發。' : busy ? '正在儲存，請等一下。' : pending ? '獎勵還在等你！先領好，再出發。' : ''}</p>
    <AnimatedArchipelago reduced={reduced} granted={motionGranted} suspended={motionSuspended} onActivity={onMotionActivity}>
      {stops.map(stop => <button type="button" key={stop.island.id} className={`archipelago-stop ${stop.isCurrent || stop.isMathCurrent ? 'is-current' : ''}`} style={stop.style} disabled={blocked} aria-current={stop.isCurrent || stop.isMathCurrent ? "location" : undefined} aria-label={`從群島${stop.label}`} onClick={stop.choose}>
        {(stop.isCurrent || stop.isMathCurrent) && <span className="island-location" aria-hidden="true">你在這裡</span>}
        <span className="archipelago-stop-name"><IslandText text={stop.course.name} zy={stop.course.zy} grade={grade} /></span>
      </button>)}
    </AnimatedArchipelago>
    <details className="island-course-details"><summary>查看全部科目與夥伴</summary><div className="subject-island-grid">
      {stops.map(({island,course,isCurrent,isMathCurrent,progress,action,label,choose,style,number}) => {
        return <div key={`${grade}-${island.id}`} className="subject-island-destination" style={style}>
          <button type="button" className={`subject-island-card ${isCurrent || isMathCurrent ? 'is-current' : ''}`} disabled={blocked} aria-label={label} onClick={choose}>
            <span className="subject-island-art" aria-hidden="true"><img src={islandArt(island.id)} alt="" width="600" height="600" loading="lazy" onError={e => { e.currentTarget.hidden = true; }}/><span className="subject-island-fallback">{island.element}</span></span>
            <span className="subject-island-element"><span className="archipelago-number" aria-hidden="true">{number}</span>{island.element}</span>
            <strong className="subject-island-subject"><IslandText text={course.name} zy={course.zy} grade={grade} /></strong>
            {grade === 1 && <span className="subject-island-zy" data-learning-content><PhoneticText text={course.zy} /></span>}
            <span className="subject-island-name">{island.name}</span>
            {progress ? <Progress name={course.name} progress={progress} /> : <span className="subject-island-ready">準備出發</span>}
            <span className="subject-island-action">{action} →</span>
          </button>
          {course.id === 'math' && onIsland && <button type="button" className="subject-math-extra" disabled={blocked} onClick={() => act(onIsland)} aria-label="去數學島"><b>動手玩數學 →</b><small>看示範、玩小遊戲</small></button>}
          {course.id === 'math' && islandRun?.completed && <div className="math-last-progress"><span>上次動手玩數學</span><Progress name="上次數學島" progress={mathJourneyProgress(islandRun)} /></div>}
          <details className="subject-island-residents"><summary>看島上夥伴</summary><IslandCollectionPreview island={island} profile={profile} grade={grade} onSpeak={onSpeak} /></details>
        </div>;
      })}
    </div>
    </details><p className="subject-island-note">進度條記錄本趟已回答的題數；挑戰成功還要達成答對要求。完成挑戰，有機會邀請島上的怪物成為夥伴。星願券的抽選不受島嶼屬性影響。</p>
  </section>, grade);
}
