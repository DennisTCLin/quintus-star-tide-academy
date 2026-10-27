from playwright.sync_api import sync_playwright
from pathlib import Path
import json
fs=json.loads(Path('/tmp/star-tide-harbor-private/local.json').read_text());results=[]
with sync_playwright() as p:
 for engine in ['chromium','webkit']:
  b=p.chromium.launch(channel='chrome',headless=True) if engine=='chromium' else p.webkit.launch(headless=True)
  c=b.new_context(viewport={'width':375,'height':667},reduced_motion='reduce');page=c.new_page()
  f=next(f for f in fs if f['grade']==2 and f['state']=='new')
  page.goto('http://localhost:4364');page.get_by_placeholder('英文字母、數字或底線').fill(f['username']);page.get_by_placeholder('請輸入密碼').fill(f['password']);page.get_by_role('button',name='登入，繼續冒險 →').click();page.locator('.harbor-departure-start').wait_for()
  page.locator('.skip-link').focus();page.keyboard.press('Enter');assert page.evaluate("document.activeElement.id")=='harbor-departure'
  page.locator('.harbor-departure-start').focus();page.keyboard.press('Enter');d=page.get_by_role('dialog',name='選擇學習科目');d.wait_for();d.get_by_role('button',name='關閉',exact=True).click();page.wait_for_function("() => document.activeElement.classList.contains('harbor-departure-start')")
  page.add_style_tag(content='.harbor-departure p{font-size:30px!important}.harbor-departure-start{font-size:40px!important}.harbor-departure-start rt{font-size:28px!important}')
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
  page.locator('.harbor-departure-start').click();d.wait_for();d.get_by_role('button',name='關閉',exact=True).click()
  results.append({'engine':engine,'keyboardAndDialogFocus':True,'reducedMotion':True,'text200PercentNoHorizontalOverflow':True});c.close();b.close()
 # Verify the clock is not reset when resuming a live timed question.
 b=p.chromium.launch(channel='chrome',headless=True);c=b.new_context(viewport={'width':375,'height':667});page=c.new_page();f=next(f for f in fs if f['grade']==4 and f['state']=='ready')
 page.goto('http://localhost:4364');page.get_by_placeholder('英文字母、數字或底線').fill(f['username']);page.get_by_placeholder('請輸入密碼').fill(f['password']);page.get_by_role('button',name='登入，繼續冒險 →').click();page.locator('.harbor-departure-start').wait_for()
 page.evaluate('''async()=>{for(let type of ['challenge-mode','ready-question']){let s=await(await fetch('/api/state')).json(),r=s.family.profiles[s.playerId].run;let res=await fetch('/api/command',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':s.csrf},body:JSON.stringify({id:crypto.randomUUID(),revision:s.family.revision,command:{type,player:s.playerId,runId:r.id,...(type==='challenge-mode'?{mode:'standard'}:{index:r.index})}})});if(!res.ok)throw Error('Fixture command failed '+res.status)}}''')
 snap=lambda:page.evaluate('async()=>{let s=await(await fetch("/api/state")).json();return s.family.profiles[s.playerId].run}')
 before=snap();assert before['challenge']['clock'] is not None
 page.reload();page.locator('.harbor-departure-start').click();page.locator('.harbor-departure-start').wait_for(state='hidden');assert snap()==before
 other=c.new_page();other.goto('about:blank');page.bring_to_front();page.wait_for_timeout(400);assert snap()==before
 results.append({'activeTimedResumeKeepsRunIndexDeadline':True,'foregroundPreservesClock':True});c.close();b.close()
Path('output/harbor-first-screen/extra-results.json').write_text(json.dumps(results,indent=2));print('PASS accessibility and active clock')
