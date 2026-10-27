from pathlib import Path
import json
from playwright.sync_api import sync_playwright
out=Path(__file__).parent;answers=json.loads(Path('/tmp/g1-math-answers.json').read_text());results=[]
with sync_playwright() as p:
 b=p.webkit.launch(headless=True)
 for suffix in ['regular','long','visual']:
  page=b.new_page(viewport={'width':320,'height':740});page.on('pageerror',lambda e:print('PAGEERROR',e));page.add_init_script("window.__spoken=[];window.SpeechSynthesisUtterance=class{constructor(text){this.text=text;}};Object.defineProperty(window,'speechSynthesis',{value:{cancel(){},getVoices(){return [{lang:'zh-TW',name:'QA Taiwan'}]},speak(u){window.__spoken.push(u.text);setTimeout(()=>u.onend?.(),0)},addEventListener(){},removeEventListener(){}}});");page.goto('http://127.0.0.1:4333');page.get_by_placeholder('英文字母、數字或底線').fill('g1_math_'+suffix);page.get_by_placeholder('請輸入密碼').fill('0742');page.get_by_role('button',name='登入，繼續冒險 →').click();page.get_by_role('button',name='繼續挑戰',exact=True).click()
  if page.get_by_role('button',name='▶ 開始這題',exact=True).count():page.get_by_role('button',name='▶ 開始這題',exact=True).click()
  page.locator('[data-answer-option]').first.wait_for()
  state=page.evaluate('async()=>await (await fetch("/api/state")).json()');pid=state['playerId'];q=state['questions'][pid]
  assert q['id'].startswith('m1hx-') and 'answer' not in q
  for width in [320,390,820]:
   page.set_viewport_size({'width':width,'height':850});page.wait_for_timeout(120)
   assert not page.evaluate('document.documentElement.scrollWidth>innerWidth')
   page.locator('[data-answer-option]').first.scroll_into_view_if_needed();page.screenshot(path=str(out/f'{suffix}-{width}.png'),full_page=True)
   results.append({'course':q['course'],'width':width,'newSource':True,'noOverflow':True})
  listen=page.get_by_role('button',name='播放題目聲音');assert listen.count()>0;listen.first.click();page.wait_for_timeout(400);spoken=page.evaluate('window.__spoken.join(String.fromCharCode(32))');assert spoken,page.locator('body').inner_text();results.append({'fixture':suffix,'listenInvoked':True,'spokenText':spoken,'syntheticSpeechOnly':True})
  before=state['family']['profiles'][pid]['milestones']['masteryPoints'];page.locator('[data-answer-option]').nth(answers[q['id']]).click();page.wait_for_timeout(700)
  after=page.evaluate('async()=>await (await fetch("/api/state")).json()');assert after['family']['profiles'][pid]['milestones']['masteryPoints']>before
  page.reload();page.wait_for_load_state('networkidle');restored=page.evaluate('async()=>await (await fetch("/api/state")).json()');assert restored['family']['profiles'][pid]['milestones']['masteryPoints']==after['family']['profiles'][pid]['milestones']['masteryPoints']
  results.append({'course':q['course'],'answered':True,'pointsPersistedAfterReload':True});page.close()
 b.close()
(out/'browser-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2));print(json.dumps(results))
