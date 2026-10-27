"""Exercise two masked actors together; CPU throttling is not a physical iPad test."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright
rows=[]
with sync_playwright() as pw:
 for engine,rate in [('chromium',1),('chromium',4),('webkit',1)]:
  b=getattr(pw,engine).launch(headless=True);p=b.new_page(viewport={'width':1024,'height':768},has_touch=True);errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
  if engine=='chromium':p.context.new_cdp_session(p).send('Emulation.setCPUThrottlingRate',{'rate':rate})
  p.goto('http://127.0.0.1:47741/outputs/monster-wave4/review.html?ids=81,82');p.wait_for_function("document.querySelectorAll('[data-motion-ready=true]').length===2")
  p.get_by_role('button',name='待機',exact=True).click();p.wait_for_function("document.querySelectorAll('[data-motion-ready=true][data-monster-action=idle]').length===2")
  result=p.evaluate('''async()=>{const cvs=[...document.querySelectorAll('canvas')];const changes=[0,0],last=['',''];for(let n=0;n<40;n++){await new Promise(r=>setTimeout(r,250));cvs.forEach((c,i)=>{let s=c.toDataURL();if(s!==last[i])changes[i]++;last[i]=s;});}return {changes,video:[...document.querySelectorAll('video')].map(v=>({muted:v.muted,inline:v.playsInline,time:v.currentTime,paused:v.paused}))};}''')
  assert all(n>=25 for n in result['changes']),(engine,rate,result)
  assert all(v['muted'] and v['inline'] and not v['paused'] for v in result['video'])
  p.evaluate("document.querySelector('main').style.marginTop='2000px'");p.wait_for_function("document.querySelectorAll('.monster-motion video').length===0")
  p.evaluate("document.querySelector('main').style.marginTop='0px'");p.wait_for_function("document.querySelectorAll('[data-motion-ready=true]').length===2")
  assert not errors,errors
  row={'engine':engine,'cpuThrottle':rate,**result,'offscreenStopped':True,'reenteredResumed':True,'physicalIPad':False};rows.append(row);print('PASS',row,flush=True);b.close()
Path('outputs/monster-wave4/paired-motion.json').write_text(json.dumps(rows,indent=2)+'\n')
