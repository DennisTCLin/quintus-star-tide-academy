// 數學島：一年級上下學期十八個單元、六十一個小遊戲。
// 每個小遊戲 = 題目產生器 + 可以動手的畫面 + 夥伴示範腳本 + 一年級聽得懂的語音。
// 同一個觀念依「具體 → 圖像 → 抽象」出三種樣子：學一學動手、玩一玩看圖、神獸關只剩考卷上的樣子。
import { useEffect } from "react";
import { SEMESTER_GAMES } from './semester';
import { LOWER_GAMES } from './lower';
import { UPPER_GAMES } from './upper';
import { cn, cnq, numOpts, pick, ri, shuffle } from "./rng";

export type Mode = "learn" | "play" | "boss" | "mock";
/** 挑戰神獸與島主大挑戰：考卷模式（沒有道具、數字鍵盤填答、題目按了才唸）。 */
export const isExam = (mode: Mode) => mode === "boss" || mode === "mock";
/** text：畫面上的題目（阿拉伯數字，標注音）；say：唸出來的題目（國字數字）。 */
export type Item = { id: string; k: string; unit: string; p: any; answer: string; choices: string[]; say: string; text: string };
export type View = Record<string, any>;
export type SceneProps = {
  item: Item;
  view: View;
  mode: Mode;
  demo: boolean;
  /** 已作答，畫面可以揭曉答案。 */
  done: boolean;
  act: (a: any) => void;
  choose: (v: string) => void;
  eliminated: string | null;
  /** 考卷模式：鍵盤上選了但還沒按確定的數字。 */
  pending?: string | null;
  tried?: string[];
  busy?: boolean;
};
export type DemoStep = { say: string; view: View };
export type Game = {
  k: string;
  unit: string;
  /** 給家長看的觀念名稱。 */
  name: string;
  /** 給孩子聽的一句提醒。 */
  tip: string;
  answerText?: (item: Item) => string;
  make: (exam: boolean) => Omit<Item, "k" | "unit">;
  init: (item: Item, mode: Mode) => View;
  act?: (item: Item, view: View, a: any) => View;
  /** 動手之後要唸的話（例如點數時唸出數到幾）。考卷模式不唸。 */
  actSay?: (item: Item, view: View) => string | undefined;
  /** 何時可以作答。學一學通常要先動手完成。 */
  ready: (item: Item, view: View, mode: Mode) => boolean;
  /** 在畫面裡點選答案（泡泡、盤子），不顯示下方的答案按鈕或鍵盤。 */
  sceneChoice?: (item: Item, mode: Mode) => boolean;
  rocket?: boolean;
  /** 考卷上沒有這種題型，神獸關與島主不出。 */
  noExam?: boolean;
  Scene: (p: SceneProps) => JSX.Element;
  /** 考卷模式的畫面；沒有就沿用 Scene。 */
  Exam?: (p: SceneProps) => JSX.Element;
  demo: () => { item: Item; steps: DemoStep[] };
};

import { ISLAND_UNITS, UNIT_BY_ID } from "./catalog";
export { ISLAND_UNITS, UNIT_BY_ID, LOCKED_UNITS, ISLAND_KING } from "./catalog";

const range = (n: number) => Array.from({ length: n }, (_, i) => i);
const interactive = (p: SceneProps) => !p.demo && !p.done;
const helped = (mode: Mode) => mode === "learn" || mode === "play";
const same = (text: string) => ({ say: text, text });

function TenFrame({ filled, extra = 0, mark = "●", extraMark = "●", small = false, onCell, hl }: { filled: number; extra?: number; mark?: string; extraMark?: string; small?: boolean; onCell?: (i: number) => void; hl?: boolean }) {
  return (
    <div className={`isl-frame ${small ? "small" : ""} ${hl ? "hl" : ""}`}>
      {range(10).map((i) =>
        i < filled ? (
          <span key={i} className="cell full">{mark}</span>
        ) : i < filled + extra ? (
          <span key={i} className="cell added">{extraMark}</span>
        ) : onCell ? (
          <button key={i} className="cell empty" aria-label="放一個" onClick={() => onCell(i)} />
        ) : (
          <span key={i} className="cell empty" />
        ),
      )}
    </div>
  );
}
const Things = ({ n, e, cls = "" }: { n: number; e: string; cls?: string }) => (
  <div className={`isl-things ${cls}`}>{range(n).map((i) => <span key={i}>{e}</span>)}</div>
);
/** 考卷上的答案格：作答前顯示鍵盤選的數字，作答後顯示正確答案。 */
const Box = ({ p }: { p: SceneProps }) => (
  <span className={`isl-box ${p.done ? "shown" : p.pending != null ? "pending" : ""}`}>{p.done ? p.item.answer : (p.pending ?? "")}</span>
);
/** 課本「分與合」的數字圖：上面是全部，下面是兩份。 */
function Bond({ top, left, right }: { top: JSX.Element | number; left: JSX.Element | number; right: JSX.Element | number }) {
  return (
    <div className="isl-bond">
      <svg viewBox="0 0 220 150" aria-hidden="true">
        <line x1="110" y1="42" x2="52" y2="112" />
        <line x1="110" y1="42" x2="168" y2="112" />
      </svg>
      <span className="b top">{top}</span>
      <span className="b left">{left}</span>
      <span className="b right">{right}</span>
    </div>
  );
}
const Paper = ({ children }: { children: React.ReactNode }) => <div className="isl-scene isl-paper">{children}</div>;

/* ---------------- 1A-01 10以內的數 ---------------- */
const COUNT_THINGS = [
  { e: "🐟", name: "魚", q: "條" },
  { e: "🐢", name: "海龜", q: "隻" },
  { e: "🦀", name: "螃蟹", q: "隻" },
  { e: "🐚", name: "貝殼", q: "個" },
  { e: "⭐", name: "海星", q: "顆" },
];
function pondSpots(n: number) {
  return shuffle(range(10))
    .slice(0, n)
    .map((c) => ({ x: (c % 5) * 19 + 12 + ri(-1, 1), y: Math.floor(c / 5) * 44 + 28 + ri(-5, 5) }));
}
const count: Game = {
  k: "count",
  unit: "1A-01",
  name: "點數（一個一個數）",
  tip: "一個一個點，點過的不要再點。最後數到幾，就是有幾個。",
  make() {
    const n = ri(3, 10),
      t = pick(COUNT_THINGS);
    return { id: `isl-count-${n}-${COUNT_THINGS.indexOf(t)}`, p: { n, ...t, pos: pondSpots(n) }, answer: String(n), choices: numOpts(n, 1, 10), ...same(`數一數，有幾${t.q}${t.name}？`) };
  },
  init: () => ({ tapped: [] }),
  act: (_i, v, a) => (v.tapped.includes(a.i) ? v : { tapped: [...v.tapped, a.i] }),
  actSay: (_i, v) => cn(v.tapped.length),
  ready: (item, v, mode) => mode !== "learn" || v.tapped.length === item.p.n,
  Scene(props) {
    const { n, e, pos } = props.item.p;
    const tapped: number[] = props.view.tapped ?? [];
    return (
      <div className="isl-scene isl-pond">
        {range(n).map((i) => {
          const order = tapped.indexOf(i);
          return (
            <button
              key={i}
              className={`isl-obj ${order >= 0 ? "on" : ""}`}
              style={{ left: `${pos[i].x}%`, top: `${pos[i].y}%`, animationDelay: `${(i % 4) * 0.35}s` }}
              disabled={!interactive(props) || order >= 0}
              aria-label="點一下，數它"
              onClick={() => props.act({ i })}
            >
              <span>{e}</span>
              {order >= 0 && <b className="isl-badge">{order + 1}</b>}
            </button>
          );
        })}
      </div>
    );
  },
  demo() {
    const item = { ...mk(count), p: { n: 5, ...COUNT_THINGS[0], pos: [{ x: 12, y: 26 }, { x: 33, y: 60 }, { x: 50, y: 24 }, { x: 68, y: 64 }, { x: 86, y: 30 }] } };
    return {
      item,
      steps: [
        { say: "我們來數魚。一條一條點，點過的魚會出現數字。", view: { tapped: [] } },
        ...range(5).map((i) => ({ say: cn(i + 1), view: { tapped: range(i + 1) } })),
        { say: "最後數到五，所以一共有五條魚！", view: { tapped: range(5) } },
      ],
    };
  },
};

const find: Game = {
  k: "find",
  unit: "1A-01",
  name: "認數字（數量、讀音和數字配對）",
  tip: "仔細聽，或看十格框有幾格滿了，再找一樣的數字。",
  make(exam) {
    const n = ri(1, 10),
      how = exam ? "dots" : pick(["sound", "dots", "flash"] as const);
    const opts = shuffle(numOpts(n, 1, 10, 4));
    const text =
      how === "sound" ? `找出數字${cn(n)}，把它戳破！` : how === "flash" ? "點點只出現一下下。有幾個？戳破一樣的數字泡泡！" : exam ? "數一數，有幾個點點？" : "有幾個點點？戳破一樣的數字泡泡！";
    return { id: `isl-find-${how[0]}-${n}`, p: { n, how, opts }, answer: String(n), choices: opts, ...same(text) };
  },
  init: () => ({ hidden: false, shown: 0 }),
  act: (_i, v, a) => (a.hide ? { ...v, hidden: true } : a.show ? { ...v, hidden: false, shown: (v.shown ?? 0) + 1 } : v),
  ready: () => true,
  sceneChoice: (_item, mode) => !isExam(mode),
  Scene(props) {
    const { n, how, opts } = props.item.p;
    const { act, view, demo, done } = props;
    const flashing = how === "flash" && !demo && !done && !view.hidden;
    useEffect(() => {
      if (!flashing) return;
      const t = window.setTimeout(() => act({ hide: true }), 1500);
      return () => window.clearTimeout(t);
    }, [flashing, view.shown]);
    const covered = how === "flash" && view.hidden && !done;
    return (
      <div className="isl-scene isl-deep">
        {covered ? <div className="isl-cover">?</div> : <TenFrame filled={n} small />}
        {covered && props.mode === "learn" && interactive(props) && (
          <button className="isl-action" onClick={() => act({ show: true })}>👀 再看一次</button>
        )}
        <div className="isl-bubbles">
          {opts.map((v: string, i: number) => (
            <button
              key={v}
              className={`isl-bubble ${view.hl === v ? "hl" : ""} ${view.popped === v || (done && v === props.item.answer) ? "pop" : ""} ${props.eliminated === v ? "gone" : ""}`}
              style={{ animationDelay: `${i * 0.45}s` }}
              disabled={!interactive(props) || props.eliminated === v}
              onClick={() => props.choose(v)}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
    );
  },
  Exam: (props) => (
    <Paper>
      <TenFrame filled={props.item.p.n} />
      <p className="isl-paperline">
        有 <Box p={props} /> 個
      </p>
    </Paper>
  ),
  demo() {
    const item = { ...mk(find), p: { n: 4, how: "sound", opts: ["2", "4", "6", "7"] }, answer: "4" };
    return {
      item,
      steps: [
        { say: "我說一個數字，你找出一樣的泡泡。", view: {} },
        { say: "我說：四。", view: {} },
        { say: "四在這裡！", view: { hl: "4" } },
        { say: "戳一下，啵！泡泡破掉了。", view: { hl: "4", popped: "4" } },
      ],
    };
  },
};

/* ---------------- 1A-04 分與合 ---------------- */
const split: Game = {
  k: "split",
  unit: "1A-04",
  name: "數的分解（把數字分成兩份）",
  tip: "全部有幾顆，小熊拿走幾顆，剩下的就是小兔的。",
  make(exam) {
    const n = ri(3, 10),
      a = ri(1, n - 1);
    const words = exam
      ? { text: `${n} 可以分成 ${a} 和幾？`, say: `${cn(n)}可以分成${cn(a)}和幾？` }
      : { text: `有 ${n} 顆糖果。小熊拿 ${a} 顆，小兔的盤子有幾顆？`, say: `有${cnq(n)}顆糖果。小熊拿${cnq(a)}顆，小兔的盤子有幾顆？` };
    return { id: `isl-split-${n}-${a}`, p: { n, a }, answer: String(n - a), choices: numOpts(n - a, 0, n), ...words };
  },
  init: (item, mode) => (mode === "learn" ? { moved: 0, rest: false } : { moved: item.p.a, rest: true }),
  act(item, v) {
    if (v.rest) return v;
    const moved = v.moved + 1;
    return { moved, rest: moved >= item.p.a };
  },
  actSay: (_i, v) => cn(v.moved),
  ready: (_i, v) => v.rest,
  Scene(props) {
    const { n, a } = props.item.p;
    const { moved = 0, rest = false } = props.view;
    const jar = rest ? 0 : n - moved;
    const covered = !props.demo && !props.done && props.mode !== "learn";
    return (
      <div className="isl-scene isl-shop">
        {jar > 0 && (
          <div className="isl-jar">
            {range(jar).map((i) => (
              <button key={i} className="isl-candy" disabled={!interactive(props) || props.mode !== "learn"} aria-label="給小熊一顆" onClick={() => props.act({})}>🍬</button>
            ))}
          </div>
        )}
        {props.mode === "learn" && !rest && !props.demo && <p className="isl-cue">點糖果，給小熊 {a} 顆</p>}
        <div className="isl-plates">
          <div className="isl-plate">
            <span className="who">🐻</span>
            <Things n={moved} e="🍬" />
            <b>{moved}</b>
          </div>
          <div className={`isl-plate ${props.view.hl ? "hl" : ""}`}>
            <span className="who">🐰</span>
            {covered ? <span className="isl-lid">?</span> : <Things n={rest ? n - a : 0} e="🍬" />}
            {!covered && rest && (props.done || props.demo || props.mode === "learn") ? <b>{props.done || props.demo ? n - a : ""}</b> : null}
          </div>
        </div>
      </div>
    );
  },
  Exam: (props) => (
    <Paper>
      <Bond top={props.item.p.n} left={props.item.p.a} right={<Box p={props} />} />
    </Paper>
  ),
  demo() {
    const item = { ...mk(split), p: { n: 6, a: 2 }, answer: "4" };
    return {
      item,
      steps: [
        { say: "這裡有六顆糖果，要分給小熊和小兔。", view: { moved: 0, rest: false } },
        { say: "小熊拿一顆。", view: { moved: 1, rest: false } },
        { say: "兩顆。小熊拿了兩顆。", view: { moved: 2, rest: false } },
        { say: "剩下的都給小兔。一、二、三、四。", view: { moved: 2, rest: true } },
        { say: "六可以分成二和四！", view: { moved: 2, rest: true, hl: true } },
      ],
    };
  },
};

const MERGE_THINGS = [
  { e: "🍎", name: "蘋果", q: "顆" },
  { e: "🍓", name: "草莓", q: "顆" },
  { e: "🐣", name: "小雞", q: "隻" },
];
const merge: Game = {
  k: "merge",
  unit: "1A-04",
  name: "數的合成（兩份合起來）",
  tip: "倒在一起，再從頭數一次。",
  make(exam) {
    const a = ri(1, 6),
      b = ri(1, 10 - a),
      t = pick(MERGE_THINGS);
    const words = exam
      ? { text: `${a} 和 ${b} 合起來是多少？`, say: `${cn(a)}和${cn(b)}合起來是多少？` }
      : { text: `左邊有 ${a} ${t.q}${t.name}，右邊有 ${b} ${t.q}。合起來有幾${t.q}？`, say: `左邊有${cnq(a)}${t.q}${t.name}，右邊有${cnq(b)}${t.q}。合起來有幾${t.q}？` };
    return { id: `isl-merge-${a}-${b}`, p: { a, b, ...t }, answer: String(a + b), choices: numOpts(a + b, 2, 10), ...words };
  },
  init: () => ({ merged: false }),
  act: (_i, v) => ({ ...v, merged: true }),
  ready: (_i, v, mode) => mode !== "learn" || v.merged,
  Scene(props) {
    const { a, b, e } = props.item.p;
    const merged = props.view.merged || props.done;
    return (
      <div className="isl-scene isl-farm">
        {merged ? (
          <div className="isl-basket big"><Things n={a + b} e={e} /><span className="basket">🧺</span></div>
        ) : (
          <div className="isl-two">
            <div className="isl-basket"><Things n={a} e={e} /><span className="basket">🧺</span><b>{a}</b></div>
            <span className="isl-op">+</span>
            <div className="isl-basket"><Things n={b} e={e} /><span className="basket">🧺</span><b>{b}</b></div>
          </div>
        )}
        {!merged && helped(props.mode) && interactive(props) && (
          <button className="isl-action" onClick={() => props.act({})}>🧺 倒在一起</button>
        )}
      </div>
    );
  },
  Exam: (props) => (
    <Paper>
      <Bond top={<Box p={props} />} left={props.item.p.a} right={props.item.p.b} />
    </Paper>
  ),
  demo() {
    const item = { ...mk(merge), p: { a: 3, b: 2, ...MERGE_THINGS[0] }, answer: "5" };
    return {
      item,
      steps: [
        { say: "左邊有三顆蘋果，右邊有兩顆。", view: { merged: false } },
        { say: "把它們倒在一起！", view: { merged: true } },
        { say: "一起數：一、二、三、四、五。合起來是五顆！", view: { merged: true } },
      ],
    };
  },
};

const zero: Game = {
  k: "zero",
  unit: "1A-04",
  name: "認識 0（一個都沒有）",
  tip: "一個都沒有，就是零。",
  make() {
    if (ri(0, 2) === 0) {
      const m = ri(2, 4);
      return { id: `isl-zero-e-${m}`, p: { v: "eat", m }, answer: "0", choices: ["0", "1", "2"], text: `小狐狸把 ${m} 片餅乾都吃光光了。盤子裡還有幾片？`, say: `小狐狸把${cnq(m)}片餅乾都吃光光了。盤子裡還有幾片？` };
    }
    const x = ri(1, 3),
      y = ri(4, 6);
    return { id: `isl-zero-p-${x}-${y}`, p: { v: "plates", counts: shuffle([0, x, y]) }, answer: "0", choices: ["0", String(x), String(y)], text: "哪一個盤子是 0？一片都沒有的那個。", say: "哪一個盤子是零？一片都沒有的那個。" };
  },
  init: (item, mode) => (item.p.v === "eat" ? { eaten: helped(mode) ? 0 : item.p.m } : {}),
  act: (item, v) => ({ ...v, eaten: Math.min(item.p.m, (v.eaten ?? 0) + 1) }),
  ready: (item, v) => item.p.v !== "eat" || v.eaten >= item.p.m,
  sceneChoice: (item) => item.p.v === "plates",
  Scene(props) {
    const { p } = props.item;
    const { act, demo, view } = props;
    const eating = p.v === "eat" && !demo && (view.eaten ?? 0) < p.m;
    useEffect(() => {
      if (!eating) return;
      const t = window.setTimeout(() => act({}), 750);
      return () => window.clearTimeout(t);
    }, [eating, view.eaten]);
    if (p.v === "eat")
      return (
        <div className="isl-scene isl-shop">
          <span className={`isl-eater ${eating ? "munch" : ""}`}>🦊</span>
          <div className="isl-plate wide">
            <Things n={p.m - (view.eaten ?? 0)} e="🍪" />
            {(view.eaten ?? 0) >= p.m && <span className="crumbs">· · ·</span>}
          </div>
        </div>
      );
    return (
      <div className="isl-scene isl-shop">
        <div className="isl-plates three">
          {p.counts.map((c: number) => (
            <button
              key={c}
              className={`isl-plate tap ${view.hl === String(c) || (props.done && c === 0) ? "hl" : ""} ${props.eliminated === String(c) ? "gone" : ""}`}
              disabled={!interactive(props) || props.eliminated === String(c)}
              onClick={() => props.choose(String(c))}
              aria-label={`有 ${c} 片的盤子`}
            >
              <Things n={c} e="🍪" />
              {c === 0 && <span className="crumbs">　</span>}
            </button>
          ))}
        </div>
      </div>
    );
  },
  demo() {
    const item = { ...mk(zero), p: { v: "plates", counts: [2, 0, 3] }, answer: "0" };
    return {
      item,
      steps: [
        { say: "一個都沒有，就是零。", view: {} },
        { say: "看看這三個盤子。", view: {} },
        { say: "這個盤子空空的，一片都沒有，它就是零！", view: { hl: "0" } },
      ],
    };
  },
};

/* ---------------- 1A-06 10以內的加法 ---------------- */
const RIDERS = [
  { e: "🦆", name: "小鴨" },
  { e: "🐧", name: "企鵝" },
  { e: "🐸", name: "青蛙" },
];
const boat: Game = {
  k: "boat",
  unit: "1A-06",
  name: "加法的意義（又來了，合起來）",
  tip: "又來了，就是要加起來。從船上有幾隻開始，接著往下數。",
  make() {
    const a = ri(1, 6),
      b = ri(1, Math.min(4, 10 - a)),
      t = pick(RIDERS);
    return { id: `isl-boat-${a}-${b}`, p: { a, b, ...t }, answer: String(a + b), choices: numOpts(a + b, 2, 10), text: `船上有 ${a} 隻${t.name}，又來了 ${b} 隻。現在船上有幾隻？`, say: `船上有${cnq(a)}隻${t.name}，又來了${cnq(b)}隻。現在船上有幾隻？` };
  },
  init: () => ({ boarded: false }),
  act: (_i, v) => ({ ...v, boarded: true }),
  ready: (_i, v, mode) => mode !== "learn" || v.boarded,
  Scene(props) {
    const { a, b, e } = props.item.p;
    const boarded = props.view.boarded || props.done;
    const showEq = props.view.eq || (props.done && helped(props.mode));
    return (
      <div className="isl-scene isl-harbor">
        <div className="isl-dock">{!boarded && <Things n={b} e={e} cls="hop" />}</div>
        <div className={`isl-boat ${boarded ? "full" : ""}`}>
          <Things n={boarded ? a + b : a} e={e} />
          <span className="hull">⛵</span>
        </div>
        {!boarded && helped(props.mode) && interactive(props) && (
          <button className="isl-action" onClick={() => props.act({})}>🦶 跳上船！</button>
        )}
        {showEq && <p className="isl-eq">{a} + {b} = {props.done || props.view.show ? a + b : "?"}</p>}
      </div>
    );
  },
  Exam: (props) => (
    <Paper>
      <p className="isl-paperline">
        答：<Box p={props} /> 隻
      </p>
    </Paper>
  ),
  demo() {
    const item = { ...mk(boat), p: { a: 3, b: 2, ...RIDERS[0] }, answer: "5" };
    return {
      item,
      steps: [
        { say: "船上有三隻小鴨。", view: { boarded: false } },
        { say: "又來了兩隻，跳上船！", view: { boarded: true } },
        { say: "從三接著數：四、五。現在有五隻！", view: { boarded: true } },
        { say: "寫成算式：三加二等於五。", view: { boarded: true, eq: true, show: true } },
      ],
    };
  },
};

/** 跳格子碼頭：0–10 的一直線碼頭，小鴨每跳一格唸出那格的數字（直線數字棋盤）。 */
const hop: Game = {
  k: "hop",
  unit: "1A-06",
  name: "跳格子（在數線上往後數）",
  tip: "從小鴨站的地方開始，跳一格，就數下一個數字。",
  noExam: true,
  make() {
    const b = ri(1, 3),
      a = ri(0, 10 - b);
    return { id: `isl-hop-${a}-${b}`, p: { a, b }, answer: String(a + b), choices: numOpts(a + b, 0, 10), text: `小鴨站在 ${a}，再跳 ${b} 格，會到哪一格？`, say: `小鴨站在${cn(a)}，再跳${cnq(b)}格，會到哪一格？` };
  },
  init: () => ({ hops: 0 }),
  act: (item, v) => ({ hops: Math.min(item.p.b, v.hops + 1) }),
  actSay: (item, v) => cn(item.p.a + v.hops),
  ready: (item, v, mode) => mode !== "learn" || v.hops >= item.p.b,
  Scene(props) {
    const { a, b } = props.item.p;
    const hops = props.done ? b : (props.view.hops ?? 0);
    const at = a + hops;
    return (
      <div className="isl-scene isl-harbor isl-line-scene">
        <div className="isl-numline" role="img" aria-label={`小鴨在 ${at}`}>
          {range(11).map((i) => (
            <div key={i} className={`slot ${i === a ? "start" : ""} ${i > a && i <= at ? "trail" : ""}`}>
              <span className="duck">{i === at ? "🦆" : ""}</span>
              <b>{i}</b>
            </div>
          ))}
        </div>
        {helped(props.mode) && interactive(props) && hops < b && (
          <button className="isl-action" onClick={() => props.act({})}>🦆 跳一格</button>
        )}
      </div>
    );
  },
  demo() {
    const item = { ...mk(hop), p: { a: 3, b: 2 }, answer: "5" };
    return {
      item,
      steps: [
        { say: "小鴨站在三。牠要再跳兩格。", view: { hops: 0 } },
        { say: "跳一格，四。", view: { hops: 1 } },
        { say: "再跳一格，五。", view: { hops: 2 } },
        { say: "跳了兩格，到五！三再跳兩格，就是五。", view: { hops: 2 } },
      ],
    };
  },
};

const add: Game = {
  k: "add",
  unit: "1A-06",
  name: "加法算式（10 以內）",
  tip: "先記住前面的數字，再接著往下數。",
  rocket: true,
  make() {
    let a = ri(0, 7),
      b = ri(0, 10 - a);
    if (a + b === 0) b = ri(1, 5);
    return { id: `isl-add-${a}-${b}`, p: { a, b }, answer: String(a + b), choices: numOpts(a + b, 0, 10), text: `${a} 加 ${b}，等於多少？`, say: `${cn(a)}加${cn(b)}，等於多少？` };
  },
  init: () => ({}),
  ready: () => true,
  Scene(props) {
    const { a, b } = props.item.p;
    const dots = helped(props.mode) || props.demo;
    return (
      <div className="isl-scene isl-space">
        <div className="isl-sum">
          <div className={`term ${props.view.hlA ? "hl" : ""}`}>
            <b>{a}</b>
            {dots && <Things n={a} e="🟡" cls="dots" />}
          </div>
          <span className="isl-op">+</span>
          <div className={`term ${props.view.hlB ? "hl" : ""}`}>
            <b>{b}</b>
            {dots && <Things n={b} e="🔵" cls="dots" />}
          </div>
          <span className="isl-op">=</span>
          <div className="term"><b>{props.done || props.view.show ? a + b : "?"}</b></div>
        </div>
      </div>
    );
  },
  Exam: (props) => (
    <Paper>
      <p className="isl-paperline big">
        {props.item.p.a} + {props.item.p.b} = <Box p={props} />
      </p>
    </Paper>
  ),
  demo() {
    const item = { ...mk(add), p: { a: 2, b: 3 }, answer: "5" };
    return {
      item,
      steps: [
        { say: "二加三，等於多少呢？", view: {} },
        { say: "先有兩個點點。", view: { hlA: true } },
        { say: "再加三個：三、四、五。", view: { hlA: true, hlB: true } },
        { say: "所以二加三等於五！", view: { hlA: true, hlB: true, show: true } },
      ],
    };
  },
};

const ten: Game = {
  k: "ten",
  unit: "1A-06",
  name: "湊 10（十的好朋友）",
  tip: "數一數空格，空幾格就還要放幾個。",
  make(exam) {
    const a = ri(1, 9);
    const words = exam
      ? { text: `${a} 和幾合起來是 10？`, say: `${cn(a)}和幾合起來是十？` }
      : { text: `框框裝滿是 10。已經有 ${a} 個，還要放幾個？`, say: `框框裝滿是十。已經有${cnq(a)}個，還要放幾個？` };
    return { id: `isl-ten-${a}`, p: { a }, answer: String(10 - a), choices: numOpts(10 - a, 1, 9), ...words };
  },
  init: () => ({ added: 0 }),
  act: (item, v) => ({ ...v, added: Math.min(10 - item.p.a, v.added + 1) }),
  actSay: (_i, v) => cn(v.added),
  ready: (item, v, mode) => mode !== "learn" || v.added === 10 - item.p.a,
  Scene(props) {
    const { a } = props.item.p;
    const added = props.done ? 10 - a : (props.view.added ?? 0);
    const canFill = helped(props.mode) && interactive(props);
    return (
      <div className="isl-scene isl-space">
        <TenFrame filled={a} extra={added} mark="⭐" extraMark="✨" onCell={canFill ? () => props.act({}) : undefined} hl={added === 10 - a} />
        {helped(props.mode) && !props.demo && !props.done && added < 10 - a && <p className="isl-cue">點空格，把框框裝滿</p>}
      </div>
    );
  },
  Exam: (props) => (
    <Paper>
      <Bond top={10} left={props.item.p.a} right={<Box p={props} />} />
    </Paper>
  ),
  demo() {
    const item = { ...mk(ten), p: { a: 7 }, answer: "3" };
    return {
      item,
      steps: [
        { say: "這是十格框。十個格子都裝滿，就是十。", view: { added: 0 } },
        { say: "已經放了七顆星星。", view: { added: 0 } },
        { say: "一", view: { added: 1 } },
        { say: "二", view: { added: 2 } },
        { say: "三", view: { added: 3 } },
        { say: "裝滿了！還要放三個。七和三合起來是十。", view: { added: 3 } },
      ],
    };
  },
};

function mk(g: Game): Item {
  return { id: `isl-${g.k}-demo`, k: g.k, unit: g.unit, p: {}, answer: "", choices: [], say: "", text: "" };
}

export const GAMES: Record<string, Game> = { count, find, split, merge, zero, boat, hop, add, ten, ...SEMESTER_GAMES, ...LOWER_GAMES, ...UPPER_GAMES };


/**
 * 出一題。avoid 是今天已經作答過、或這一趟已經出過的題號：盡量換一題，
 * 讓孩子每題都有機會拿到「當天第一次答對」的獎勵（與原遊戲優先出新題相同）。
 */
export function makeItem(k: string, avoid?: Set<string>, exam = false): Item {
  const g = GAMES[k];
  let item: Item = { ...g.make(exam), k, unit: g.unit };
  for (let i = 0; avoid?.has(item.id) && i < 30; i++) item = { ...g.make(exam), k, unit: g.unit };
  avoid?.add(item.id);
  return item;
}

/** 從指定單元的遊戲輪流出 n 題，每種遊戲出現次數平均，同一趟不重複。考卷模式不出考卷上沒有的題型。 */
export function itemSet(unitIds: string[], n: number, avoid: Iterable<string> = [], exam = false): Item[] {
  const keys = unitIds.flatMap((id) => UNIT_BY_ID[id].games).filter((k) => !(exam && GAMES[k].noExam));
  const seen = avoid instanceof Set ? avoid : new Set(avoid);
  const out: Item[] = [];
  let bag: string[] = [];
  while (out.length < n) {
    if (!bag.length) bag = shuffle(keys);
    out.push(makeItem(bag.pop()!, seen, exam));
  }
  return out;
}

/** Mixed challenges sample different units before repeating one. */
export function mixedExam(n: number, avoid: Iterable<string> = [], grade=1): Item[] {
  const seen = new Set(avoid), units = shuffle(ISLAND_UNITS.filter(u=>Number(u.id[0])===grade));
  return Array.from({ length: n }, (_, i) => itemSet([units[i % units.length].id], 1, seen, true)[0]);
}

/** 示範與提醒裡會出現在畫面上的文字（注音測試用）。 */
export function allScriptLines(): string[] {
  return Object.values(GAMES).flatMap((g) => [g.tip, ...g.demo().steps.map((s) => s.say)]);
}
