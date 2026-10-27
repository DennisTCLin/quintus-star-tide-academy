import { clientId as createClientId } from "./client-id";
import { useEffect, useRef, useState } from "react";
import type { Family, PlayerId } from "./game-view";
import type { LearningQuestion } from "./learning";
export type PublicQuestion = Omit<
  LearningQuestion,
  "answer" | "explanation" | "target"
> &
  Partial<Pick<LearningQuestion, "answer" | "explanation" | "target">>;
export type CloudState = {
  serverNow?: number;
  questionAssets?: Partial<Record<PlayerId, {runId:string;index:number;images:string[]}>>;
  family: Family;
  questions: Partial<Record<PlayerId, PublicQuestion>>;
  studyQuestions?: Partial<Record<PlayerId, PublicQuestion>>;
  studySummaries?: Partial<Record<PlayerId, ReturnType<typeof import("./study-review").studySummary>>>;
  reviews?: Partial<Record<PlayerId, { index: number; question: LearningQuestion }[]>>;
  username: string;
  playerId?: PlayerId | null;
  displayName?: string | null;
  csrf: string;
  day: string;
  verified: Record<PlayerId, number>;
  legacy: boolean;
  canMigrate: boolean;
  recoveryCode?: string;
  result?: unknown;
  captureQuestions?: Record<string, PublicQuestion>;
  captureReceipt?: import("./creature-rules").CaptureOutcome & { runId: string };
};
export class CloudError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
export async function request<T = CloudState>(
  path: string,
  body?: unknown,
  csrf?: string,
  keepalive = false,
): Promise<T> {
  // AbortSignal.timeout is missing in Safari 15; AbortController works there.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    let response: Response;
    try {
      response = await fetch("/api/" + path, {
        method: body === undefined ? "GET" : "POST",
        credentials: "same-origin",
        cache: "no-store",
        keepalive,
        headers:
          body === undefined
            ? {}
            : {
                "Content-Type": "application/json",
                ...(csrf ? { "X-CSRF-Token": csrf } : {}),
              },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
    } catch {
      throw new CloudError(
        "連線中斷，尚未確認這次操作。連線恢復後請按「確認同步」。",
        0,
      );
    }
    let data;
    try {
      data = await response.json();
    } catch {
      throw new CloudError("雲端回應中斷，請確認同步後再繼續。", 503);
    }
    if (!response.ok)
      throw new CloudError(data.error || "雲端暫時無法連線", response.status);
    return data;
  } finally {
    clearTimeout(timer);
  }
}
export async function practiceRequest(
  body: unknown,
  csrf: string,
): Promise<PublicQuestion> {
  return (await request("practice", body, csrf)) as unknown as PublicQuestion;
}
export function useCloud() {
  const [state, setState] = useState<CloudState | null>(null),
    [loading, setLoading] = useState(true),
    [status, setStatus] = useState("正在連接雲端…"),
    [error, setError] = useState(""),
    [online, setOnline] = useState(true);
  const current = useRef<CloudState | null>(null),
    inFlight = useRef(false),
    epoch = useRef(0);
  const refreshing = useRef<Promise<boolean> | null>(null);
  const onlineNow = useRef(true);
  const updateOnline = (value: boolean) => { onlineNow.current = value; setOnline(value); };
  const failures = useRef(0),
    retryAt = useRef(0);
  const unresolved = useRef<{
    path: string;
    body: unknown;
    csrf: string;
  } | null>(null);
  const receive = (next: CloudState) => {
    if (
      current.current?.username === next.username &&
      next.family.revision < current.current.family.revision
    )
      return;
    if (
      current.current &&
      (current.current.username !== next.username ||
        current.current.csrf !== next.csrf)
    ) {
      epoch.current++;
      unresolved.current = null;
    }
    failures.current = 0;
    retryAt.current = 0;
    current.current = next;
    setState(next);
    setStatus("☁ 已儲存至雲端");
    updateOnline(true);
    setError("");
  };
  async function refresh() {
    if (inFlight.current) return;
    inFlight.current = true;
    let finish!: (ok: boolean) => void;
    refreshing.current = new Promise<boolean>(resolve => { finish = resolve; });
    let refreshed = false;
    const generation = epoch.current;
    try {
      const pending = unresolved.current;
      const next = await request(
        pending?.path || "state",
        pending?.body,
        pending?.csrf,
      );
      if (generation !== epoch.current) return;
      unresolved.current = null;
      receive(next);
      refreshed = true;
    } catch (e) {
      if (generation !== epoch.current) return;
      const failure = e as CloudError;
      retryAt.current =
        Date.now() +
        Math.min(30000, 2500 * 2 ** Math.min(4, ++failures.current));
      if (failure.status === 401) {
        current.current = null;
        setState(null);
        unresolved.current = null;
        setStatus("請登入家庭帳號");
        updateOnline(true);
      } else {
        updateOnline(false);
        setError(failure.message);
        setStatus("尚未確認同步");
        if (failure.status === 409) {
          unresolved.current = null;
        }
      }
    } finally {
      inFlight.current = false;
      refreshing.current = null;
      finish(refreshed);
      setLoading(false);
    }
  }
  useEffect(() => {
    let alive = true,
      first = true,
      timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      if (
        document.visibilityState === "visible" &&
        (first || current.current) &&
        Date.now() >= retryAt.current
      ) {
        first = false;
        await refresh();
      }
      if (alive) timer = setTimeout(poll, 2500 + Math.random() * 500);
    };
    void poll();
    const focus = () => {
      // WebKit emits visibilitychange while navigating away. Starting a new
      // state request then is rejected by the unloading document.
      if (alive && document.visibilityState === "visible" && current.current) void refresh();
    };
    window.addEventListener("online", focus);
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", focus);
    const offline = () => {
      updateOnline(false);
      setStatus("離線・暫停計分");
      setError("連線恢復後會自動讀取雲端進度。");
    };
    window.addEventListener("offline", offline);
    return () => {
      alive = false;
      clearTimeout(timer);
      window.removeEventListener("online", focus);
      window.removeEventListener("focus", focus);
      document.removeEventListener("visibilitychange", focus);
      window.removeEventListener("offline", offline);
    };
  }, []);
  async function mutate(
    command: Record<string, unknown>,
    snapshot?: unknown,
  ): Promise<unknown> {
    // Passive polling must not discard a tap on an enabled answer. Wait only
    // for that read; concurrent writes still reject rather than queue/replay.
    const reading = refreshing.current, waitingEpoch = epoch.current;
    if (reading && unresolved.current) throw Error("請先確認同步，再繼續遊戲");
    if (reading && (!await reading || waitingEpoch !== epoch.current))
      throw Error("請先確認同步，再繼續遊戲");
    if (inFlight.current) throw Error("正在同步，請稍後再試");
    if (!onlineNow.current || unresolved.current) throw Error("請先確認同步，再繼續遊戲");
    const active = current.current;
    if (!active) throw Error("請先登入");
    const body = {
      id: createClientId(),
      revision: active.family.revision,
      ...(snapshot === undefined ? { command } : { snapshot }),
    };
    const pending = {
      path: snapshot === undefined ? "command" : "migrate",
      body,
      csrf: active.csrf,
    };
    inFlight.current = true;
    const generation = epoch.current;
    unresolved.current = pending;
    setStatus("正在儲存…");
    try {
      let next: CloudState;
      try {
        next = await request(pending.path, body, pending.csrf);
      } catch (e) {
        if ((e as CloudError).status !== 0) throw e;
        next = await request(pending.path, body, pending.csrf);
      }
      if (generation !== epoch.current) return;
      unresolved.current = null;
      receive(next);
      return next.result;
    } catch (e) {
      if (generation !== epoch.current) throw e;
      const failure = e as CloudError;
      if (failure.status && failure.status < 500) unresolved.current = null;
      setStatus("尚未確認同步");
      setError(failure.message);
      updateOnline(false);
      throw e;
    } finally {
      inFlight.current = false;
    }
  }
  async function logout() {
    if (inFlight.current || unresolved.current)
      throw Error("請先確認同步，再登出");
    inFlight.current = true;
    epoch.current++;
    try {
      if (current.current) await request("logout", {}, current.current.csrf);
      current.current = null;
      setState(null);
      setError("");
      setStatus("已登出");
    } finally {
      inFlight.current = false;
    }
  }
  return {
    state,
    loading,
    status,
    error,
    online,
    receive,
    refresh,
    mutate,
    logout,
  };
}
