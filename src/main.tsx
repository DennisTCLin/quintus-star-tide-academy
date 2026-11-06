// Keep adult learning isolated from the child game's imports and startup side effects.
const adultPage = window.location.pathname === '/adult' || window.location.pathname.startsWith('/adult/')
function startupFailed() {
  const root = document.getElementById('root')
  if (root) root.innerHTML = '<main style="max-width:600px;margin:15vh auto;padding:24px;font-family:sans-serif"><h1>畫面載入遇到問題</h1><p>Please reload this page. Saved learning progress is preserved.</p><a href="' + (adultPage ? '/adult' : '/') + '">重新載入</a></main>'
}
// Separate import branches also keep Vite's CSS preload dependency lists separate.
if (adultPage) {
  import('./adult/entry').catch(startupFailed)
} else {
  import('./child-entry').catch(startupFailed)
}
