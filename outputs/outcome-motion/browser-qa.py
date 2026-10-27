from pathlib import Path
import re
# Reuse the synthetic cloud fixtures/route semantics, not real child accounts.
helpers=Path('outputs/quiz-victory/browser-qa.py').read_text().split('with sync_playwright() as pw:')[0]
helpers=helpers.replace("'領取獎勵' if mode=='pending'", "'繼續挑戰' if mode=='defeat' else '領取獎勵' if mode=='pending'")
helpers=helpers.replace("p.route('**/api/**',api);p.goto", """p.route('**/api/**',api)
 p.add_init_script("window.qaHidden=false;Object.defineProperty(document,'visibilityState',{get:()=>window.qaHidden?'hidden':'visible'});")
 if FAULT=='legacy':p.add_init_script("Object.defineProperty(navigator,'userAgent',{get:()=> 'Mozilla/5.0 (iPad; CPU OS 15_4_1 like Mac OS X) Version/15.4 Mobile Safari'});")
 if FAULT in ['reject','both-broken']:
  p.add_init_script("const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){return this.src.includes('/outcome-motion-v1/')?Promise.reject(new Error('synthetic playback rejection')):play.call(this)};")
 if FAULT=='both-broken':p.route('**/assets/outcome-motion-v1/*-?.jpg',lambda r:r.abort())
 p.goto""")
helpers=helpers.replace("elif t=='start':", "elif t=='correct-run':state['value']=copy.deepcopy(data[mode]['corrections'][cmd['index']])\n   elif t=='start':")
exec(helpers)
out=Path('outputs/outcome-motion');data=json.loads((out/'fixtures.json').read_text());FAULT='normal'
def play_state(p,source=None):
 expect(p.locator('.outcome-scene')).to_have_attribute('data-playing','true',timeout=12000)
 if source:expect(p.locator('.outcome-scene')).to_have_attribute('data-source',source)
def still(p):expect(p.locator('.outcome-scene')).to_have_attribute('data-source','still',timeout=15000)
def no_commands(s):return len(s['commands'])==0
with sync_playwright() as pw:
 for engine in ['webkit','chromium']:
  b=pw.webkit.launch() if engine=='webkit' else pw.chromium.launch(channel='chrome',headless=True)
  for mode in ['normal','wrong-last','defeat']:
   c,p,s=setup(b,mode,active=True)
   p.locator('.answer-grid button').nth(data[mode]['choice']).click();expect(p.locator('.result-panel')).to_be_hidden()
   expect(p.locator('.outcome-scene')).to_be_visible(timeout=12000);play_state(p)
   check(engine+' live '+mode+' starts after last combat action')
   check(engine+' actual voyage companion stays visible',p.locator('.outcome-companion').get_attribute('alt')=='潮光獸')
   still(p);check(engine+' '+mode+' completes once',len(s['commands'])==1 and s['commands'][0]['type']=='answer')
   p.evaluate("window.qaHidden=true;document.dispatchEvent(new Event('visibilitychange'));window.qaHidden=false;document.dispatchEvent(new Event('visibilitychange'))");p.wait_for_timeout(400);still(p)
   check(engine+' '+mode+' background after end does not replay');c.close()
  for mode in ['normal','defeat']:
   c,p,s=setup(b,mode,active=True)
   p.locator('.answer-grid button').nth(data[mode]['choice']).click()
   p.evaluate("window.qaHidden=true;document.dispatchEvent(new Event('visibilitychange'))")
   expect(p.locator('.outcome-scene')).to_be_attached(timeout=12000);still(p)
   p.evaluate("window.qaHidden=false;document.dispatchEvent(new Event('visibilitychange'))");p.wait_for_timeout(300);still(p)
   check(engine+' '+mode+' hidden before result mount stays still',len(s['commands'])==1)
   p.get_by_role('button',name='重播結算動畫').click();play_state(p)
   p.evaluate("window.qaHidden=true;document.dispatchEvent(new Event('visibilitychange'))");still(p)
   p.evaluate("window.qaHidden=false;document.dispatchEvent(new Event('visibilitychange'))");p.wait_for_timeout(300);still(p)
   check(engine+' '+mode+' video hidden mid-scene never restarts',len(s['commands'])==1);c.close()
  for w,h in [(320,568),(390,844),(820,1180),(1194,834)]:
   c,p,s=setup(b,w=w,h=h);still(p);check(engine+f' historical result CTA fits {w}',visible_cta(p));check(engine+f' no overflow {w}',p.evaluate('document.documentElement.scrollWidth<=innerWidth'))
   p.get_by_role('button',name='重播結算動畫').click();play_state(p);p.screenshot(path=str(out/f'{engine}-{w}.png'));p.get_by_role('button',name='略過結算動畫').click();still(p);check(engine+f' replay and skip do not mutate {w}',no_commands(s));c.close()
  for w,h in [(390,844),(820,1180)]:
   c,p,s=setup(b,'defeat',w=w,h=h);still(p)
   for i in range(3):
    answer=data['defeat']['won']['reviews']['qingqing'][i]['question']['answer']
    p.locator('.battle-review-choices button').nth(answer).click()
    expect(p.locator('.battle-review')).to_contain_text('已訂正 '+str(i+1)+' 道')
   expect(p.get_by_role('button',name='再挑戰一次',exact=True)).to_be_enabled()
   p.get_by_role('button',name='再挑戰一次',exact=True).evaluate('(e)=>{e.click();e.click()}')
   expect(p.locator('.challenge-preparation')).to_be_visible()
   check(engine+f' defeat correction and retry once {w}',len(s['commands'])==4 and s['commands'][-1]['type']=='start');c.close()
  for fault in ['legacy','reject','both-broken']:
   FAULT=fault
   for mode in ['normal','defeat']:
    c,p,s=setup(b,mode);still(p);p.get_by_role('button',name='重播結算動畫').click()
    if fault=='both-broken':
     still(p);check(engine+' '+mode+' both formats fail safely',p.locator('.outcome-companion').evaluate('(i)=>i.complete&&i.naturalWidth>0') and no_commands(s))
    else:
     play_state(p,'frames');expect(p.locator('.outcome-scene canvas')).to_have_attribute('data-frame',re.compile(r'^(?:[2-9]|[12][0-9]|3[01])$'))
     a=p.locator('.outcome-scene canvas').evaluate('(c)=>c.toDataURL()');p.wait_for_timeout(300);z=p.locator('.outcome-scene canvas').evaluate('(c)=>c.toDataURL()');check(engine+' '+fault+' '+mode+' frame pixels advance',a!=z)
     p.evaluate("window.qaHidden=true;document.dispatchEvent(new Event('visibilitychange'))");still(p);p.evaluate("window.qaHidden=false;document.dispatchEvent(new Event('visibilitychange'))");p.wait_for_timeout(400);still(p);check(engine+' '+fault+' '+mode+' hidden stops without replay or commands',no_commands(s))
    c.close()
   FAULT='normal'
  c,p,s=setup(b,reduced=True,active=True);p.locator('.answer-grid button').nth(data['normal']['choice']).click();expect(p.locator('.outcome-scene')).to_be_visible(timeout=2500);still(p);expect(p.get_by_role('button',name='已減少動態')).to_be_disabled();check(engine+' reduced-motion keeps still and CTA',visible_cta(p));c.close()
  b.close()
check('No JavaScript errors',not errors)
(out/'browser-results.json').write_text(json.dumps({'checks':checks,'errors':errors,'physicalIpad15':False,'source':'Synthetic cloud state, modern WebKit and Chrome; legacy routing and media faults injected.'},ensure_ascii=False,indent=2))
