from pathlib import Path
import json
from playwright.sync_api import sync_playwright
answers=json.loads(Path('/tmp/english41-answers.json').read_text());out=[]
with sync_playwright() as p:
 b=p.webkit.launch();page=b.new_page(viewport={'width':390,'height':844});page.goto('http://127.0.0.1:4332');page.get_by_placeholder('英文字母、數字或底線').fill('english41_alan');page.get_by_placeholder('請輸入密碼').fill('0742');page.get_by_role('button',name='登入，繼續冒險 →').click();page.get_by_role('button',name='繼續挑戰',exact=True).click()
 for i in range(8):
  page.wait_for_timeout(600)
  s=page.evaluate('async()=>await (await fetch("/api/state")).json()');pid=s['playerId'];run=s['family']['profiles'][pid]['run']
  if run['status']!='active':break
  if run.get('settled'):
   buttons=page.get_by_role('button',name='下一題 ➜',exact=True)
   if buttons.count():buttons.click()
   else:page.wait_for_timeout(2000)
   continue
  start=page.get_by_role('button',name='▶ 開始這題',exact=True)
  if start.count():start.click()
  q=s['questions'][pid];assert q['id'].startswith('ex2-') and 'answer' not in q
  page.locator('[data-answer-option]').nth(answers[q['id']]).click();out.append(q['id']);page.wait_for_timeout(1400)
 s=page.evaluate('async()=>await (await fetch("/api/state")).json()');run=s['family']['profiles'][s['playerId']]['run'];assert len(run['answers'])==6 and all(run['answers']),run
 page.reload();page.wait_for_load_state('networkidle');restored=page.evaluate('async()=>await (await fetch("/api/state")).json()');assert restored['family']['profiles'][s['playerId']]['run']['answers']==run['answers']
 page.screenshot(path='output/english-extra/completed-run.png',full_page=True)
 report={'answeredNewQuestionIds':out,'sixCorrect':True,'reloadPreserved':True,'runStatus':run['status'],'syntheticLocalAccountOnly':True};Path('output/english-extra/complete-run.json').write_text(json.dumps(report,indent=2));print(report);b.close()
