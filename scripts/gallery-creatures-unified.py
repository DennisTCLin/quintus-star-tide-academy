from pathlib import Path
import json,html
root=Path('outputs/creatures-unified');base=json.loads((root/'baseline.json').read_text());assets=json.loads((root/'assets.json').read_text())['assets'];art={a['id']:a for a in assets}
cards=[]
for c in base['characters']:
 a=art.get(c['id']);url='../../'+a['files'][1]['path'] if a else '../../public'+c.get('thumbnail',c['image']).split('?')[0]
 cards.append(f'<article><img loading="lazy" src="{html.escape(url)}" alt="{html.escape(c["name"])}"><h2>{html.escape(c["name"])}</h2><p>{c["rarity"]} 級 · {c["element"]}屬性</p><small>{html.escape(c["id"])}</small></article>')
(root/'index.html').write_text('''<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>星潮學院｜英雄畫風全圖鑑</title><style>*{box-sizing:border-box}body{background:#081c2b;color:#e4f3f4;font:16px system-ui;margin:0;padding:32px}header{max-width:1000px;margin:0 auto 32px}h1{color:#efcc82;font-size:32px}header p{line-height:1.8;color:#b1ccd3}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:16px}article{background:#102c3d;border:1px solid #254759;border-radius:20px;padding:14px;text-align:center}img{width:100%;aspect-ratio:1;object-fit:contain}h2{font-size:18px;margin:8px 0}p{margin:8px 0}small{font-size:10px;color:#9ab7bd;overflow-wrap:anywhere}</style><header><h1>星潮學院 · 英雄畫風全圖鑑</h1><p>375 位夥伴與怪物，統一成熟身形、簡潔配色與繪畫光影。新增重製 275 位，保留先前已核准的 100 位。此頁為立繪預覽，技能、稀有度與收藏資料維持原設定。</p></header><main>'''+''.join(cards)+'</main></html>')
print('Gallery:',len(cards),'characters')
