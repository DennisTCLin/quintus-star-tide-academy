from playwright.sync_api import sync_playwright,expect
from pathlib import Path
import json,base64
OUT=Path('output/mobile-tablet-flow');BASE='http://localhost:4388';fixtures=json.loads(Path('/tmp/star-tide-flow-private/accounts.json').read_text());rows=[];errors=[]
with sync_playwright() as p:
 for engine in ['chromium','webkit']:
  b=p.chromium.launch(channel='chrome') if engine=='chromium' else p.webkit.launch()
  for grade in [1,2,4,6]:
   f=next(f for f in fixtures if f['engine']==engine and f['grade']==grade and f['state']=='voice');device='iPad Pro 11' if grade in [2,4] else 'iPhone 13';c=b.new_context(**p.devices[device]);page=c.new_page();page.set_default_timeout(20000);page.on('pageerror',lambda e:errors.append(str(e)));posts=[]
   def capture(r):
    if r.method=='POST' and r.url.endswith('/api/companion-talk'):
     posts.append(r.url);body=r.post_data_json
     if 'audio' in body:
      ext='mp4' if 'mp4' in body['mime'] else 'webm';(OUT/f'{engine}-capture.{ext}').write_bytes(base64.b64decode(body['audio']));(OUT/f'{engine}-capture.json').write_text(json.dumps({'mime':body['mime'],'extension':ext,'syntheticOnly':True}))
   page.on('request',capture)
   page.goto(BASE);page.get_by_placeholder('英文字母、數字或底線').fill(f['username']);page.get_by_placeholder('請輸入密碼').fill(f['password']);page.get_by_role('button',name='登入，繼續冒險 →').click()
   def openchat():
    page.locator('.tide-launch').click();page.locator('.tide-tabs button').nth(1).click();expect(page.locator('.tide-mic')).to_be_enabled()
   def closechat():page.locator('.tide-window-actions button').last.click()
   def history():return page.evaluate('async()=>{let s=await(await fetch("/api/state")).json();return(await(await fetch("/api/companion-talk?player="+s.playerId)).json()).history}')
   openchat()
   # Clear synthetic account conversation through the real UI before this suite.
   details=page.locator('.tide-voice-details').first;details.locator('summary').click();details.get_by_role('button',name='重新聊',exact=True).click();details.get_by_role('button',name='清除對話',exact=True).click();expect(page.locator('.tide-heard')).to_have_count(0);details.locator('summary').click()
   page.locator('.tide-mic').tap();page.wait_for_function('window.__qaMic.active===1');page.wait_for_timeout(1400);page.locator('.tide-mic').tap();expect(page.locator('.tide-heard')).to_contain_text('海龜');page.wait_for_function('window.__qaMic.active===0');expect(page.locator('.tide-voice-status')).to_contain_text('正在說話');page.locator('.tide-voice-turn button').click()
   page.locator('.tide-mic').tap();page.wait_for_timeout(1300);page.locator('.tide-mic').tap();expect(page.locator('.tide-voice-turn .tide-bubble p')).to_contain_text('你剛剛說喜歡海龜');expect(page.locator('.tide-voice-status')).to_contain_text('正在說話');page.locator('.tide-voice-turn button').click();assert len(history())==2
   # Speech failure retries only audio, never the submitted turn.
   page.route('**/api/companion-talk/speech',lambda r:r.fulfill(status=503,content_type='application/json',body='{"error":"合成語音暫時無法播放"}'))
   page.locator('.tide-voice-details').filter(has=page.locator('textarea')).locator('summary').click();page.locator('textarea').fill('記得我喜歡什麼嗎？');page.locator('.tide-voice-chat form button').click();recover=page.get_by_role('button',name='再聽一次',exact=True);expect(recover).to_be_visible();turns=len(posts);stored=history();assert len(stored)==3
   page.unroute('**/api/companion-talk/speech');recover.tap();expect(page.locator('.tide-voice-status')).to_contain_text('正在說話');expect(recover).to_have_count(0);assert len(posts)==turns and history()==stored;page.locator('.tide-voice-turn button').click()
   if grade>2:expect(page.locator('.tide-voice-turn button')).to_have_count(0)
   # A separate AudioContext interruption must expose the same recovery affordance.
   page.evaluate('''()=>{window.__qaBlockAudio=true;const proto=AudioContext.prototype,original=proto.resume;let base=proto,desc;while(base&&!desc){desc=Object.getOwnPropertyDescriptor(base,'state');base=Object.getPrototypeOf(base)};proto.resume=function(){return window.__qaBlockAudio?Promise.reject(new DOMException('blocked','NotAllowedError')):original.call(this)};Object.defineProperty(proto,'state',{configurable:true,get(){return window.__qaBlockAudio?'suspended':desc.get.call(this)}})}''')
   page.locator('textarea').fill('再聊一句');page.locator('.tide-voice-chat form button').click();expect(recover).to_be_visible();turns=len(posts);stored=history();page.evaluate('window.__qaBlockAudio=false');recover.tap();expect(page.locator('.tide-voice-status')).to_contain_text('正在說話');assert len(posts)==turns and history()==stored;page.locator('.tide-voice-turn button').click()
   closechat();page.reload();page.locator('.tide-launch').wait_for();openchat();assert history()==stored;expect(page.locator('.tide-heard')).to_contain_text('再聊一句')
   for kind in ['cancel','close','background']:
    page.locator('.tide-mic').tap();page.wait_for_function('window.__qaMic.active===1')
    if kind=='cancel':page.locator('.tide-cancel-recording').tap()
    elif kind=='close':closechat()
    else:page.evaluate('Object.defineProperty(document,"hidden",{configurable:true,get:()=>true});document.dispatchEvent(new Event("visibilitychange"))')
    page.wait_for_function('window.__qaMic.active===0');assert history()==stored
    if kind=='close':openchat()
    if kind=='background':page.evaluate('Object.defineProperty(document,"hidden",{configurable:true,get:()=>false});document.dispatchEvent(new Event("visibilitychange"))')
   page.evaluate('window.__qaMic.mode="denied"');page.locator('.tide-mic').tap();expect(page.locator('.tide-voice-chat .tide-error')).to_be_visible();assert page.evaluate('window.__qaMic.active')==0;page.evaluate('window.__qaMic.mode="normal"');page.locator('.tide-mic').tap();page.wait_for_function('window.__qaMic.active===1');page.locator('.tide-cancel-recording').tap();page.wait_for_function('window.__qaMic.active===0')
   for w,h in [(375,667),(820,1180),(1180,820),(844,390)]:
    page.set_viewport_size({'width':w,'height':h});page.locator('.tide-mic').scroll_into_view_if_needed();assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1');assert page.locator('.tide-mic').evaluate('(e)=>{let r=e.getBoundingClientRect();return r.width>=44&&r.height>=44&&e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}')
   page.screenshot(path=str(OUT/f'{engine}-voice-grade{grade}.png'));closechat();c.close();rows.append({'engine':engine,'grade':grade,'deviceEmulation':device,'recordSendActualCodec':True,'twoTurnContext':True,'replyAudioPlaying':True,'speech503RecoveryWithoutDuplicate':True,'audioContextRecoveryWithoutDuplicate':True,'reloadMemory':True,'cancelCloseBackgroundReleaseTracks':True,'permissionDeniedRecoverable':True,'layouts':4});print('PASS voice',engine,grade,flush=True)
  b.close()
assert not errors,errors
(OUT/'voice-results.json').write_text(json.dumps({'checks':rows,'pageErrors':errors,'physicalMicrophone':False,'provider':'local deterministic fixture','codecEvidence':'chromium-capture.json and webkit-capture.json'},indent=2));print('PASS all voice suites')
