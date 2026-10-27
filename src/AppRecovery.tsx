import { Component, useEffect, useState, type ReactNode } from 'react';
import { recoveryHref, SAFE_MODE } from './recovery-mode';
import './app-recovery.css';

export function RecoveryActions() {
  return <div className="app-recovery-actions">
    <button type="button" onClick={() => window.location.reload()}>重新載入</button>
    <a href={recoveryHref(window.location.href, !SAFE_MODE)}>
      {SAFE_MODE ? '退出輕量模式' : '用輕量模式開啟'}
    </a>
  </div>;
}

export function StartupStatus({ children = '正在打開星潮學院…' }: { children?: ReactNode }) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), 15000);
    return () => clearTimeout(timer);
  }, []);
  return <div className="app-startup-status">
    <p role="status">{children}</p>
    {slow && <><p>載入比平常久。可以重新載入，或切換模式再試一次。</p><RecoveryActions /></>}
  </div>;
}

export function SafeModeNotice() {
  if (!SAFE_MODE) return null;
  return <aside className="safe-mode-notice" aria-label="輕量模式">
    <span><strong>輕量模式</strong>・暫停動畫，仍可登入、答題與同步進度。</span>
    <a href={recoveryHref(window.location.href, false)}>退出輕量模式</a>
  </aside>;
}

export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return <main className="app-recovery" role="alert">
      <h1>航程暫時打不開</h1>
      <p>畫面載入遇到問題。可以重新載入，或切換模式再試一次。</p>
      <p>重新連線後會讀取雲端已儲存的進度；尚未送出的操作需要重新確認。</p>
      <RecoveryActions />
    </main>;
  }
}
