"""Check actual release routing, including every held action and the idle transition."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
root=Path(__file__).parent
held=[r for r in json.loads((root/'manual-review.json').read_text()) if r.get('state')=='awaiting-consolidated-review']
labels={'entrance':'登場','idle':'待機','attack':'攻擊','hit':'受擊','capture':'降服'}
rows=[]
with sync_playwright() as pw:
 for engine in ['webkit','chromium']:
  b=getattr(pw,engine).launch();p=b.new_page(viewport={'width':1024,'height':768},has_touch=True);errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
  for r in held:
   number=80+(r['index']-1)//5+1;action=r['action'];p.goto(f'http://127.0.0.1:47741/outputs/monster-wave4/review.html?ids={number}&action={action}');p.locator('[data-motion-ready=true]').wait_for(timeout=20000)
   p.get_by_role('button',name=labels[action],exact=True).click();p.locator(f'[data-monster-action={action}][data-motion-ready=true]').wait_for(timeout=10000)
   m=p.locator('.monster-motion');assert m.get_attribute('data-monster-action')==action
   source='entrance' if number==89 else 'idle';assert m.get_attribute('data-source-action')==source
   assert m.get_attribute('data-motion-backup')=='true'
   assert f"{r['id']}-{source}.mp4" in p.locator('video').get_attribute('src')
   first=p.locator('canvas').evaluate('e=>e.toDataURL()');p.wait_for_timeout(350);assert first!=p.locator('canvas').evaluate('e=>e.toDataURL()')
   if action!='idle':
    p.locator('video').evaluate('v=>{v.currentTime=v.duration-.15;v.play()}');p.locator('[data-monster-action=idle][data-motion-ready=true]').wait_for(timeout=5000);p.wait_for_timeout(300)
    assert p.locator('video').evaluate('v=>!v.paused&&v.loop&&v.currentTime>0')
   assert not errors,errors
   rows.append({'engine':engine,'index':r['index'],'action':action,'sourceAction':source,'sameCharacter':True,'idleTransition':True});print('PASS',engine,r['index'],flush=True)
  b.close()
(root/'release-motion.json').write_text(json.dumps(rows,indent=2)+'\n');assert len(rows)==60
print('PASS 60 release backup/action checks; physical iPad not tested')
