import { useContext } from "react";
import type { Profile, Run } from "./game-view";
import { castleGrowth } from "./castle-growth";
import { RESOURCE_KEYS, RESOURCE_LABELS } from "./territory";
import { LEARNING_MATERIALS, MATERIAL_QUESTIONS } from "./learning-rewards";
import { materialSnapshot, buildingGoal } from "./learning-journey";
import { ReadingContext, annotateTree } from "./readability";
import BrandIcon, { type BrandIconName } from "./BrandIcon";
import "./learning-journey.css";

const icons: Record<string, BrandIconName> = { wood: "leaf", stone: "earth", star: "spark" };
const number = new Intl.NumberFormat("zh-TW");

export function ResourceRibbon({ profile, onVisit, online }: {
  profile: Profile; onVisit: () => void; online: boolean;
}) {
  const { grade } = useContext(ReadingContext);
  const { stored, pending, waiting } = materialSnapshot(profile);
  return annotateTree(<section className="resource-ribbon" aria-label="建材庫存">
    <button type="button" className="resource-ribbon-link" onClick={onVisit}
      aria-label={`查看領地，庫存：${RESOURCE_KEYS.map(k => `${RESOURCE_LABELS[k]} ${number.format(stored[k])}`).join("、")}`}>
      <span className="resource-ribbon-caption">建材庫存<small>領地 →</small></span>
      {RESOURCE_KEYS.map(key => <span className="resource-ribbon-stock" key={key}>
        <BrandIcon name={icons[key]} />
        <span className="resource-ribbon-name">{RESOURCE_LABELS[key]}</span>
        <strong>{number.format(stored[key])}</strong>
      </span>)}
    </button>
    {(waiting || !online) && <p className="resource-ribbon-note">
      {!online && <span>離線中 · 顯示上次同步庫存。</span>}
      {waiting && <span>待入庫：{RESOURCE_KEYS.filter(k => pending[k] > 0).map(k => `${RESOURCE_LABELS[k]} ${number.format(pending[k])}`).join("、")}。
        {profile.territory ? "倉庫騰出空間後自動存入。" : "開啟領地後存入。"}</span>}
    </p>}
  </section>, grade);
}

export function MaterialProgress({ profile, run, oldDay = false }: { profile: Profile; run: Run; oldDay?: boolean }) {
  const { grade } = useContext(ReadingContext);
  return annotateTree(<div className="voyage-material-progress">
    <BrandIcon name="leaf" />
    <span>{run.practice ? "練習模式 · 建材進度保留" : oldDay ? "先前航程 · 建材進度保留"
      : `下一份建材 ${profile.learningRewards?.progress ?? 0} / ${MATERIAL_QUESTIONS} 題`}</span>
  </div>, grade);
}

export default function LearningJourney({ profile, run, onVisit, onTrain }: {
  profile: Profile; run?: Run; onVisit: () => void; onTrain?: () => void;
}) {
  const { grade } = useContext(ReadingContext);
  const goal = buildingGoal(profile);
  const growth = castleGrowth(profile.territory?.expansion ?? 0, profile.growth.xp);
  const progress = profile.learningRewards?.progress ?? 0;
  const receipt = run?.materials;
  return annotateTree(<section className={`learning-journey ${run ? "journey-result" : ""}`} aria-label={run ? "本趟建材與家園進度" : "學習與家園進度"}>
    <div className="journey-heading">
      <BrandIcon name="leaf" />
      <h2>{run ? "這趟冒險，為家園添一點" : "學習帶回建材，夥伴陪你築家"}</h2>
    </div>
    {run && <div className="journey-receipt">
      {receipt ? <>
        <p>本趟計入 <strong>{receipt.credited} 題</strong> · 獲得 <strong>{receipt.packs} 份建材</strong></p>
        {receipt.packs > 0 && <ul aria-label="本趟獲得的建材">{RESOURCE_KEYS.map(k => <li key={k}>
          <BrandIcon name={icons[k]} />{RESOURCE_LABELS[k]} <strong>+{receipt.packs * LEARNING_MATERIALS[k]}</strong>
        </li>)}</ul>}
        <small>{receipt.packs > 0 ? "已計入你的建材；待入庫數量顯示在上方。這一份也可能包含先前累積的題目。"
          : run.practice ? "練習不發建材，原有進度都保留。" : receipt.credited > 0 ? "這趟的進度已存好，和下一趟接著累積。" : "本趟沒有新增建材進度；只有當日首次計入的正確作答能累積建材。"}</small>
      </> : <p>這趟是先前版本的航程，沒有單獨的建材明細；現有庫存與累積進度都保留。</p>}
    </div>}
    <div className="journey-next-pack">
      <span>下一份建材 <strong>{progress} / {MATERIAL_QUESTIONS} 題</strong></span>
      <progress value={progress} max={MATERIAL_QUESTIONS} aria-label="下一份建材進度" />
    </div>
    <p className="journey-goal"><strong>{goal.target ? `我的目標 · ${goal.target.name}` : "我的家園"}</strong><span>{goal.message}</span></p>
    <p className="journey-castle">{growth.next
      ? growth.eligible ? `夥伴練習成長已達標，可免費擴建為${growth.next.name}。`
        : `任一夥伴靠練習提升 ${growth.next.companionLevel - 1} 級，開放${growth.next.name}擴建；目前還差 ${growth.remaining} XP。`
      : "星海大城已展開，讓夥伴陪你繼續布置家園。"}</p>
    <div className="journey-actions">
      <button type="button" aria-label={goal.action} onClick={onVisit}>{goal.action}<span aria-hidden="true"> →</span></button>
      {onTrain && <button type="button" aria-label="去學習冒險" onClick={onTrain}>去學習冒險</button>}
      <small>首次答對累積建材；休息後進度保留。</small>
    </div>
    {onTrain && <small>建材與經驗來自學習航程；競技場陪練保留原本的對戰規則。</small>}
  </section>, grade);
}
