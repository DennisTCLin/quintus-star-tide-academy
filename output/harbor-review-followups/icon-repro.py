import json
from pathlib import Path
from playwright.sync_api import sync_playwright
f=next(x for x in json.loads(Path('/tmp/star-tide-harbor-private/local.json').read_text()) if x['grade']==1 and x['state']=='new');out=[]
with sync_playwright() as p:
 for engine in [p.webkit,p.chromium]:
  b=engine.launch();page=b.new_page(viewport={'width':375,'height':667});page.goto('http://localhost:4364');page.get_by_placeholder('英文字母、數字或底線').fill(f['username']);page.get_by_placeholder('請輸入密碼').fill(f['password']);page.get_by_role('button',name='登入，繼續冒險 →').click();page.locator('.harbor-departure-start').wait_for();page.wait_for_load_state('networkidle');page.evaluate('document.fonts.ready')
  for seconds in [1,5]:
   page.wait_for_timeout(seconds*1000)
   icons=page.evaluate('''()=>[...document.querySelectorAll('.cloud-status [data-brand-icon],.harbor-departure-listen [data-brand-icon],.voice-button [data-brand-icon]')].map(e=>{let r=e.getBoundingClientRect(),b=e.getBBox();return {name:e.dataset.brandIcon,width:r.width,height:r.height,bbox:{x:b.x,y:b.y,w:b.width,h:b.height},href:e.querySelector('use')?.getAttribute('href')}})''')
   page.screenshot(path=f'output/harbor-review-followups/{engine.name}-grade1-375-after-{seconds}s.png');out.append({'engine':engine.name,'waitSeconds':seconds,'icons':icons})
  b.close()
Path('output/harbor-review-followups/icon-before.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out))
