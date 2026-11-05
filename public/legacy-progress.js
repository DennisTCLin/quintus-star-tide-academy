// This page only reads this browser's original game keys. It never authenticates,
// initializes the shared world, imports data or writes localStorage.
export const isLegacyProgressKey = key =>
  ['star-tide.family.v1', 'star-tide-academy.milestones.v2', 'star-tide-academy.equipped-character.v1'].includes(key) ||
  /^star-tide\.conquest\.v2\..+$/.test(key) || /^star-tide\.conquest-heroes\.v1(?:\..+)?$/.test(key);

export function readOriginals(storage) {
  const entries = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key && isLegacyProgressKey(key)) {
      const raw = storage.getItem(key);
      if (raw !== null) entries.push({ key, raw });
    }
  }
  return entries.sort((a, b) => a.key.localeCompare(b.key));
}

export async function createArchive(storage, origin, subtle, now = new Date()) {
  const original = readOriginals(storage);
  const entries = await Promise.all(original.map(async entry => ({ ...entry,
    sha256: Array.from(new Uint8Array(await subtle.digest('SHA-256', new TextEncoder().encode(entry.raw))), n => n.toString(16).padStart(2, '0')).join(''),
  })));
  if (JSON.stringify(readOriginals(storage)) !== JSON.stringify(original)) throw Error('遊戲進度正在更新，請先關閉其他遊戲分頁，再重新匯出。');
  if (!entries.length) throw Error('這個瀏覽器沒有找到舊版存檔。請回到當時遊玩的裝置、瀏覽器與網站網址。');
  return { format: 'star-tide-legacy-browser-archive', version: 1, sourceOrigin: origin, exportedAt: now.toISOString(), entries };
}

if (typeof document !== 'undefined') {
  const status = document.getElementById('status');
  const list = document.getElementById('records');
  const button = document.getElementById('export');
  const download = document.getElementById('download');
  let previousUrl;
  const show = () => {
    try {
      const entries = readOriginals(localStorage);
      list.replaceChildren();
      for (const entry of entries) {
        const row = document.createElement('li');
        row.textContent = `${entry.key}（${new TextEncoder().encode(entry.raw).length.toLocaleString()} bytes）`;
        list.append(row);
      }
      status.textContent = entries.length ? `找到 ${entries.length} 份舊紀錄。請先匯出保存，再處理搬移。` : '尚未找到舊紀錄。請確認使用當時遊玩的瀏覽器，且不是私密瀏覽。';
      button.disabled = !entries.length;
    } catch { status.textContent = '無法讀取這個瀏覽器的儲存空間，請保留目前資料並稍後再試。'; button.disabled = true; }
  };
  show();
  button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      const archive = await createArchive(localStorage, location.origin, crypto.subtle);
      const blob = new Blob([JSON.stringify(archive, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob), link = document.createElement('a');
      link.href = url; link.download = `star-tide-legacy-${archive.exportedAt.slice(0, 10)}.json`;
      if (previousUrl) URL.revokeObjectURL(previousUrl);
      previousUrl = url;
      download.href = url; download.download = link.download; download.hidden = false;
      document.body.append(link); link.click(); link.remove();
      status.textContent = '備份已準備好。若沒有自動下載，請點下方「下載已準備的備份」。在 Safari 的下載項目中存入「檔案」；若開啟預覽，使用分享 → 儲存到檔案。原紀錄仍保留在這個瀏覽器。';
    } catch (error) { status.textContent = error instanceof Error ? error.message : '匯出未完成，原資料仍保留。'; }
    finally { button.disabled = false; }
  });
}
