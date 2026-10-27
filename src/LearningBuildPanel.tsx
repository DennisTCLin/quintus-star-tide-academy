import { useContext, useState } from "react";
import type { Profile } from "./game-view";
import {
  BUILDINGS,
  RESOURCE_KEYS,
  RESOURCE_LABELS,
  buildingSpec,
  cityLevel,
} from "./territory";
import {
  freshLearningRewards,
  LEARNING_MATERIALS,
  MATERIAL_QUESTIONS,
} from "./learning-rewards";
import { ReadingContext, annotateTree } from "./readability";
import BrandIcon from "./BrandIcon";
import "./learning-build.css";
import { buildingGoal } from "./learning-journey";

export default function LearningBuildPanel({
  profile,
  busy,
  online,
  onGoal,
  onVisit,
  compact = false,
}: {
  profile: Profile;
  compact?: boolean;
  busy: boolean;
  online: boolean;
  onGoal: (goal: string | null) => Promise<unknown>;
  onVisit: () => void;
}) {
  const { grade } = useContext(ReadingContext),
    s = profile.learningRewards ?? freshLearningRewards();
  const [notice, setNotice] = useState("");
  const goal = buildingGoal(profile);
  const target = buildingSpec(s.goal),
    level = profile.territory ? cityLevel(profile.territory) : 1;
  const held = (key: (typeof RESOURCE_KEYS)[number]) =>
    goal.stored[key];
  const packs = target
    ? Math.max(
        ...RESOURCE_KEYS.map((k) =>
          Math.ceil(
            Math.max(0, target.cost[k] - held(k)) / LEARNING_MATERIALS[k],
          ),
        ),
      )
    : 0;
  const questions = Math.max(0, packs * MATERIAL_QUESTIONS - s.progress);
  const waiting = RESOURCE_KEYS.some((k) => s.pending[k] > 0);
  return annotateTree(
    <section
      className={`learning-build-panel ${compact ? "learning-build-compact" : ""}`}
      aria-label="學習與建造計畫"
    >
      <div className="learning-build-heading">
        <BrandIcon name="earth" />
        <div>
          <h2>{compact ? "學習建材進度" : "學會一點，家園長大一點"}</h2>
          {!compact && <p>每五道合資格題目：20 靈木、12 雲石、6 星砂。</p>}
        </div>
      </div>
      <div className="learning-build-progress">
        <span>
          已獲得 {s.packs ?? 0} 份建材 · 下一份 {s.progress} /{" "}
          {MATERIAL_QUESTIONS} 題
        </span>
        <progress
          aria-label="下一份建材進度"
          value={s.progress}
          max={MATERIAL_QUESTIONS}
        />
        {!compact && (
          <small>
            還有 {MATERIAL_QUESTIONS - s.progress}{" "}
            題；休息或換一天，進度也保留。
          </small>
        )}
      </div>
      <details className="learning-build-details" open={!compact}>
        <summary>建造目標與材料</summary>
        <label className="learning-build-goal">
          <span>我想蓋的建築</span>
          <select
            id="learning-building-goal"
            value={s.goal ?? ""}
            disabled={busy || !online}
            onChange={async (e) => {
              const result = await onGoal(e.target.value || null);
              setNotice(
                result ? "建造目標已儲存" : "目標尚未儲存，請確認同步後再試。",
              );
            }}
          >
            <option value="">先選一個喜歡的目標</option>
            {BUILDINGS.filter((b) => b.id !== "hall").map((b) => (
              <option value={b.id} key={b.id}>
                {b.name}
                {b.unlock > level ? `（領地 ${b.unlock} 級）` : ""}
              </option>
            ))}
          </select>
        </label>
        {target && (
          <div className="learning-build-target">
            <h3>{target.name}的材料進度</h3>
            <div className="learning-build-stocks">
              {RESOURCE_KEYS.filter((k) => target.cost[k] > 0).map((k) => (
                <div key={k}>
                  <span>{RESOURCE_LABELS[k]}</span>
                  <strong>
                    {held(k)} / {target.cost[k]}
                  </strong>
                  <progress
                    aria-label={`${RESOURCE_LABELS[k]}目標進度`}
                    max={target.cost[k]}
                    value={Math.min(held(k), target.cost[k])}
                  />
                </div>
              ))}
            </div>
            <p>
              {goal.message}
              {packs > 0 && ` 只靠新增學習建材，約 ${questions} 道合資格題目可補齊目前庫存差額；待入庫材料、生產和委託也能補充。`}
            </p>
            {target.unlock > level && (
              <p>這座建築需要領地 {target.unlock} 級；材料可以先存好。</p>
            )}
            <small>
              這裡只計已入庫材料。選目標不會扣材料或自動建造。
            </small>
          </div>
        )}
        {waiting && (
          <p className="learning-build-pending" role="status">
            {profile.territory
              ? "倉庫暫時放不下，剩餘建材已保留；建造騰出空間後自動入庫。"
              : "建材已存好，開啟領地後會自動入庫。"}{" "}
            靈木 {s.pending.wood}、雲石 {s.pending.stone}、星砂 {s.pending.star}
            。
          </p>
        )}
        <div className="learning-build-footer">
          <button onClick={onVisit}>{goal.action}</button>
          <small>主城持續供應材料，也能靠和平委託經營。</small>
        </div>
      </details>
      <p className="learning-build-notice" role="status">
        {notice}
      </p>
    </section>,
    grade,
  );
}
