from pathlib import Path
import json,html
root=Path('outputs/creatures-hero-style');ds=json.loads((root/'designs.json').read_text())
hashes={a['id']:a['files'][0]['sha256'][:12] for a in json.loads((root/'assets.json').read_text())['assets']}
style=Path('outputs/creatures-simple/index.html').read_text().split('<style>')[1].split('</style>')[0]
out=['<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>遠境守望者 · 100 隻新角色</title><style>'+style+'</style><main><header><div class="tag">STAR TIDE ACADEMY · HIGGSFIELD</div><h1>100 位遠境守望者</h1><p>50 隻可抽取夥伴、50 隻可降服怪物。英雄風格修正版：更成熟的比例、俐落輪廓與立體光影，保留乾淨大色塊。每張卡片顯示取得時的天生能力；後續可陪練升級。本批為立繪，尚未新增專屬影片動畫。</p><nav><a href="#夥伴">夥伴 ↓</a><a href="#怪物">怪物 ↓</a></nav></header>']
tiers=['E','D','C','B','A','S'];levels=[1,5,10,15,20,30]
for kind,label in [('c','夥伴'),('m','怪物')]:
    out.append('<h2 id="'+label+'">'+label+' · 50 種</h2><section>')
    for d in [x for x in ds if x['kind']==kind]:
        rank=tiers.index(d['rarity']);src='../../public/assets/creatures-hundred/'+d['id']+'.webp?v='+hashes[d['id']]
        out.append(f'<article><div class="tag">{d["element"]}屬性 · {d["rarity"]} 級 · Lv.{levels[rank]}</div><img loading="lazy" src="{src}" alt="{html.escape(d["name"])}"><h3>{d["name"]}</h3><p>{d["feature"]}</p><b>{d["move"]}</b><footer>HP {100+rank*12} · ATK {22+rank*3} · DEF {8+rank*2}</footer></article>')
    out.append('</section>')
out.append('</main></html>');(root/'all.html').write_text(''.join(out))
