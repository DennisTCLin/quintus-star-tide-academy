from playwright.sync_api import sync_playwright,expect
from pathlib import Path
import os,json,time
BASE='http://127.0.0.1:47829';OUT=Path('output/ipad-next-button');meta=json.loads((OUT/'fixture-state.json').read_text());rows=[]
with sync_playwright() as p:
 for engine in ['chromium','webkit']:
  b=getattr(p,engine).launch(headless=True);c=b.new_context(viewport={'width':1024,'height':748},has_touch=True,reduced_motion='reduce');r=c.request.post(BASE+'/api/login',headers={'Origin':BASE},data={'username':'ipad_next_qa','password':os.environ['QA_PASSWORD']});assert r.status==200
  state={'show':True};page=c.new_page()
  def online(route):route.fulfill(json={'serverNow':int(time.time()*1000),'available':True,'room':{'id':'qa-room','status':'finished','revision':1,'side':0,'names':['QA','QA friend'],'battle':None,'hostPet':'nebulafox','deadline':int(time.time()*1000),'reason':'timeout'} if state['show'] else None})
  page.route('**/api/online-battle*',online);page.goto(BASE,wait_until='networkidle');page.get_by_role('button',name='繼續挑戰',exact=True).click();page.locator('[data-answer-option]').first.wait_for()
  s=c.request.get(BASE+'/api/state').json();run=s['family']['profiles']['alston']['run']
  if not run['settled']:page.locator('[data-answer-option]').nth(meta['wrong']).click()
  button=page.get_by_role('button',name='看懂了，下一題',exact=True);button.wait_for();page.wait_for_timeout(150)
  def measure():return page.evaluate('''()=>{const box=s=>{const r=document.querySelector(s).getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height}};return {viewport:innerHeight,banner:box('.online-battle-banner'),main:box('.family-main'),next:box('.quiz-turn-actions')}}''')
  bad=measure();assert bad['next']['bottom']>748,bad;page.screenshot(path=str(OUT/(engine+'-before.png')))
  state['show']=False;page.locator('.online-battle-banner').wait_for(state='detached');page.wait_for_timeout(150);good=button.bounding_box();assert good['y']+good['height']<=748
  rows.append({'engine':engine,'withBanner':bad,'afterBannerExpires':good});c.close();b.close()
OUT.joinpath('before-results.json').write_text(json.dumps({'reproduced':True,'rows':rows},ensure_ascii=False,indent=2)+'\n');print(json.dumps(rows))
