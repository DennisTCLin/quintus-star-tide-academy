import { useContext, type ReactNode, type Ref } from 'react';
import type { Run } from './adventure';
import { petById } from './game-view';
import { completedHits } from './companion-growth';
import { rewardMessage } from './reward-display';
import { ReadingContext, annotateTree } from './readability';
import './quiz-victory.css';
import OutcomeAnimation from './OutcomeAnimation';

type Props = { run: Run; heading: Ref<HTMLHeadingElement>; busy: boolean; online: boolean; oldDay: boolean; review: boolean; courseAvailable: boolean; onContinue: () => void; onChooseCourse: () => void; onHome: () => void; autoPlay: boolean; reduced: boolean; onConsumed: () => void; pendingReward?: ReactNode };
export default function QuizVictory({ run, heading, busy, online, oldDay, review, courseAvailable, onContinue, onChooseCourse, onHome, pendingReward, autoPlay, reduced, onConsumed }: Props) {
  const { grade } = useContext(ReadingContext);
  const pet = petById(run.companion)!;
  const pending = run.reward === 'pending';
  return annotateTree(<div className="quiz-victory" aria-label="挑戰勝利與下一步">
    <OutcomeAnimation outcome="won" companion={run.companion} autoPlay={autoPlay} reduced={reduced} onConsumed={onConsumed} />
    <div className="victory-intro">
      <div className="victory-copy"><h1 ref={heading} tabIndex={-1}>挑戰勝利！</h1>
        <p>{pet.name}和你完成了 {run.questions.length} 題挑戰。</p>
        <p className="victory-score">答對 {completedHits(run)} / {run.questions.length} 題{!run.practice && run.encounter.earned > 0 && <span>夥伴 +{run.encounter.earned} XP</span>}</p>
        <p className="victory-reward" role="status">{run.practice ? '這回合是練習，學習紀錄已保存。' : oldDay ? '這是先前的挑戰紀錄，進度已保存。' : rewardMessage(run.reward)}</p>
      </div>
    </div>
    {pending && pendingReward}
    <div className="victory-next">
      <button type="button" className="f-primary victory-continue" disabled={busy || !online || pending} onClick={onContinue}>{busy ? '正在準備…' : review ? '繼續複習' : '繼續做題'}<span aria-hidden="true">→</span></button>
      <p className="victory-next-hint" aria-live="polite">{!online ? '連線恢復後，就能繼續做題。這次成果已保留。' : pending ? '先存好上面的星星，就能繼續做題。' : review ? '這科的新題已不足一組，可以複習學過的題目。' : !courseAvailable ? '選擇下一個科目，再出發。' : run.practice ? '繼續同一科的下一組練習。' : '繼續同一科的下一組題目。'}</p>
      <div className="victory-secondary"><button type="button" disabled={busy} onClick={onChooseCourse}>換個科目</button><button type="button" disabled={busy} onClick={onHome}>回港口休息</button></div>
    </div>
  </div>, grade);
}
export function VictoryDetails({ victory, children }: { victory: boolean; children: ReactNode }) {
  return victory ? <details className="victory-records"><summary>查看獎勵、錯題與學習紀錄</summary>{children}</details> : <>{children}</>;
}
