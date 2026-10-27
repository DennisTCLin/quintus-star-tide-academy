import MonsterMotion, {hasMonsterMotion,type MonsterAction} from "./MonsterMotion";
import ReadAloud from './ReadAloud';
import { CreatureBadge, StatLine } from "./CreatureInfo";
import { nativeCombatStats, encounterStats, NATIVE_LEVELS, type CombatStats } from "./creature-rules";
import { creatureProgress } from "./companion-growth";
import { petSkillName, petSkillDescription, type Profile } from "./game-view";
import { useContext, useEffect, useRef, useState, type RefObject } from "react";
import { ELEMENTS } from "./elements";
import { MONSTER_CATALOG, MONSTER_FAMILIES, MONSTER_FORMS, monsterById, monsterForm, type Monster } from "./monsters";
import { ReadingContext, annotateTree } from "./readability";
import { speak, stopVoice } from "./voice";
import "./monster-bestiary.css";

export function MonsterArt({ monster, eager = false, action="idle", nonce=0, reduced=false }: { monster: Monster; eager?: boolean; action?:MonsterAction; nonce?:number; reduced?:boolean }) {
  if(eager&&hasMonsterMotion(monster.id))return <MonsterMotion key={monster.id} monster={monster} action={action} nonce={nonce} reduced={reduced}/>;
  // A new source owns its loading state, including callbacks from the old image.
  return <MonsterImage key={monster.image} monster={monster} eager={eager} />;
}

function MonsterImage({ monster, eager }: { monster: Monster; eager: boolean }) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  return <div className={`monster-art monster-${monster.form}`} role="img" aria-label={monster.name}>
    {status !== "ready" && <span className="monster-art-fallback" aria-hidden="true">{MONSTER_FAMILIES[monster.family].icon}</span>}
    {status !== "error" && <img src={eager ? monster.image : monster.thumbnail ?? monster.image} alt="" width={640} height={640} loading={eager ? "eager" : "lazy"} decoding="async" draggable={false}
      onLoad={() => setStatus("ready")} onError={() => setStatus("error")} />}
  </div>;
}

function MonsterDetail({ monster, level, stats, ownedLevel, close }: { monster: Monster; level: number; stats: CombatStats; ownedLevel?: number; close: () => void }) {
  const { grade } = useContext(ReadingContext);
  const dialog = useRef<HTMLDialogElement>(null);
  const affinity = ELEMENTS.find(element => element.name === monster.element)!;
  const counter = ELEMENTS.find(element => element.overcomes === monster.element)!;
  const family = MONSTER_FAMILIES[monster.family], form = monsterForm(monster);
  const [audioError, setAudioError] = useState("");
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    dialog.current?.showModal();
    return () => { stopVoice(); if (opener?.isConnected) opener.focus(); };
  }, []);
  return annotateTree(<dialog ref={dialog} className="monster-dialog" aria-labelledby="monster-title" onCancel={close} onClose={close}>
    <button type="button" className="monster-close" onClick={close} aria-label="關閉怪物詳情">✕</button>
    <div className="monster-detail-art"><MonsterArt monster={monster} eager /></div>
    <div className="monster-detail-copy">
      <p className="monster-eyebrow">NO. {String(monster.number).padStart(3, "0")} · {family.name}族</p>
      <h2 id="monster-title">{monster.name}</h2>
      <CreatureBadge rarity={monster.rarity} level={level} />
      <p>野外能力預覽 · Lv.{level}{ownedLevel ? ` · 我的夥伴 Lv.${ownedLevel}` : ""}</p>
      <StatLine stats={stats} />
      <div className="monster-tags"><span>{affinity.icon} {affinity.name}屬性</span><span>{form.name} · {form.levels}</span></div>
      <p>{monster.feature}</p>
      <dl className="monster-facts"><div><dt>出沒地點</dt><dd>{family.habitat}</dd></div><div><dt>夥伴技能</dt><dd><b>{petSkillName(monster.id)}</b><p>{petSkillDescription(monster.id)}</p></dd></div><div><dt>五行關係</dt><dd>剋{affinity.overcomes} · 被{counter.name}剋</dd></div></dl>
      <p className="monster-note">夥伴{form.levels}的航程會遇見牠。六題挑戰成功後，另外連續答對三題就必定降服；降服挑戰答錯一題就結束，每趟合資格航程各一次。累計三錯就失敗，沒有降服機會。新夥伴天生 Lv.{NATIVE_LEVELS[monster.rarity]}，已有練習成長會保留。</p>
      <ReadAloud grade={grade}><button data-read-aloud type="button" className="f-secondary" onClick={() => speak(`${monster.name}。${monster.element}屬性。${form.name}。${monster.feature}。招式特色，${monster.move}。`, setAudioError)}>🔊 聽怪物介紹</button></ReadAloud>
      {audioError && <p role="status">{audioError}</p>}
    </div>
  </dialog>, grade);
}

export default function MonsterBestiary({ heading, current, profile, onBack, onResume }: {
  heading: RefObject<HTMLHeadingElement>; current?: string; profile: Profile; onBack: () => void; onResume?: () => void;
}) {
  const { grade } = useContext(ReadingContext);
  const [query, setQuery] = useState("");
  const [element, setElement] = useState("all");
  const [family, setFamily] = useState("all");
  const [form, setForm] = useState("all");
  const [rarity, setRarity] = useState("all");
  const [page, setPage] = useState(0);
  const [detail, setDetail] = useState<Monster | null>(null);
  const encountered = monsterById(current);
  const previewStats = (monster: Monster) => profile.run?.encounter.variant === monster.id
    ? profile.run.encounter.combat?.foe ?? encounterStats(1, monster.rarity, profile.run.encounter.level)
    : nativeCombatStats(monster.rarity, NATIVE_LEVELS[monster.rarity] + monsterForm(monster).minLevel - 1);
  const previewLevel = (monster: Monster) => previewStats(monster).level;
  const ownLevel = (monster: Monster) => profile.owned[monster.id] ? creatureProgress(monster.rarity, profile.growth.xp[monster.id] ?? 0).level : undefined;
  const needle = query.trim().toLocaleLowerCase();
  const filtered = MONSTER_CATALOG.filter(monster => (element === "all" || monster.element === element)
    && (family === "all" || MONSTER_FAMILIES[monster.family].id === family)
    && (rarity === "all" || monster.rarity === rarity)
    && (form === "all" || monster.form === form)
    && `${monster.name} ${monster.element} ${MONSTER_FAMILIES[monster.family].name} ${monster.move} ${monster.feature}`.toLocaleLowerCase().includes(needle));
  const pageCount = Math.max(1, Math.ceil(filtered.length / 12));
  const currentPage = Math.min(page, pageCount - 1);
  useEffect(() => setPage(0), [query, element, family, form, rarity]);
  const changePage = (next: number) => { setPage(next); heading.current?.focus({ preventScroll: true }); heading.current?.scrollIntoView({ block: "start" }); };
  const reset = () => { setQuery(""); setElement("all"); setFamily("all"); setForm("all"); setRarity("all"); };
  return annotateTree(<section className="bestiary" aria-label="怪物圖鑑">
    <div className="bestiary-top"><button type="button" onClick={onBack}>← 回夥伴卡冊</button>{onResume && <button type="button" onClick={onResume}>⚔️ 繼續目前航程</button>}</div>
    <header className="bestiary-heading">
      <div><p className="monster-eyebrow">星潮學院 · 生物觀察誌</p><h1 ref={heading} tabIndex={-1}>怪物圖鑑</h1><p>從雲海到古老遺跡，認識航線上的新面孔。</p></div>
      <div className="bestiary-count"><strong>{MONSTER_CATALOG.length}</strong><span>種怪物<br />{MONSTER_FAMILIES.length} 個族群 · 五種屬性</span></div>
    </header>
    <div className="bestiary-tools">
      <label className="bestiary-search"><span>搜尋怪物</span><input type="search" name="monster-search" autoComplete="off" placeholder="名稱、屬性或招式…" value={query} onChange={event => setQuery(event.target.value)} /></label>
      <label><span>稀有度</span><select aria-label="怪物稀有度" value={rarity} onChange={event => setRarity(event.target.value)}><option value="all">全部稀有度</option>{["E","D","C","B","A","S"].map(rank => <option key={rank} value={rank}>{rank} 級</option>)}</select></label>
      <label><span>族群</span><select name="monster-family" value={family} onChange={event => setFamily(event.target.value)}><option value="all">全部族群</option>{MONSTER_FAMILIES.map(item => <option key={item.id} value={item.id}>{item.name}族</option>)}</select></label>
      <label><span>等級</span><select name="monster-form" value={form} onChange={event => setForm(event.target.value)}><option value="all">全部等級</option>{MONSTER_FORMS.map(item => <option key={item.id} value={item.id}>{item.name} · {item.levels}</option>)}</select></label>
    </div>
    <div className="bestiary-elements" role="group" aria-label="篩選怪物屬性"><button type="button" aria-pressed={element === "all"} onClick={() => setElement("all")}>全部屬性</button>{ELEMENTS.map(item => <button type="button" key={item.name} aria-pressed={element === item.name} onClick={() => setElement(item.name)}>{item.icon} {item.name}</button>)}</div>
    <div className="bestiary-results"><p role="status" aria-live="polite">找到 {filtered.length} 種怪物</p>{(needle || element !== "all" || family !== "all" || form !== "all" || rarity !== "all") && <button type="button" onClick={reset}>清除篩選</button>}{encountered && <button type="button" onClick={() => setDetail(encountered)}>最近遇見 · {encountered.name} ↗</button>}<p>初階：練習提升 0–3 級 · 高階守衛：練習提升 4 級起</p></div>
    {filtered.length ? <ul className="monster-grid">{filtered.slice(currentPage * 12, (currentPage + 1) * 12).map(monster => <li key={monster.id}>
      <button type="button" className={`monster-card element-${monster.element}`} onClick={() => setDetail(monster)} aria-label={`查看${monster.name}，${monster.element}屬性，${monsterForm(monster).name}`}>
        <CreatureBadge rarity={monster.rarity} level={previewLevel(monster)} />
        <div className="monster-card-top"><span>NO. {String(monster.number).padStart(3, "0")}</span><span>{monster.element}屬性</span></div>
        <MonsterArt monster={monster} />
        <div className="monster-card-copy"><h2>{monster.name}</h2><p>{MONSTER_FAMILIES[monster.family].name}族 · {monsterForm(monster).name}</p><StatLine stats={previewStats(monster)} /><p className="monster-owned-note">{ownLevel(monster) ? `已降服 · 夥伴 Lv.${ownLevel(monster)}` : "戰勝後連對三題降服"}</p><span className="monster-level">出沒 {monsterForm(monster).levels} · 點開技能</span><span className="monster-card-arrow" aria-hidden="true">↗</span></div>
      </button>
    </li>)}</ul> : <div className="bestiary-empty"><h2>還找不到這種怪物</h2><p>試試別的名稱，或清除篩選再看看。</p><button type="button" onClick={reset}>顯示全部怪物</button></div>}
    {pageCount > 1 && <nav className="bestiary-pagination" aria-label="怪物圖鑑分頁"><button disabled={currentPage === 0} onClick={() => changePage(currentPage - 1)}>上一頁</button><span role="status">第 {currentPage + 1} / {pageCount} 頁</span><button disabled={currentPage + 1 >= pageCount} onClick={() => changePage(currentPage + 1)}>下一頁</button></nav>}
    {detail && <MonsterDetail key={detail.id} monster={detail} level={previewLevel(detail)} stats={previewStats(detail)} ownedLevel={ownLevel(detail)} close={() => setDetail(null)} />}
  </section>, grade);
}
