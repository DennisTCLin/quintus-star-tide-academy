from playwright.sync_api import sync_playwright,expect
from pathlib import Path
import json
base='http://127.0.0.1:4388';fixtures=json.loads(Path('/tmp/star-tide-flow-private/accounts.json').read_text());rows=[]
with sync_playwright() as pw:
 for engine in ['webkit','chromium']:
  b=pw.webkit.launch() if engine=='webkit' else pw.chromium.launch(channel='chrome')
  for grade,w,h in [(1,390,844),(2,820,1180)]:
   f=next(f for f in fixtures if f['engine']==engine and f['grade']==grade and f['state']=='new');c=b.new_context(viewport={'width':w,'height':h},has_touch=True);p=c.new_page();p.set_default_timeout(20000);errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
   p.goto(base);p.get_by_placeholder('英文字母、數字或底線').fill(f['username']);p.get_by_placeholder('請輸入密碼').fill(f['password']);p.get_by_role('button',name='登入，繼續冒險 →').click();p.locator('.harbor-departure-start').wait_for()
   assert p.evaluate('document.documentElement.classList.contains("companion-document-docked")')
   p.locator('.harbor-departure-start').click();picker=p.get_by_role('dialog',name='選擇學習科目');picker.wait_for();picker.locator('.course-picker-card').nth(1).click();p.locator('.ready-start:not([disabled])').wait_for()
   assert not p.evaluate('document.documentElement.classList.contains("companion-document-docked")')
   assert p.locator('.ready-start').evaluate('(e)=>{let r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}')
   expect(p.locator('.tide-launch')).to_have_count(0)
   p.locator('.challenge-modes label').nth(1).click();p.locator('.ready-start').click();p.locator('[data-answer-option]').first.wait_for()
   if p.locator('[data-answer-option]').first.is_disabled():p.get_by_role('button',name='播放題目聲音',exact=True).click()
   expect(p.locator('[data-answer-option]').first).to_be_enabled(timeout=20000)
   oracle=p.request.get(base+'/qa-oracle?username='+f['username']).json();p.locator('[data-answer-option]').nth(oracle['answer']).tap()
   p.wait_for_function('()=>document.querySelector(".quiz-question-count")?.textContent.includes("第 2／")',timeout=30000)
   assert not errors,errors;rows.append({'engine':engine,'grade':grade,'viewport':[w,h],'dockUnlockedForReady':True,'readyCTAVisible':True,'answerAdvances':True,'errors':errors});print('PASS integrated ready/answer',engine,grade,flush=True);c.close()
  b.close()
Path('output/stable-companion-dock/integrated-ready.json').write_text(json.dumps(rows,indent=2))
