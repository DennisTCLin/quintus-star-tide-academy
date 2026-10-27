import { SAFE_MODE } from './recovery-mode';
import { BrandText } from "./BrandIcon";
import BrandLogo from "./BrandLogo";
import useHomeMusic from "./useHomeMusic";
import { useState, type FormEvent } from "react";
import HeroVideoCarousel from "./HeroVideoCarousel";
import { request, CloudError, type CloudState } from "./cloud";
export default function AccountGate({
  loading,
  error,
  onLogin,
}: {
  loading: boolean;
  error: string;
  onLogin: (state: CloudState) => void;
}) {
  const music = useHomeMusic(true);
  const [mode, setMode] = useState<"login" | "register" | "recover">("login"),
    [username, setUsername] = useState(""),
    [password, setPassword] = useState(""),
    [code, setCode] = useState(""),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(""),
    [created, setCreated] = useState<CloudState | null>(null),
    [saved, setSaved] = useState(false),
    [paused, setPaused] = useState(false);
  const [localBackup] = useState(() => {
    try {
      const family = localStorage.getItem("star-tide.family.v1");
      const milestones = localStorage.getItem("star-tide-academy.milestones.v2");
      const equipped = localStorage.getItem("star-tide-academy.equipped-character.v1");
      return family || milestones ? { format: "star-tide-local-originals", family, milestones, equipped } : null;
    } catch { return null; }
  });
  function downloadOriginals() {
    const url = URL.createObjectURL(new Blob([JSON.stringify(localBackup, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "star-tide-original-progress.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      const next = await request(mode, {
        username,
        password,
        ...(mode === "recover" ? { recoveryCode: code } : {}),
      });
      if (next.recoveryCode) setCreated(next);
      else onLogin(next);
    } catch (e) {
      setNotice(
        (e as Error).message.replace(
          "連線恢復後請按「確認同步」。",
          "請重新登入；若剛建立帳號，使用剛才設定的帳號與密碼登入。",
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="family-app welcome account-welcome">
      <div className="welcome-brand"><BrandLogo variant="welcome" /></div>
      <main className="account-panel f-panel">
        <span className="eyebrow">你的冒險，跟著帳號一起走</span>
        <h1>
          {created
            ? "收好你的帳號復原碼"
            : mode === "register"
              ? "建立家庭帳號"
              : mode === "recover"
                ? "找回你的航線"
                : "歡迎回到星潮"}
        </h1>
        {created ? (
          <>
            <p>
              帳號 <strong>{created.username}</strong>{" "}
              已準備好。忘記密碼時，用這組一次性復原碼設定新密碼；沒有密碼也沒有復原碼，就無法自行找回帳號。
            </p>
            <code className="recovery-code">{created.recoveryCode}</code>
            <p>
              請把復原碼存入密碼管理器或抄下，這是帳號鑰匙，不是遊戲進度備份。
            </p>
            <label className="setting">
              <input
                type="checkbox"
                checked={saved}
                onChange={(e) => setSaved(e.target.checked)}
              />
              我已安全保存復原碼
            </label>
            <button
              className="f-primary"
              disabled={!saved}
              onClick={() => onLogin({ ...created, recoveryCode: undefined })}
            >
              進入星潮學院 →
            </button>
          </>
        ) : (
          <>
            <p>
              使用自己的帳號登入，繼續原有分數、收藏與學習進度。換裝置也能接著冒險。
            </p>
            {loading ? (
              <p role="status">正在連接雲端…</p>
            ) : (
              <form onSubmit={submit}>
                <label className="form-label">
                  帳號
                  <input
                    autoComplete="username"
                    name="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    required
                    minLength={3}
                    maxLength={32}
                    pattern="[a-zA-Z0-9_]+"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="英文字母、數字或底線"
                  />
                </label>
                <label className="form-label">
                  {mode === "recover" ? "新密碼" : "密碼"}
                  <input
                    type="password"
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                    required
                    minLength={mode === "login" ? 4 : 12}
                    maxLength={128}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={mode === "login" ? "請輸入密碼" : "至少 12 個字元"}
                  />
                </label>
                {mode === "recover" && (
                  <label className="form-label">
                    一次性復原碼
                    <input
                      autoComplete="off"
                      required
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                    />
                  </label>
                )}
                {mode !== "login" && (
                  <p className="fine-print">
                    請由家長設定並保存帳號與復原碼。不需要孩子的姓名、生日或電子郵件。遺失密碼與復原碼將無法自行找回帳號。
                  </p>
                )}
                <button className="f-primary" disabled={busy}>
                  {busy
                    ? "正在連接…"
                    : mode === "login"
                      ? "登入，繼續冒險 →"
                      : mode === "register"
                        ? "建立帳號 →"
                        : "重設密碼 →"}
                </button>
              </form>
            )}
            <div className="account-links">
              <a href="/admin">管理員登入</a>
              {(["login", "register", "recover"] as const)
                .filter((x) => x !== mode)
                .map((x) => (
                  <button
                    disabled={busy}
                    key={x}
                    onClick={() => {
                      setMode(x);
                      setNotice("");
                      setPassword("");
                    }}
                  >
                    {x === "login"
                      ? "已有帳號，登入"
                      : x === "register"
                        ? "第一次來？建立帳號"
                        : "忘記密碼"}
                  </button>
                ))}
            </div>
            {localBackup && <div className="legacy-transfer">
              <p>這台裝置的原有進度仍完整保留。尚未轉入雲端時，可先下載備份。</p>
              <button type="button" onClick={downloadOriginals}>下載原有進度備份</button>
            </div>}
            {(notice || error) && <p role="alert">{notice || error}</p>}
          </>
        )}
      </main>
      <div className="welcome-controls">
        <button type="button" className="home-music-toggle" data-music-control
          aria-label={music.playing ? "暫停背景音樂" : "播放背景音樂"}
          aria-pressed={music.playing} onClick={music.toggle}>
          <BrandText text={music.playing ? "Ⅱ 暫停音樂" : music.failed ? "♫ 重試音樂" : "♫ 播放音樂"} />
        </button>
        <button
          className="portrait-motion-toggle"
          aria-pressed={SAFE_MODE || paused}
          disabled={SAFE_MODE}
          onClick={() => setPaused(!paused)}
        >
          <BrandText text={SAFE_MODE ? "輕量模式已暫停動態" : paused ? "▶ 播放動態" : "Ⅱ 暫停動態"} />
        </button>
      </div>
      <HeroVideoCarousel entrance reduceMotion={SAFE_MODE || paused} />
    </div>
  );
}
export function LegacyTransfer({
  canMigrate,
  legacy,
  busy,
  onTransfer,
}: {
  canMigrate: boolean;
  legacy: boolean;
  busy: boolean;
  onTransfer: (snapshot: unknown) => Promise<unknown>;
}) {
  const [raw] = useState(() => {
      try {
        const family = localStorage.getItem("star-tide.family.v1");
        if (family) return family;
        const milestones = localStorage.getItem(
          "star-tide-academy.milestones.v2",
        );
        return milestones
          ? JSON.stringify({
              format: "legacy-academy",
              milestones,
              equipped: localStorage.getItem(
                "star-tide-academy.equipped-character.v1",
              ),
            })
          : null;
      } catch {
        return null;
      }
    }),
    [message, setMessage] = useState(""),
    [done, setDone] = useState(false);
  if (!raw || done || legacy) return null;
  return (
    <section className="legacy-transfer">
      <h2>找到這個裝置的舊航海誌</h2>
      <p>
        {canMigrate
          ? "確認這是你們家的進度後，可以一次帶回四位航海員的收藏與分數。舊成績會標示為歷史紀錄，新成績由雲端計算。"
          : "這個帳號已有雲端進度，為避免覆蓋，不會自動轉入。此裝置的舊紀錄仍完整保留，可在尚未遊玩的新家庭帳號轉入。"}
      </p>
      {canMigrate && (
        <button
          disabled={busy}
          onClick={async () => {
            try {
              await onTransfer(JSON.parse(raw));
              setDone(true);
            } catch (e) {
              setMessage((e as Error).message);
            }
          }}
        >
          這是我們的進度，轉入此帳號
        </button>
      )}
      {message && <p role="alert">{message}</p>}
    </section>
  );
}

export function RecoverySettings({ csrf }: { csrf: string }) {
  const [password, setPassword] = useState(""),
    [code, setCode] = useState(""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  return (
    <section className="recovery-settings">
      <h3>帳號復原碼</h3>
      <p>
        若沒有保存復原碼，可以確認密碼後重新產生。舊復原碼會立即失效；這不影響遊戲進度。
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setCode("");
          setMessage("");
          try {
            const next = await request("recovery-code", { password }, csrf);
            setCode(next.recoveryCode!);
            setPassword("");
          } catch (e) {
            setMessage(e instanceof CloudError && (e.status === 0 || e.status >= 500) ? "連線中斷，復原碼可能已更新。請再次產生新的復原碼，舊碼請勿使用。" : (e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="form-label">
          確認目前密碼
          <input
            type="password"
            required
            minLength={12}
            maxLength={128}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <button disabled={busy}>{busy ? "處理中…" : "產生新的復原碼"}</button>
      </form>
      {code && (
        <>
          <code className="recovery-code">{code}</code>
          <p>請存入密碼管理器或抄下，然後收起。</p>
          <button onClick={() => setCode("")}>已保存，收起復原碼</button>
        </>
      )}
      {message && <p role="alert">{message}</p>}
    </section>
  );
}
