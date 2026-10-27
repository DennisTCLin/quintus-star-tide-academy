import ReadAloud from './ReadAloud';
import { useContext } from "react";
import { ReadingContext, AutoRuby, annotateTree } from "./readability";
import { rewardMessage, type RewardState } from "./reward-display";
import "./rewards.css";

export function RewardProgress({ stars }: { stars: number }) {
  const { grade } = useContext(ReadingContext);
  const text = `已存 ${stars} / 2 顆星 · 集滿自動換 1 張券`;
  return annotateTree(
    <div className="reward-progress">
      <div className="reward-stars" aria-hidden="true">
        {[0, 1].map((i) => <span className={i < stars ? "filled" : ""} key={i}>{i < stars ? "★" : "☆"}</span>)}
        <span className="reward-arrow">→ 🎟️</span>
      </div>
      <p>{grade === 2 ? <AutoRuby text={text} /> : text}</p>
    </div>, grade
  );
}

export default function RewardChoice({ reward, stars, busy, onChoose, onSpeak }: {
  reward: RewardState; stars: number; busy: boolean;
  onChoose: (choice: "save" | "chance") => void;
  onSpeak: (text: string) => void;
}) {
  const { grade } = useContext(ReadingContext);
  const label = (text: string) => grade === 2 ? <AutoRuby text={text} /> : text;
  const explanation = "這是先前保留的獎勵。按存一顆星就能領取，集滿兩顆自動換一張券。新挑戰成功後會自動存星星。";
  return annotateTree(
    <section className="reward-choice" aria-label="完成獎勵">
      {reward === "pending" ? <>
        <div className="reward-heading">
          <h2>{label("領取先前的獎勵")}</h2>
          <ReadAloud grade={grade}><button data-read-aloud className="voice-button" aria-label="聽獎勵說明" onClick={() => onSpeak(explanation)}>🔊</button></ReadAloud>
        </div>
        <p>{label("存好的星星會一直保留。")}</p>
        <div className="reward-options">
          <button disabled={busy} onClick={() => onChoose("save")} className="reward-option reward-save">
            <span className="reward-icon" aria-hidden="true">⭐</span>
            <strong>{label("存一顆星")}</strong>
            <span>{label("一定 +1，兩顆換一張券")}</span>
          </button>

        </div>
      </> : <><p className="reward-outcome" role="status">{label(rewardMessage(reward))}</p><ReadAloud grade={grade}><button data-read-aloud className="voice-button" aria-label="聽獎勵結果" onClick={() => onSpeak(rewardMessage(reward))}>🔊</button></ReadAloud></>}
      <RewardProgress stars={stars} />
    </section>, grade
  );
}
