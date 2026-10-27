import json,hashlib,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).parent;out=root/'all-motion';out.mkdir(exist_ok=True);ledger=json.loads((root/'matte-videos.json').read_text());byindex={r['index']:r for r in ledger}
path=out/'results.json';rows=json.loads(path.read_text()) if path.exists() else [];actions=['entrance','idle','attack','hit','capture'];labels=['登場','待機','攻擊','受擊','降服']
with sync_playwright() as pw:
 for engine in ['webkit','chromium']:
  b=getattr(pw,engine).launch(headless=True);page=b.new_page(viewport={'width':834,'height':1112},has_touch=True);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  for monster in range(1,51):
   ids=list(range((monster-1)*5+1,monster*5+1))
   ids=[i for i in ids if i in byindex]
   if not ids or (monster-1)*5+1 not in byindex:continue
   todo=[i for i in ids if not any(r['engine']==engine and r['index']==i and r['sha256']==byindex[i]['sha256'] for r in rows)]
   if not todo:continue
   page.goto(f'http://127.0.0.1:47741/outputs/monster-wave4/review.html?ids={monster+80}&qa=1');page.locator('[data-motion-ready=true]').wait_for(timeout=20000)
   for i in todo:
    action=actions[(i-1)%5];page.get_by_role('button',name=labels[(i-1)%5],exact=True).click();page.wait_for_timeout(150);page.locator(f'[data-motion-ready=true][data-monster-action={action}]').wait_for(timeout=20000);page.wait_for_timeout(400)
    result=page.locator('canvas').evaluate('''c=>{const x=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let solid=0,clear=0;for(let i=0;i<x.length;i+=4){if(x[i+3]<10)clear++;if(x[i+3]>200)solid++;}return {solid,clear};}''');video=page.locator('video').evaluate('v=>({width:v.videoWidth,height:v.videoHeight,time:v.currentTime,muted:v.muted,inline:v.playsInline})')
    assert result['solid']>1200 and result['clear']>15000,(engine,i,result)
    assert video['width']==video['height']*2 and video['time']>0 and video['muted'] and video['inline'],(engine,i,video)
    before=page.locator('canvas').evaluate('c=>c.toDataURL()');page.wait_for_timeout(600);after=page.locator('canvas').evaluate('c=>c.toDataURL()');assert before!=after,(engine,i,'frozen')
    rows=[r for r in rows if not(r['engine']==engine and r['index']==i)];rows.append({'engine':engine,'index':i,'monster':byindex[i]['id'],'action':action,'sha256':byindex[i]['sha256'],**result,**video});path.write_text(json.dumps(rows,indent=2));print('PASS',engine,i,action,flush=True)
   assert not errors,errors
  b.close()
if '--require-complete' in sys.argv:
 limit=json.loads((root/'production-control.json').read_text())['originalVideoLimit']
 assert len(rows)==limit*2 and len(ledger)==limit
 assert {(r['engine'],r['index']) for r in rows}=={(engine,i) for engine in ['webkit','chromium'] for i in range(1,limit+1)}
 assert all(r['sha256']==byindex[r['index']]['sha256'] for r in rows)
print('PASS',len(rows),'verified animation/engine combinations; physical iPad not tested',flush=True)
