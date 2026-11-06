import { EXERCISES, LESSONS, exerciseById, lessonById, type Track } from './catalog';
export const ADULT_KEY = 'star-tide.adult-english.v1';
export const INTERVALS = [1, 3, 7, 14];
export type Review = { due: string; stage: number; lastDay: string; correct: boolean; attempts: number };
export type Session = { id: string; mode: 'lesson' | 'due' | 'mistakes' | 'all'; lessonId?: string; ids: string[]; index: number; results: { correct: boolean; assisted: boolean; answer: string }[]; assistedIds?: string[]; complete: boolean };
export type AdultState = { version: 1; revision: number; profile: { name: string; track: Track; dailyGoal: number } | null; xp: number; entries: Record<string, Review>; practiced: string[]; days: string[]; daily: Record<string, string[]>; session: Session | null };
export const freshState = (): AdultState => ({ version: 1, revision: 0, profile: null, xp: 0, entries: {}, practiced: [], days: [], daily: {}, session: null });
export function taipeiDay(now = new Date()): string { return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Taipei', year:'numeric',month:'2-digit',day:'2-digit' }).format(now); }
const plusDays = (day: string, n: number) => new Date(Date.parse(day + 'T00:00:00Z') + n * 86400000).toISOString().slice(0,10);
export function normalizeAnswer(value: string) { return value.normalize('NFKC').toLowerCase().replace(/[‘’]/g,"'").replace(/[.,!?;:]/g,'').trim().replace(/\s+/g,' '); }
export function isCorrect(id: string, answer: string) { const q = exerciseById(id); return !!q && [q.answer, ...(q.accepted ?? [])].some(a => normalizeAnswer(a) === normalizeAnswer(answer)); }
const obj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const nat = (v: unknown) => Number.isSafeInteger(v) && Number(v) >= 0;
const validDay = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v+'T00:00:00Z')) && new Date(v+'T00:00:00Z').toISOString().slice(0,10) === v;
export function parseState(raw: string | null): AdultState {
  if (raw === null) return freshState();
  const s: unknown = JSON.parse(raw); const need = (v: unknown) => { if (!v) throw Error('成人學習紀錄無法讀取。原資料已保留，請下載備份後再聯絡管理員。'); };
  need(obj(s)); const x = s as AdultState;
  need(x.version === 1 && nat(x.revision) && nat(x.xp) && obj(x.entries) && Array.isArray(x.practiced) && Array.isArray(x.days) && obj(x.daily));
  need(x.profile === null || (obj(x.profile) && typeof x.profile.name === 'string' && x.profile.name.trim().length > 0 && x.profile.name.length <= 24 && ['everyday','travel','work'].includes(x.profile.track) && [6,12].includes(x.profile.dailyGoal)));
  need(Object.keys(x.entries).length <= EXERCISES.length && x.practiced.every(id => !!lessonById(id)) && x.days.every(validDay));
  for (const [id,e] of Object.entries(x.entries)) need(exerciseById(id) && obj(e) && validDay(e.due) && validDay(e.lastDay) && nat(e.stage) && e.stage <= 4 && typeof e.correct === 'boolean' && nat(e.attempts));
  for (const [d,ids] of Object.entries(x.daily)) need(validDay(d) && Array.isArray(ids) && ids.every(id => !!exerciseById(id)) && new Set(ids).size === ids.length);
  if (x.session !== null) {
    const r = x.session;
    need(obj(r) && typeof r.id === 'string' && ['lesson','due','mistakes','all'].includes(r.mode) && Array.isArray(r.ids) && r.ids.length > 0 && r.ids.length <= 6 && r.ids.every(id => !!exerciseById(id)) && new Set(r.ids).size === r.ids.length && nat(r.index) && r.index < r.ids.length && Array.isArray(r.results) && r.results.length >= r.index && r.results.length <= r.index+1 && typeof r.complete === 'boolean' && (!r.complete || (r.index === r.ids.length-1 && r.results.length === r.ids.length)));
    need(r.mode !== 'lesson' || (lessonById(r.lessonId ?? '') && JSON.stringify(r.ids) === JSON.stringify(lessonById(r.lessonId!)!.questions.map(q=>q.id))));
    need(r.assistedIds === undefined || (Array.isArray(r.assistedIds) && r.assistedIds.every(id=>r.ids.includes(id))));
    for(const result of r.results) need(obj(result) && typeof result.correct === 'boolean' && typeof result.assisted === 'boolean' && typeof result.answer === 'string');
  }
  return x;
}
export function startLesson(state: AdultState, lessonId: string): AdultState {
  if (state.session && !state.session.complete) throw Error('請先繼續目前練習，或按「結束這組」後再開新課。');
  const l = lessonById(lessonId); if (!l) throw Error('找不到這一課');
  return { ...state, session: {id:crypto.randomUUID(),mode:'lesson',lessonId,ids:l.questions.map(q=>q.id),index:0,results:[],complete:false} };
}
export function reviewIds(state: AdultState, mode: 'due'|'mistakes'|'all', day: string) {
  return Object.entries(state.entries).filter(([,e]) => mode === 'all' || (mode === 'mistakes' ? !e.correct : e.due <= day))
    .sort(([a,x],[b,y]) => Number(x.correct)-Number(y.correct) || x.due.localeCompare(y.due) || a.localeCompare(b)).slice(0,6).map(([id])=>id);
}
export function startReview(state: AdultState, mode: 'due'|'mistakes'|'all', day: string): AdultState {
  if (state.session && !state.session.complete) throw Error('請先繼續目前練習，或按「結束這組」後再開新課。');
  const ids = reviewIds(state,mode,day); if (!ids.length) throw Error('這裡還沒有題目，先完成一堂情境課。');
  return {...state,session:{id:crypto.randomUUID(),mode,ids,index:0,results:[],complete:false}};
}
export function answerCurrent(state: AdultState, answer: string, assisted: boolean, day: string): AdultState {
  const r = state.session; if (!r || r.complete || r.results.length > r.index) throw Error('這題已送出，請繼續下一題。');
  if (!answer.trim()) throw Error('請先選擇或輸入答案。');
  const next = structuredClone(state), session = next.session!, id = session.ids[session.index], correct = isCorrect(id,answer);
  assisted = assisted || !!session.assistedIds?.includes(id);
  session.results.push({correct,assisted,answer});
  const previous = next.entries[id];
  // Only the first assessment of a question/day affects XP, accuracy, or its review interval.
  if (!previous || previous.lastDay < day) {
    const independent = correct && !assisted;
    const dueReview = !previous || previous.due <= day;
    const stage = independent ? (dueReview ? Math.min((previous?.stage ?? 0)+1,4) : previous.stage) : 0;
    const due = independent && !dueReview ? previous.due : plusDays(day,independent ? INTERVALS[stage-1] : 1);
    next.entries[id] = { due,stage,lastDay:day,correct:correct && !assisted,attempts:(previous?.attempts ?? 0)+1 };
    if(correct && !assisted) next.xp += 10;
  }
  next.daily[day] = [...new Set([...(next.daily[day] ?? []),id])];
  return next;
}
export function advance(state: AdultState, day: string): AdultState {
  const next = structuredClone(state), r = next.session;
  if(!r || r.complete || r.results.length !== r.index+1) throw Error('請先確認這題的答案。');
  if(r.index === r.ids.length-1) { r.complete = true; if(r.lessonId) next.practiced = [...new Set([...next.practiced,r.lessonId])]; next.days = [...new Set([...next.days,day])].sort(); }
  else r.index++;
  return next;
}
export function streak(state: AdultState, today: string) {
  let day = state.days.includes(today) ? today : plusDays(today,-1), count = 0;
  while(state.days.includes(day)) { count++; day=plusDays(day,-1); } return count;
}
export function nextLesson(state: AdultState) { const preferred = LESSONS.filter(l=>l.track === (state.profile?.track ?? 'everyday')); return preferred.find(l=>!state.practiced.includes(l.id)) ?? LESSONS.find(l=>!state.practiced.includes(l.id)) ?? preferred[0]; }
/** Compare the whole previous snapshot: other tabs must never silently overwrite each other. */
export function saveState(storage: Pick<Storage,'getItem'|'setItem'>, expected: string | null, next: AdultState): string {
  if(storage.getItem(ADULT_KEY) !== expected) throw Error('另一個分頁已更新進度。請重新載入，接續最新練習。');
  const raw = JSON.stringify({...next,revision:next.revision+1}); parseState(raw); storage.setItem(ADULT_KEY,raw);
  if(storage.getItem(ADULT_KEY)!==raw) throw Error('儲存未確認，請重新載入查看最新進度。'); return raw;
}
