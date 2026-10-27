import json
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path('outputs/monster-wave4/qa');out.mkdir(exist_ok=True)
rows=[]
with sync_playwright() as pw:
 for engine in ['chromium','webkit']:
  b=getattr(pw,engine).launch(headless=True);page=b.new_page(viewport={'width':1024,'height':768},device_scale_factor=1)
  page.goto('http://127.0.0.1:47741/outputs/monster-wave4/review.html')
  page.locator('[data-motion-ready=true]').wait_for(timeout=20000)
  for text,action in zip(['登場','待機','攻擊','受擊','降服'],['entrance','idle','attack','hit','capture']):
   page.get_by_role('button',name=text,exact=True).click();page.wait_for_timeout(1000)
   m=page.locator('.monster-motion');assert m.get_attribute('data-motion-ready')=='true',(engine,action)
   assert m.get_attribute('data-monster-action')==action,(engine,action)
   pixels=page.locator('canvas').evaluate('''c=>{const x=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let solid=0,clear=0,pink=0;for(let i=0;i<x.length;i+=4){if(x[i+3]<10)clear++;if(x[i+3]>200){solid++;if(Math.min(x[i],x[i+2])-x[i+1]>70)pink++;}}return {solid,clear,pink};}''')
   assert pixels['solid']>2000 and pixels['clear']>30000 and pixels['pink']<100,(engine,action,pixels)
   rows.append({'engine':engine,'action':action,**pixels})
   page.screenshot(path=str(out/f'{engine}-{action}.png'))
  page.emulate_media(reduced_motion='reduce');page.wait_for_timeout(200);assert page.locator('video').count()==0
  page.emulate_media(reduced_motion='no-preference');page.wait_for_timeout(500)
  page.route('**/*.mp4*',lambda r:r.abort());page.reload();page.get_by_role('button',name='播放星鑄裁決者的動畫',exact=True).wait_for(timeout=20000)
  assert page.locator('.monster-motion>img').evaluate('e=>e.complete&&e.naturalWidth>0&&getComputedStyle(e).visibility==="visible"')
  b.close()
(out/'motion.json').write_text(json.dumps(rows,indent=2)+'\n')
print('PASS',len(rows),'action/engine checks; alpha, reduced motion and failed-video poster fallback')
