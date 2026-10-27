import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AppErrorBoundary, SafeModeNotice } from './AppRecovery'
import { SAFE_MODE } from './recovery-mode'
import './styles.css'
import { BrandIconSprite } from './BrandIcon'

const AdminConsole = React.lazy(() => import('./AdminConsole'))
const adminPage = window.location.pathname === '/admin' || window.location.pathname.startsWith('/admin/')

document.documentElement.dataset.safeMode = String(SAFE_MODE)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SafeModeNotice />
    <AppErrorBoundary>
      <BrandIconSprite />
      {adminPage ? <React.Suspense fallback={<p role="status">正在開啟管理艙…</p>}><AdminConsole /></React.Suspense> : <App />}
    </AppErrorBoundary>
  </React.StrictMode>,
)
