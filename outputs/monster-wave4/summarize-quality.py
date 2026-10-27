"""Consolidate inspected quality findings; never submits or approves generation jobs."""
import json
from pathlib import Path
root=Path(__file__).parent
plan=json.loads((root/'plan.json').read_text())['items']
notes=json.loads((root/'quality-review-notes.json').read_text())
audit=json.loads((root/'media-audit/results.json').read_text())
matte={r['index']:r for r in json.loads((root/'matte-videos.json').read_text())}
assert len(audit)==150 and len(matte)==150
assert all(matte[r['index']]['sha256']==r['sha256'] for r in audit)
minor={23,42,64,84,108}
fx={4,38}
rows=[]
for r in sorted(audit,key=lambda r:r['index']):
 i=r['index']
 if not r['flags']:continue
 assert str(i) in notes,('Needs human visual review',i)
 category='effect-only' if i in fx else 'optional-framing' if i in minor else 'redo-recommended'
 rows.append({'index':i,'id':r['id'],'name':plan[(i-1)//5]['name'],'action':r['action'],'sha256':r['sha256'],'issue':notes[str(i)],'state':'accepted-effect-only' if i in fx else 'awaiting-consolidated-review','category':category,'estimatedCredits':0 if i in fx else 28,'authorized':False,'evidence':f"outputs/monster-wave4/media-audit/{i:03}.jpg",'preview':f"http://127.0.0.1:47741/outputs/monster-wave4/review.html?ids={80+(i-1)//5+1}&action={r['action']}"})
for e in json.loads((root/'editorial-trims.json').read_text()):
 i=e['index'];r=next(r for r in audit if r['index']==i)
 if r['flags']:continue
 rows.append({'index':i,'id':r['id'],'action':r['action'],'sha256':r['sha256'],'state':'free-edit-verified','category':'resolved','estimatedCredits':0,'issue':'保留完整入鏡的動作區段，重新定時；通過逐格邊界與播放檢查。','authorized':True})
(root/'manual-review.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
labels={'entrance':'登場','idle':'待機','attack':'攻擊','hit':'受擊','capture':'降服'}
required=[r for r in rows if r['category']=='redo-recommended'];optional=[r for r in rows if r['category']=='optional-framing'];resolved=[r for r in rows if r['category']=='resolved']
text=f'''# 第四波怪物動畫：150 段停止點與品質清單

已完成 150 段原始生成，對應前 30 隻怪物 × 5 動作。另有先前核准的 7 段替換；沒有新增付費重做。第 151～250 段暫緩，50 張角色圖保留。

本次僅保存製作分支與本機預覽，尚未發布。瀏覽器播放通過不等於美術完全合格；實體 iPad 尚未驗證。

免費修剪並完成重驗：{len(resolved)} 段。2 段邊界警告是光效離開畫面，本體完整，保留原始警告與人工判讀。

## 集中確認的重做建議

建議重做 {len(required)} 段，沿用每段約 28 點的估算，合計約 {len(required)*28} 點；**尚未核准、沒有送出**。其中包含 2 段長出多餘翅膀，以及 2 段先前重做後仍有翼尖裁切的影片。此估算不含再次返工。

| 編號 | 怪物 | 動作 | 問題 | 本機預覽 |
|---|---|---|---|---|
'''
for r in required:text+=f"| {r['index']} | {r['name']} | {labels[r['action']]} | {r['issue']} | [查看]({r['preview']}) |\n"
text+=f'\n## 可選的細部構圖修正\n\n另有 {len(optional)} 段短暫尖端碰框，可選擇一併重做，約 {len(optional)*28} 點。全部待改善片段共 {len(required)+len(optional)} 段，約 {(len(required)+len(optional))*28} 點。\n\n| 編號 | 怪物 | 動作 | 問題 | 本機預覽 |\n|---|---|---|---|---|\n'
for r in optional:text+=f"| {r['index']} | {r['name']} | {labels[r['action']]} | {r['issue']} | [查看]({r['preview']}) |\n"
text+='\n## 驗證與限制\n\n- 150 支去背合成影片以單一 H.264 串流保存 RGB 與透明遮罩，避免兩支影片不同步。\n- 逐格檢查畫面空白、動作、背景殘色與邊界，保留上述未解決美術問題。\n- Chromium、WebKit 各 150 段播放檢查，共 300 項；實體 iPad 尚未測試。\n- 先前程式驗證：881 項單元測試、182 項資料庫測試、60 項版面檢查、16 項降服流程。這些為既有驗證紀錄，本次素材停止點未重新執行整套程式測試。\n- 原本 50 隻完整動畫的發布門檻仍保留，因此目前不能將這批視為 50 隻皆完成的正式版本。\n'
Path('docs/monster-wave4-quality-review.md').write_text(text)
print({'required':len(required),'optional':len(optional),'resolvedFreeEdits':len(resolved)})
