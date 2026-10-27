"""Synthetic speech lifecycle and real local API keypad checks, no physical-device audio claim."""
exec(open('output/jeremy-latest-integration/browser-check.py').read().split('with sync_playwright() as pw:')[0])
VOICE_STUB='''(() => {
 const q=window.__speech={started:0,cancelled:0,active:false,texts:[]};
 window.SpeechSynthesisUtterance=class {constructor(text){this.text=text;}};
 Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{
 getVoices:()=>[{name:'QA Taiwan',lang:'zh-TW',voiceURI:'qa-tw',localService:true,default:true},{name:'QA English',lang:'en-US',voiceURI:'qa-en',localService:true}],
 cancel(){q.cancelled++;q.active=false;},speak(u){q.started++;q.active=true;q.texts.push(u.text);},
 addEventListener(){},removeEventListener(){}
 }});
})();'''
with sync_playwright() as pw:
 for engine in ['chromium','webkit']:
  browser=getattr(pw,engine).launch(headless=True);c=login(browser,2,834,1194);c.add_init_script(VOICE_STUB)
  s=state(c);id=s['playerId'];r=s['family']['profiles'][id].get('mathIsland',{}).get('run')
  if r and not r['completed']:command(c,type='island-quit',player=id,runId=r['id'])
  page=c.new_page();open_math(page);page.locator('.isl-isle').first.click();page.locator('.isl-stagebtn').first.click();page.locator('.isl-lesson').wait_for();page.locator('.isl-lesson-controls button[aria-pressed]').click();page.wait_for_function('()=>window.__speech.active')
  page.get_by_role('button',name='暫停',exact=True).click();assert not page.evaluate('window.__speech.active');step=page.locator('.isl-lesson-frame').get_attribute('data-step');started=page.evaluate('window.__speech.started');page.wait_for_timeout(1200);assert page.evaluate('window.__speech.started')==started and page.locator('.isl-lesson-frame').get_attribute('data-step')==step
  page.get_by_role('button',name='繼續看',exact=True).click();page.wait_for_function('()=>window.__speech.active');page.get_by_role('button',name='下一步教學',exact=True).click();expect(page.locator('.isl-lesson-frame')).to_have_attribute('data-step',str(int(step)+1));page.wait_for_function('()=>window.__speech.active')
  page.locator('.isl-journey').get_by_role('button',name='換小島',exact=True).click();page.locator('#math-island[data-screen=map]').wait_for();assert not page.evaluate('window.__speech.active');started=page.evaluate('window.__speech.started');page.wait_for_timeout(1500);assert page.evaluate('window.__speech.started')==started;record(engine+' voice pause/resume, seek cancellation and leaving stops playback')
  page.get_by_role('button',name='回港口',exact=False).click();assert not page.evaluate('window.__speech.active');c.close()
  c=login(browser,1,320,740);s=state(c);id=s['playerId'];r=s['family']['profiles'][id].get('mathIsland',{}).get('run')
  if r and not r['completed']:command(c,type='island-quit',player=id,runId=r['id'])
  for mode in ['learn','play']:
   command(c,type='island-start',player=id,mode=mode,unit='1B-04');r=raw(1)['profiles'][id]['mathIsland']['run']
   for i,q in enumerate(r['items']):command(c,type='island-answer',player=id,runId=r['id'],index=i,choice=q['answer'])
   command(c,type='island-finish',player=id,runId=r['id'])
  page=c.new_page();open_math(page);page.locator('.isl-isle').nth(3).click();page.locator('.isl-stagebtn').nth(2).click();page.locator('.isl-keypad').wait_for();layout(page,'320px keypad');page.locator('.isl-keypad').scroll_into_view_if_needed();assert page.locator('.isl-journey').evaluate('(e)=>getComputedStyle(e).position')=='static'
  assert page.locator('.isl-keys button').first.evaluate('(e)=>{let r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}')
  for key in ['1','0','0']:page.locator('.isl-keys').get_by_role('button',name=key,exact=True).click()
  # No automatic submission: even a three-digit value waits for explicit confirmation.
  assert len(raw(1)['profiles'][id]['mathIsland']['run']['answers'])==0
  page.get_by_role('button',name='寫好了',exact=True).click();page.locator('.isl-next').wait_for();assert raw(1)['profiles'][id]['mathIsland']['run']['answers']==['100'];page.screenshot(path=str(OUT/(engine+'-keypad-320.png')),full_page=True);record(engine+' 320px three-digit keypad 100, explicit confirm and server persistence')
  c.close();browser.close()
 OUT.joinpath('voice-keypad-results.json').write_text(json.dumps({'pass':True,'checks':checks,'speechEngine':'instrumented lifecycle stub','realLocalPostgres':True,'physicalDeviceAudio':False,'productionMutations':False},ensure_ascii=False,indent=2)+'\n')
