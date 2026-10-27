import CastleExterior, { CastleExpansion } from "./CastleExterior";
import CastleIllustration from "./CastleIllustration";
import IslandHabitat from "./IslandHabitat";
import { castleStyle, MAX_TERRITORY_PLOTS } from "./castle-growth";
import {
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type CSSProperties,
} from "react";
import {
  BUILDINGS,
  RESOURCE_KEYS,
  RESOURCE_LABELS,
  ACHIEVEMENTS,
  LEVELS,
  buildingSpec,
  buildingCost,
  cityLevel,
  plotCount,
  production,
  pendingResources,
  hasSynergy,
  affordable,
  commission,
  type BuildingSpec,
  type Stock,
  type Territory,
} from "./territory";
import { ROSTER, type Profile } from "./game-view";
import BrandIcon, { type BrandIconName } from "./BrandIcon";
import { ReadingContext, annotateTree } from "./readability";
import { GENERATION_RULES } from "./elements";
import "./territory.css";
import { buildingGoal, type GoalRequest } from "./learning-journey";
const resourceIcon: Record<string, BrandIconName> = {
  wood: "leaf",
  stone: "earth",
  star: "spark",
};
const elementIcon: Record<string, BrandIconName> = {
  金: "metal",
  木: "leaf",
  水: "water",
  火: "fire",
  土: "earth",
};
function Art({
  spec,
  className = "",
}: {
  spec: BuildingSpec;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={`territory-art ${className}`}
      style={{
        backgroundPosition: `${((spec.art % 4) * 100) / 3}% ${(Math.floor(spec.art / 4) * 100) / 3}%`,
      }}
    />
  );
}
function Resources({ value, prefix = "" }: { value: Stock; prefix?: string }) {
  const { grade } = useContext(ReadingContext);
  return (
    <>
      {annotateTree(
        <span className="territory-cost">
          {RESOURCE_KEYS.filter((k) => value[k] > 0).map((k) => (
            <span key={k}>
              <BrandIcon name={resourceIcon[k]} />
              <span>
                {prefix}
                {value[k].toLocaleString()} {RESOURCE_LABELS[k]}
              </span>
            </span>
          ))}
        </span>,
        grade,
      )}
    </>
  );
}
export default function TerritoryPage({
  profile,
  busy,
  online,
  serverNow,
  musicControl,
  onAction,
  onTrain,
  onRoom,
  reduced = false,
  goalRequest,
}: {
  profile: Profile;
  goalRequest?: GoalRequest | null;
  reduced?: boolean;
  busy: boolean;
  online: boolean;
  serverNow?: number;
  musicControl?: ReactNode;
  onTrain?: () => void;
  onRoom?: () => void;
  onAction: (command: Record<string, unknown>) => Promise<unknown>;
}) {
  const { grade } = useContext(ReadingContext),
    t = profile.territory;
  const [view, setView] = useState<"exterior" | "interior">("interior");
  const [tab, setTab] = useState<"build" | "storage" | "quests" | "guide">(
      "build",
    ),
    [kind, setKind] = useState(profile.learningRewards?.goal ?? "grove"),
    [selected, setSelected] = useState(1),
    [moving, setMoving] = useState<number | null>(null),
    [demolish, setDemolish] = useState<number | null>(null),
    [message, setMessage] = useState(""),
    [zoom, setZoom] = useState(1),
    [filter, setFilter] = useState("all"),
    [tick, setTick] = useState(0);
  const appliedGoal = useRef<number | null>(null);
  useEffect(() => {
    if (!goalRequest || !t || appliedGoal.current === goalRequest.nonce) return;
    appliedGoal.current = goalRequest.nonce;
    const goal = buildingGoal(profile);
    setView("interior");
    setTab(goal.state === "capacity" ? "storage" : "build");
    setFilter("all");
    setMoving(null);
    setDemolish(null);
    if (goal.target) setKind(goal.target.id);
    setSelected(goal.freePlot ?? 0);
    setMessage(goal.message);
  }, [goalRequest, !!t]);
  useEffect(() => {
    if (!goalRequest || (t && view !== "interior")) return;
    const frame = requestAnimationFrame(() => {
      const goal = buildingGoal(profile);
      const target = document.getElementById(!t ? "territory-open" : !goal.target
        ? "learning-building-goal" : goal.state === "capacity" ? "territory-workbench"
        : goal.freePlot === null ? "territory-expansion" : "territory-inspector");
      // Native details is closed by default; reveal its explicit goal control.
      const details = target?.closest("details");
      if (details) details.open = true;
      target?.focus({ preventScroll: true });
      target?.scrollIntoView({ block: "center", behavior: "auto" });
    });
    return () => cancelAnimationFrame(frame);
  }, [goalRequest, view, !!t]);
  const viewport = useRef<HTMLDivElement>(null),
    clock = useRef({
      server: serverNow ?? Date.now(),
      local: performance.now(),
    });
  useEffect(() => {
    clock.current = {
      server: serverNow ?? Date.now(),
      local: performance.now(),
    };
  }, [serverNow]);
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") setTick((n) => n + 1);
    }, 5000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (viewport.current) {
      viewport.current.scrollLeft =
        (viewport.current.scrollWidth - viewport.current.clientWidth) / 2;
      viewport.current.scrollTop = Math.max(
        0,
        (viewport.current.scrollHeight - viewport.current.clientHeight) / 3,
      );
    }
  }, [!!t, zoom, view]);
  const movingBuilding = t?.buildings.find((b) => b.id === moving);
  useEffect(() => {
    if (moving !== null && !movingBuilding) setMoving(null);
  }, [moving, movingBuilding]);
  const now =
    clock.current.server +
    Math.floor(performance.now() - clock.current.local) +
    tick * 0;
  const pending = t ? pendingResources(t, now) : { wood: 0, stone: 0, star: 0 },
    rate = t ? production(t) : { wood: 0, stone: 0, star: 0 };
  const available = t
    ? (Object.fromEntries(
        RESOURCE_KEYS.map((k) => [k, t.resources[k] + pending[k]]),
      ) as Stock)
    : pending;
  const disabled = busy || !online;
  const run = async (
    action: string,
    extra: Record<string, unknown> = {},
    success = "已儲存你的領地",
  ) => {
    const result = await onAction({ type: "territory", action, ...extra });
    if (result) {
      setMessage(success);
      if (action === "build" || action === "move" || action === "demolish") {
        setMoving(null);
        setDemolish(null);
      }
      return true;
    }
    return false;
  };
  const spec = buildingSpec(kind)!,
    placed = t?.buildings.find((b) => b.plot === selected),
    selectedSpec = placed ? buildingSpec(placed.kind) : null;
  const level = t ? cityLevel(t) : 1,
    job = t ? commission(t) : null;
  const pick = (plot: number) => {
    setSelected(plot);
    document
      .getElementById("territory-inspector")
      ?.scrollIntoView({ block: "nearest", behavior: "auto" });
  };
  const body = (
    <section
      className={`territory-page ${t?.theme === "night" ? "territory-night" : ""}`}
      aria-label="我的星潮領地"
    >
      <header className="territory-heading">
        <div>
          <p className="territory-kicker">在星海之間，慢慢築起自己的家</p>
          <h1>我的星潮領地</h1>
          <p>建一座喜歡的城，讓夥伴陪你看風景。</p>
          <div className="territory-music">{musicControl}</div>
        </div>
        {t && (
          <div className="territory-level">
            <BrandIcon name="crown" />
            <strong>領地 {level} 級</strong>
            <span>
              {level === 10
                ? "星海建築師"
                : `下一級 ${t.renown} / ${LEVELS[level]} 繁榮`}
            </span>
            <progress
              value={level === 10 ? 1 : t.renown - LEVELS[level - 1]}
              max={level === 10 ? 1 : LEVELS[level] - LEVELS[level - 1]}
            />
          </div>
        )}
      </header>
      {!t ? (
        <div className="territory-welcome">
          <img
            src="/assets/territory/island.webp"
            alt="漂浮在碧藍星海上的白石城堡島嶼，等待你的建造"
          />
          <div>
            <h2>這座島，等你來命名每一段回憶</h2>
            <p>
              從一座城堡開始，採集靈木、雲石與星砂，建造花園、港灣和學院。原本的夥伴也能一起入住。
            </p>
            <p>不需要戰鬥。建築立即完成，搬移免費。</p>
            <button
              className="territory-primary"
              id="territory-open"
              disabled={disabled}
              onClick={() =>
                run("start", {}, "歡迎回家！先選一座建築，再點空地。")
              }
            >
              開啟我的領地
            </button>
            <small>獲得 180 靈木、150 雲石、90 星砂與一座城堡</small>
          </div>
        </div>
      ) : (
        <>
          <div className="territory-resourcebar" aria-label="領地資源">
            {RESOURCE_KEYS.map((k) => (
              <div className="territory-resource" key={k}>
                <BrandIcon name={resourceIcon[k]} />
                <div>
                  <span>{RESOURCE_LABELS[k]}</span>
                  <strong>{t.resources[k].toLocaleString()}</strong>
                  <small>
                    每小時 +{rate[k]} · 待收 {pending[k]}
                  </small>
                </div>
              </div>
            ))}
            <button
              className="territory-primary"
              disabled={
                disabled || RESOURCE_KEYS.every((k) => pending[k] === 0)
              }
              onClick={() => run("harvest", {}, "資源已收好，可以繼續建造了！")}
            >
              <BrandIcon name="gift" />
              收取產出
            </button>
          </div>
          <div className="castle-view-switch" role="group" aria-label="領地視角">
            <button aria-pressed={view === "interior"} onClick={() => setView("interior")}>領地全景與佈置</button>
            <button aria-pressed={view === "exterior"} onClick={() => setView("exterior")}>城堡款式與擴建</button>
            {onRoom && <button onClick={onRoom}>進屋佈置</button>}
          </div>
          {message && <p className="territory-message" role="status">{message}</p>}
          {view === "exterior" ? <CastleExterior profile={profile} disabled={disabled}
            onStyle={style => run("castle-style", {style}, "城堡外觀已儲存")}
            onExpand={() => void run("expand", {}, "家變大了！新的土地已開放，原有建築都保留。")}
            onTrain={onTrain} /> : <>
          <div className="territory-map-shell">
            <div className="territory-map-toolbar">
              <span>
                {moving
                  ? "搬移中：選一塊空地"
                  : `已開放 ${plotCount(t)} / ${MAX_TERRITORY_PLOTS} 塊土地`}
              </span>
              <div>
                <button
                  aria-label="縮小地圖"
                  disabled={zoom <= 1}
                  onClick={() => setZoom((z) => z - 0.25)}
                >
                  −
                </button>
                <button aria-label="重設地圖縮放" onClick={() => setZoom(1)}>
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  aria-label="放大地圖"
                  disabled={zoom >= 1.5}
                  onClick={() => setZoom((z) => z + 0.25)}
                >
                  ＋
                </button>
                <button
                  disabled={disabled}
                  onClick={() =>
                    run("theme", { theme: t.theme === "day" ? "night" : "day" })
                  }
                >
                  <BrandIcon name={t.theme === "day" ? "moon" : "sun"} />
                  {t.theme === "day" ? "星夜" : "晨光"}
                </button>
              </div>
            </div>
            <IslandHabitat profile={profile} reduced={reduced} zoom={zoom} viewportRef={viewport} editing={moving !== null}>
                <img
                  className="territory-landscape"
                  src="/assets/territory/island.webp"
                  alt="白石浮島、花樹與瀑布環繞你的星海家園"
                  draggable={false}
                />
                <div className="territory-night-wash" />
                {Array.from({ length: MAX_TERRITORY_PLOTS }, (_, plot) => {
                  const b = t.buildings.find((x) => x.plot === plot),
                    s = b ? buildingSpec(b.kind) : null,
                    locked = plot >= plotCount(t);
                  return (
                    <button
                      key={plot}
                      className={`territory-plot ${b ? "built" : ""} ${selected === plot ? "active" : ""} ${locked ? "locked" : ""}`}
                      style={
                        {
                          left: `${42 + (plot % 6) * 7 - Math.floor(plot / 6) * 4}%`,
                          top: `${32 + Math.floor(plot / 6) * 7 + (plot % 6) * 2}%`,
                          zIndex: (32 + Math.floor(plot / 6) * 7 + (plot % 6) * 2) * 10,
                        } as CSSProperties
                      }
                      aria-label={`土地 ${plot + 1}，${locked ? "尚未開放" : s ? `${s.name}，${b!.level} 級` : "空地"}`}
                      aria-pressed={selected === plot}
                      disabled={locked}
                      onClick={() => pick(plot)}
                    >
                      {s && b ? (
                        <>
                          {s.id === "hall" ? <span className="castle-interior-hall"><CastleIllustration styleId={castleStyle(t.castleStyle).id} expansion={t.expansion} decorative /></span> : <Art spec={s} />}
                          <span className="territory-plot-label">
                            {s.name} <b>{b.level}</b>
                            {hasSynergy(t, b) && <i aria-label="相生加成">✦</i>}
                          </span>
                        </>
                      ) : (
                        <span className="territory-empty">
                          {locked ? <BrandIcon name="lock" /> : "＋"}
                          <small>{plot + 1}</small>
                        </span>
                      )}
                    </button>
                  );
                })}
            </IslandHabitat>
            <div className="territory-map-footer">
              <span>點選建築或空地；手機可左右移動地圖。</span>
              <button
                onClick={() => {
                  setTab("guide");
                  document
                    .getElementById("territory-workbench")
                    ?.scrollIntoView({ block: "start" });
                }}
              >
                建造指南
              </button>
            </div>
          </div>
          <p className="territory-message" role="status" aria-live="polite">
            {"選一塊空地，開始你的下一個小計畫。"}
          </p>
          <div className="territory-workbench" id="territory-workbench" tabIndex={-1}>
            <div className="territory-library">
              <div
                className="territory-tabs"
                role="tablist"
                aria-label="領地工具"
              >
                {(
                  [
                    ["build", "建築圖鑑"],
                    ["storage", "收納屋"],
                    ["quests", "和平委託"],
                    ["guide", "指南"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    role="tab"
                    id={`territory-tab-${id}`}
                    aria-controls={`territory-panel-${id}`}
                    tabIndex={tab === id ? 0 : -1}
                    onKeyDown={(e) => {
                      const tabs = [
                        "build",
                        "storage",
                        "quests",
                        "guide",
                      ] as const;
                      let index = tabs.indexOf(id);
                      if (e.key === "ArrowRight") index = (index + 1) % 4;
                      else if (e.key === "ArrowLeft") index = (index + 3) % 4;
                      else if (e.key === "Home") index = 0;
                      else if (e.key === "End") index = 3;
                      else return;
                      e.preventDefault();
                      setTab(tabs[index]);
                      setMoving(null);
                      document
                        .getElementById(`territory-tab-${tabs[index]}`)
                        ?.focus();
                    }}
                    aria-selected={tab === id}
                    key={id}
                    onClick={() => {
                      setTab(id);
                      setMoving(null);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {tab === "build" && (
                <div
                  role="tabpanel"
                  id={`territory-panel-${tab}`}
                  aria-labelledby={`territory-tab-${tab}`}
                  tabIndex={0}
                  aria-label="建築圖鑑"
                >
                  <div className="territory-filters">
                    <button
                      aria-pressed={filter === "all"}
                      onClick={() => setFilter("all")}
                    >
                      全部
                    </button>
                    <button
                      aria-pressed={filter === "production"}
                      onClick={() => setFilter("production")}
                    >
                      生產
                    </button>
                    <button
                      aria-pressed={filter === "decor"}
                      onClick={() => setFilter("decor")}
                    >
                      裝飾
                    </button>
                  </div>
                  <div className="territory-catalog">
                    {BUILDINGS.filter(
                      (b) =>
                        b.id !== "hall" &&
                        (filter === "all" || b.decor === (filter === "decor")),
                    ).map((b) => (
                      <button
                        key={b.id}
                        className={`territory-blueprint ${kind === b.id ? "chosen" : ""}`}
                        aria-pressed={kind === b.id}
                        onClick={() => {
                          setKind(b.id);
                          setMoving(null);
                          if (placed) {
                            const free = Array.from(
                              { length: plotCount(t) },
                              (_, i) => i,
                            ).find(
                              (i) => !t.buildings.some((x) => x.plot === i),
                            );
                            if (free !== undefined) setSelected(free);
                          }
                        }}
                      >
                        <Art spec={b} />
                        <strong>{b.name}</strong>
                        <span>
                          <BrandIcon name={elementIcon[b.element]} />
                          {b.element} · {b.decor ? "裝飾" : "生產"}
                        </span>
                        <small>
                          {level < b.unlock
                            ? `領地 ${b.unlock} 級解鎖`
                            : "查看建造"}
                        </small>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {tab === "storage" && (
                <div
                  className="territory-storage"
                  role="tabpanel"
                  id={`territory-panel-${tab}`}
                  aria-labelledby={`territory-tab-${tab}`}
                  tabIndex={0}
                  aria-label="收納屋"
                >
                  <h2>喜歡的建築，隨時再擺回來</h2>
                  <p>收納不退費、也不失去等級；收納中的建築暫停生產。</p>
                  {t.buildings.filter((b) => b.plot === null).length === 0 ? (
                    <p className="territory-empty-note">
                      還沒有收納建築。選取島上的建築，就能免費收納或搬移。
                    </p>
                  ) : (
                    <div className="territory-catalog">
                      {t.buildings
                        .filter((b) => b.plot === null)
                        .map((b) => (
                          <div className="territory-stored-item" key={b.id}>
                            <button
                              className={`territory-blueprint ${moving === b.id ? "chosen" : ""}`}
                              key={b.id}
                              onClick={() => setMoving(b.id)}
                            >
                              <Art spec={buildingSpec(b.kind)!} />
                              <strong>{buildingSpec(b.kind)!.name}</strong>
                              <span>{b.level} 級</span>
                              <small>選擇空地放回</small>
                            </button>
                            <button
                              className="territory-salvage"
                              disabled={disabled}
                              onClick={() => setDemolish(b.id)}
                            >
                              拆解建築
                            </button>
                            {demolish === b.id && (
                              <div className="territory-demolish-confirm">
                                <p>
                                  確定拆解？只返還一半原始建造材料，升級與居民安排不保留。夥伴仍留在收藏。
                                </p>
                                <button
                                  disabled={disabled}
                                  onClick={() =>
                                    run(
                                      "demolish",
                                      { building: b.id },
                                      "已拆解並收回一半建造材料",
                                    )
                                  }
                                >
                                  確認拆解
                                </button>
                                <button onClick={() => setDemolish(null)}>
                                  取消
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
              {tab === "quests" && job && (
                <div
                  className="territory-quests"
                  role="tabpanel"
                  id={`territory-panel-${tab}`}
                  aria-labelledby={`territory-tab-${tab}`}
                  tabIndex={0}
                  aria-label="和平委託"
                >
                  <article>
                    <BrandIcon name="boat" />
                    <h2>{job.name}</h2>
                    <p>
                      為島上的朋友準備材料，完成後獲得資源與 6
                      繁榮。沒有連續登入要求，隨時都能接下一份。
                    </p>
                    <h3>交付材料</h3>
                    <Resources value={job.cost} />
                    <h3>完成獎勵</h3>
                    <Resources value={job.reward} prefix="＋" />
                    <button
                      className="territory-primary"
                      disabled={disabled || !affordable(available, job.cost)}
                      onClick={() =>
                        run(
                          "commission",
                          {},
                          "謝謝你的幫忙！新的和平委託已經送來了。",
                        )
                      }
                    >
                      完成委託
                    </button>
                    <small>已完成 {t.commissions} 份委託</small>
                  </article>
                  <h2>領地里程碑</h2>
                  {ACHIEVEMENTS.map((a) => (
                    <article className="territory-achievement" key={a.id}>
                      <div>
                        <h3>{a.name}</h3>
                        <p>{a.description}</p>
                        <Resources value={a.reward} />
                      </div>
                      <button
                        disabled={
                          disabled ||
                          !a.goal(t) ||
                          t.achievements.includes(a.id)
                        }
                        onClick={() =>
                          run(
                            "achievement",
                            { achievement: a.id },
                            `已領取「${a.name}」的禮物`,
                          )
                        }
                      >
                        {t.achievements.includes(a.id)
                          ? "已領取"
                          : a.goal(t)
                            ? "領取禮物"
                            : "建造中"}
                      </button>
                    </article>
                  ))}
                </div>
              )}
              {tab === "guide" && (
                <div
                  className="territory-guide"
                  role="tabpanel"
                  id={`territory-panel-${tab}`}
                  aria-labelledby={`territory-tab-${tab}`}
                  tabIndex={0}
                  aria-label="建造指南"
                >
                  <h2>用自己的步調，建造一座家</h2>
                  <ol>
                    <li>從圖鑑選建築，再點地圖空地，確認材料後建造。</li>
                    <li>
                      主城一直供應三種資源。點「收取產出」即可收好，建造時也會自動結算。
                    </li>
                    <li>建造得 8 繁榮，升級與和平委託也會讓領地成長。</li>
                    <li>領地 3 級、6 級可以擴張；建築最多升到 5 級。</li>
                    <li>
                      選建築可免費搬移、收納或邀請已有夥伴。夥伴仍能陪你去其他航線。
                    </li>
                  </ol>
                  <h3>五行相生，一起讓家園成長</h3>
                  <p>
                    {GENERATION_RULES}
                    。上下左右相鄰的建築，若來源屬性生出自己的屬性，生產增加
                    10%；每座最多一次。裝飾也能提供相生。
                  </p>
                  <p>
                    這裡是和平家園，相剋不會破壞建築或扣資源；對戰中的相剋規則照常保留。
                  </p>
                  <h3>安心離開，隨時回來</h3>
                  <p>
                    離線產出最多累積 8 小時，每種資源最多存
                    50,000。沒有倒扣、損壞或錯過一天的懲罰。畫面的待收數字是預估，實際數量以雲端結算為準。
                  </p>
                  <p>星夜與晨光是自己的景色選擇，不影響產量。</p>
                </div>
              )}
            </div>
            <aside className="territory-inspector" id="territory-inspector" tabIndex={-1}>
              <h2>土地 {selected + 1}</h2>
              {movingBuilding ? (
                <>
                  <Art spec={buildingSpec(movingBuilding.kind)!} />
                  <h3>選擇新的位置</h3>
                  <p>搬移免費，等級與居民都會保留。</p>
                  <button
                    className="territory-primary"
                    disabled={disabled || !!placed}
                    onClick={() =>
                      run(
                        "move",
                        { building: moving, plot: selected },
                        "已放到新的位置",
                      )
                    }
                  >
                    放在這裡
                  </button>
                  <button onClick={() => setMoving(null)}>取消搬移</button>
                </>
              ) : placed && selectedSpec ? (
                <>
                  <Art spec={selectedSpec} />
                  <h3>
                    {selectedSpec.name} · {placed.level} 級
                  </h3>
                  <p>{selectedSpec.description}</p>
                  <p>
                    <BrandIcon name={elementIcon[selectedSpec.element]} />
                    {selectedSpec.element}屬性
                    {hasSynergy(t, placed) ? " · 相生產量 +10%" : ""}
                  </p>
                  {RESOURCE_KEYS.some(
                    (k) => selectedSpec.production[k] > 0,
                  ) && (
                    <>
                      <h4>基礎每小時產出</h4>
                      <Resources
                        value={
                          Object.fromEntries(
                            RESOURCE_KEYS.map((k) => [
                              k,
                              selectedSpec.production[k] * placed.level,
                            ]),
                          ) as Stock
                        }
                      />
                    </>
                  )}
                  {placed.kind !== "hall" && placed.level < 5 && (
                    <>
                      <h4>升級材料</h4>
                      <Resources
                        value={buildingCost(selectedSpec, placed.level)}
                      />
                      <button
                        className="territory-primary"
                        disabled={
                          disabled ||
                          !affordable(
                            available,
                            buildingCost(selectedSpec, placed.level),
                          )
                        }
                        onClick={() =>
                          run(
                            "upgrade",
                            { building: placed.id },
                            "升級完成！建築與家園一起成長。",
                          )
                        }
                      >
                        升到 {placed.level + 1} 級
                      </button>
                    </>
                  )}
                  <div className="territory-actions">
                    <button
                      disabled={disabled}
                      onClick={() => setMoving(placed.id)}
                    >
                      免費搬移
                    </button>
                    {placed.kind !== "hall" && (
                      <button
                        disabled={disabled}
                        onClick={() =>
                          run(
                            "store",
                            { building: placed.id },
                            "已收進收納屋，隨時可以免費擺回。",
                          )
                        }
                      >
                        收進收納屋
                      </button>
                    )}
                  </div>
                  <label className="territory-resident-picker">
                    <span>邀請夥伴入住</span>
                    <select
                      value={
                        placed.resident && profile.owned[placed.resident]
                          ? placed.resident
                          : ""
                      }
                      disabled={disabled}
                      onChange={(e) =>
                        run(
                          "resident",
                          { building: placed.id, pet: e.target.value || null },
                          "夥伴的家安排好了",
                        )
                      }
                    >
                      <option value="">暫不安排</option>
                      {ROSTER.filter((p) => profile.owned[p.id] > 0).map(
                        (p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ),
                      )}
                    </select>
                  </label>
                  <small>每位夥伴住一處，不會消耗卡片或改變原有等級。</small>
                </>
              ) : (
                <>
                  <Art spec={spec} />
                  <h3>{spec.name}</h3>
                  <p>{spec.description}</p>
                  <h4>建造材料</h4>
                  <Resources value={spec.cost} />
                  <button
                    className="territory-primary"
                    disabled={
                      disabled ||
                      level < spec.unlock ||
                      !affordable(available, spec.cost) ||
                      t.buildings.length >= 48 || t.nextId >= 1_000_000
                    }
                    onClick={() =>
                      run(
                        "build",
                        { kind: spec.id, plot: selected },
                        `${spec.name}建好了！可以邀請夥伴入住。`,
                      )
                    }
                  >
                    {level < spec.unlock
                      ? `領地 ${spec.unlock} 級解鎖`
                      : "確認建造"}
                  </button>
                  <small>立即完成 · 搬移免費 · 繁榮 +8</small>
                  {!affordable(available, spec.cost) && (
                    <p>材料還不夠，先收取產出或等主城補充。</p>
                  )}
                </>
              )}
              <details className="territory-plot-list">
                <summary>用土地清單選位置</summary>
                <div>
                  {Array.from({ length: plotCount(t) }, (_, i) => {
                    const b = t.buildings.find((x) => x.plot === i);
                    return (
                      <button
                        key={i}
                        aria-pressed={selected === i}
                        onClick={() => setSelected(i)}
                      >
                        {i + 1} · {b ? buildingSpec(b.kind)!.name : "空地"}
                      </button>
                    );
                  })}
                </div>
              </details>
              <div className="territory-expansion" id="territory-expansion" tabIndex={-1}>
                <CastleExpansion profile={profile} disabled={disabled} onExpand={() => void run("expand", {}, "家變大了！新的土地已開放，原有建築都保留。")} onTrain={onTrain} />
              </div>
            </aside>
          </div>
          </>}
        </>
      )}
    </section>
  );
  return <>{annotateTree(body, grade)}</>;
}
