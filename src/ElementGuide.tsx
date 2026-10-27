import { useContext, useEffect, useRef, useState, type CSSProperties } from "react";
import { ELEMENTS, ELEMENT_RULES, GENERATION_RULES, GENERATION_HEAL } from "./elements";
import { ReadingContext, annotateTree } from "./readability";
import { elementDemo, type DemoHealth, type ElementLesson } from "./element-demo";
import { BATTLE_ARENA } from "./battle-assets";
import BrandIcon from "./BrandIcon";
import "./element-guide.css";

export default function ElementGuide({ element, reduced = false }: { element?: number; reduced?: boolean }) {
  const { grade } = useContext(ReadingContext);
  const root = useRef<HTMLElement>(null);
  const [lesson, setLesson] = useState<ElementLesson>("generation");
  const [selected, setSelected] = useState(ELEMENTS[element ?? -1] ? element! : 2);
  const [health, setHealth] = useState<DemoHealth>("hurt");
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [broken, setBroken] = useState<string[]>([]);
  const demo = elementDemo(lesson, selected, health);
  const generation = lesson === "generation";
  const current = ELEMENTS[element ?? -1];
  const steps = ["先看夥伴", generation ? "換人接力" : "出招攻擊", "看看結果"];
  const relation = `${demo.sourceElement.name}${generation ? "生" : "剋"}${demo.targetElement.name}`;
  const hp = step === 2 ? demo.afterHp : demo.beforeHp;
  const caption = step === 0
    ? generation ? `${demo.sourceElement.name}夥伴先上場，${demo.targetElement.name}夥伴準備接棒。`
      : `${demo.sourceElement.name}夥伴，對上${demo.targetElement.name}對手。`
    : step === 1
      ? generation ? `主動換人！讓${demo.targetElement.name}夥伴上場。` : `${relation}！這次攻擊有相剋加成。`
      : generation
        ? demo.amount ? `接棒的${demo.targetElement.name}夥伴，回復 ${demo.amount} 體力！` : "體力已經滿了，不會再增加。"
        : `這次造成 ${demo.amount} 傷害，包含相剋加成。`;

  function reset() { setPlaying(false); setStep(0); }
  useEffect(() => { setSelected(ELEMENTS[element ?? -1] ? element! : 2); reset(); }, [element]);
  useEffect(() => { if (reduced) setPlaying(false); }, [reduced]);
  useEffect(() => {
    if (!playing || reduced) return;
    const timer = window.setTimeout(() => {
      setStep(step + 1);
      if (step === 1) setPlaying(false);
    }, step === 0 ? 1800 : 2200);
    return () => window.clearTimeout(timer);
  }, [playing, step, reduced]);
  useEffect(() => {
    const pause = () => { if (document.hidden) setPlaying(false); };
    const details = root.current?.closest("details");
    const collapse = () => { if (details && !details.open) setPlaying(false); };
    document.addEventListener("visibilitychange", pause);
    details?.addEventListener("toggle", collapse);
    return () => { document.removeEventListener("visibilitychange", pause); details?.removeEventListener("toggle", collapse); };
  }, []);

  return <>{annotateTree(<section ref={root} className={`element-guide ${reduced ? "element-guide-reduced" : ""}`} aria-label="五行相生相剋">
    <header className="element-guide-heading">
      <div><h3>五行小劇場</h3><p>讓夥伴演給你看。</p></div>
      <span className="element-demo-label">教學示範</span>
    </header>
    <div className="element-lessons" role="group" aria-label="選擇五行教學">
      <button type="button" aria-label="相生：換人補體力" aria-pressed={generation} onClick={() => { setLesson("generation"); reset(); }}>
        <BrandIcon name="heart" /><span><strong>相生</strong><small>換人補體力</small></span>
      </button>
      <button type="button" aria-label="相剋：攻擊更有力" aria-pressed={!generation} onClick={() => { setLesson("advantage"); reset(); }}>
        <BrandIcon name="battle" /><span><strong>相剋</strong><small>攻擊更有力</small></span>
      </button>
    </div>
    <div className="element-example-picker" role="group" aria-label="選擇示範屬性">
      <span>試試看</span>
      {ELEMENTS.map((e, i) => <button key={e.name} type="button" aria-label={`示範${e.name}屬性`} aria-pressed={selected === i}
        onClick={() => { setSelected(i); reset(); }}>{e.icon}<span>{e.name}</span></button>)}
    </div>
    <div className={`element-theatre lesson-${lesson} lesson-step-${step}`} data-step={step} data-playing={playing && !reduced}
      style={{ "--lesson-arena": `url("${BATTLE_ARENA}")` } as CSSProperties}>
      <div className="element-relation-banner"><strong>{relation}</strong><span>{generation ? "同一隊，接力上場" : "我的夥伴，攻擊對手"}</span></div>
      <div className="element-actors">
        {[demo.source, demo.target].map((pet, i) => <div key={i} className={`element-actor actor-${i}`}>
          <span className="element-actor-role">{i === 0 ? generation ? step === 0 ? "現在上場" : "退到後排" : "我的夥伴"
            : generation ? step === 0 ? "準備接棒" : "換上場了" : "對手"}</span>
          <div className="element-portrait">
            {broken.includes(pet.id) ? <span className="element-art-fallback" aria-label={pet.name}>{(i ? demo.targetElement : demo.sourceElement).icon}</span>
              : <img src={pet.image} alt={pet.name} draggable={false} loading="lazy" onError={() => setBroken(old => old.includes(pet.id) ? old : [...old, pet.id])} />}
            {i === 1 && step === 2 && <strong className="element-impact">{generation ? demo.amount ? `+${demo.amount}` : "已滿" : `−${demo.amount}`}</strong>}
          </div>
          <strong className="element-actor-name">{(i ? demo.targetElement : demo.sourceElement).icon} {(i ? demo.targetElement : demo.sourceElement).name} · {pet.name}</strong>
          {i === 1 ? <div className="element-demo-health">
            <div role="meter" aria-label={`${pet.name}示範體力`} aria-valuemin={0} aria-valuemax={demo.maxHp} aria-valuenow={hp}><span style={{ width: `${hp / demo.maxHp * 100}%` }} /></div>
            <span>體力 <b>{hp}</b> / {demo.maxHp}</span>
          </div> : <span className="element-source-note">{generation ? "力量交給隊友" : "屬性加成 +8"}</span>}
        </div>)}
        <div className="element-flight" aria-hidden="true"><span>{generation ? "💚" : demo.sourceElement.icon}</span><b>→</b></div>
      </div>
      <p className="element-caption" role="status" aria-live="polite" aria-atomic="true">{caption}</p>
      <p className="element-outcome">{step === 2 ? generation
        ? "換人算一回合，接著輪到對手。"
        : `${demo.amount - 8} 一般傷害 + 8 相剋加成 = ${demo.amount}`
        : generation ? "看接棒夥伴的體力。" : "示範對手沒有防守或護盾保護。"}</p>
    </div>
    <div className="element-story-steps" role="group" aria-label="教學步驟">
      {steps.map((title, i) => <button key={i} type="button" aria-label={`第 ${i + 1} 步：${title}`} aria-current={step === i ? "step" : undefined}
        onClick={() => { setPlaying(false); setStep(i); }}><b>{i + 1}</b><span>{title}</span></button>)}
    </div>
    <div className="element-playback">
      <button className="element-play" type="button" aria-label={reduced ? step === 2 ? "從頭看示範" : "看下一步" : playing ? "暫停示範" : step === 2 ? "重播動畫" : step === 1 ? "繼續動畫" : "播放動畫"}
        onClick={() => {
          root.current?.querySelector(".element-theatre")?.scrollIntoView({ block: "center", behavior: "instant" });
          if (reduced) { setStep(step === 2 ? 0 : step + 1); return; }
          if (playing) setPlaying(false);
          else { if (step === 2) setStep(0); setPlaying(true); }
        }}><BrandIcon name={playing ? "pause" : step === 2 ? "repeat" : "play"} />
        {reduced ? step === 2 ? "從頭看" : "看下一步" : playing ? "暫停" : step === 2 ? "再看一次" : step === 1 ? "繼續播放" : "播放動畫"}</button>
      {!reduced && <button type="button" aria-label="看下一步" disabled={step === 2} onClick={() => { setPlaying(false); setStep(step + 1); }}>下一步</button>}
      <small>{reduced ? "減少動態已開啟，按下一步慢慢看。" : "可以暫停，也可以一步一步看。"}</small>
    </div>
    {generation && <div className="element-health-picker" role="group" aria-label="改變接棒夥伴的體力">
      <span>如果接棒夥伴…</span>
      {([["hurt", "需要補體力"], ["near", "快滿了"], ["full", "已經滿了"]] as const).map(([value, title]) =>
        <button type="button" key={value} aria-label={title} aria-pressed={health === value} onClick={() => { setHealth(value); reset(); }}>{title}</button>)}
    </div>}
    <p className="element-takeaway">{generation ? `照箭頭的方向換人，接棒夥伴最多補 ${GENERATION_HEAL} 體力；滿了就停。`
      : "相剋讓攻擊多一份力量；對手防守或有護盾時，仍會減傷。"}</p>
    <details className="element-all-rules">
      <summary>看全部五行與詳細規則</summary>
      <h4>五行相生相剋</h4>
      {current && <div className="element-relations">
        <span>{current.name}生{current.generates}</span><span>{ELEMENTS.find(e => e.generates === current.name)!.name}生{current.name}</span>
        <span>{current.name}剋{current.overcomes}</span><span>{ELEMENTS.find(e => e.overcomes === current.name)!.name}剋{current.name}</span>
      </div>}
      <p><strong>相生</strong> {GENERATION_RULES}</p><p><strong>相剋</strong> {ELEMENT_RULES}</p>
      <p className="element-rule-note">相生接力：主動換上受到目前夥伴相生的隊友，回復最多 {GENERATION_HEAL} 體力，上限為該夥伴的最大生命。換人消耗一回合；擊倒後自動替補不觸發。</p>
      <p className="element-rule-note">相剋攻擊：攻擊或絕招剋制對手時，傷害 +8。這份加成會先計入攻擊，再套用防守與護盾減傷。</p>
    </details>
  </section>, grade)}</>;
}
