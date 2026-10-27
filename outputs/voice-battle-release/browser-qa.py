from playwright.sync_api import sync_playwright, expect
from pathlib import Path
import json,time
OUT=Path('outputs/voice-battle-release'); report={'engine':'WebKit iPad touch emulation; synthetic mic, real MediaRecorder; local fixture AI','checks':[]}
def check(name, ok=True, detail=None):
 assert ok,name
 report['checks'].append({'name':name,'pass':True,**({'detail':detail} if detail is not None else {})});(OUT/'browser-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print('PASS',name,flush=True)
def open_chat(p):
 p.get_by_role('button',name='找潮光獸，摸摸或聊聊天',exact=True).click()
 p.locator('.tide-tabs button').nth(1).click()
 expect(p.locator('.tide-mic')).to_be_enabled(timeout=20000)
def close_chat(p):p.get_by_role('button',name='收起潮光獸',exact=True).click()
with sync_playwright() as pw:
 b=pw.webkit.launch(headless=True)
 # Isolated component fixture retains actual event handlers, including race/timer paths.
 c=b.new_context(viewport={'width':390,'height':844});p=c.new_page();p.goto('http://127.0.0.1:4294/qa/battle-remediation/index.html');p.locator('#run').click();p.wait_for_function("document.querySelector('#report').textContent.includes('COMPLETE') || document.querySelector('#report').textContent.includes('FAIL')",timeout=30000)
 text=p.locator('#report').inner_text();(OUT/'component-checks.txt').write_text(text);check('21 component interaction checks', 'FAIL' not in text and text.count('PASS ')==21,text.splitlines());p.screenshot(path=str(OUT/'review-component-390.png'));c.close()
 c=b.new_context(**pw.devices['iPad (gen 7)']);p=c.new_page();errors=[];p.on('pageerror',lambda e:(errors.append({'name':e.name,'message':e.message}),(OUT/'browser-errors.json').write_text(json.dumps(errors,ensure_ascii=False,indent=2))))
 try:
  p.goto('http://localhost:4293/qa-login');p.get_by_role('button',name='選擇荳荳，1年級',exact=True).click();open_chat(p)
  p.locator('.tide-voice-details').first.locator('summary').click();p.locator('.tide-voice-details').first.get_by_role('button',name='重新聊',exact=True).click();p.locator('.tide-voice-details').first.get_by_role('button',name='清除對話',exact=True).click();expect(p.locator('.tide-heard')).to_have_count(0);p.locator('.tide-voice-details').first.locator('summary').click()
  with p.expect_response(lambda r:'/kiki-20261025/microphone.mp3' in r.url) as clip:p.get_by_role('button',name='聽怎麼和潮光獸說話').click()
  check('Kiki microphone instruction served',clip.value.ok)
  p.locator('.tide-mic').click();expect(p.locator('#qa-mic-state')).to_contain_text('active tracks 1');p.wait_for_timeout(1800);p.locator('.tide-mic').click();expect(p.locator('.tide-heard')).to_contain_text('海龜',timeout=20000);expect(p.locator('#qa-mic-state')).to_contain_text('active tracks 0');check('iPad WebKit record/send/reply releases microphone')
  # Stop/replay explicitly under user gesture, then another conversational turn.
  replay=p.locator('.tide-voice-turn .tide-bubble button')
  if '停止播放' in replay.inner_text():replay.click()
  replay.click();expect(replay).to_contain_text('停止播放');replay.click();check('Reply replays on touch gesture')
  p.locator('.tide-mic').click();p.wait_for_timeout(1300);p.locator('.tide-mic').click();expect(p.locator('.tide-heard')).to_contain_text('剛剛',timeout=20000);expect(p.locator('.tide-voice-turn .tide-bubble p')).to_contain_text('你剛剛說喜歡海龜');check('Second voice turn retains child conversation context')
  p.screenshot(path=str(OUT/'tablet-voice-context.png'));close_chat(p)
  p.reload();p.get_by_role('button',name='選擇荳荳，1年級',exact=True).click();open_chat(p);expect(p.locator('.tide-heard')).to_contain_text('剛剛');check('Conversation survives authenticated reload')
  p.locator('.tide-mic').click();expect(p.locator('#qa-mic-state')).to_contain_text('active tracks 1');p.locator('.tide-cancel-recording').click();expect(p.locator('#qa-mic-state')).to_contain_text('active tracks 0');check('Cancel releases audio tracks')
  p.locator('.tide-mic').click();expect(p.locator('#qa-mic-state')).to_contain_text('active tracks 1');close_chat(p);expect(p.locator('#qa-mic-state')).to_contain_text('active tracks 0');check('Closing panel releases audio tracks')
  p.locator('#qa-denied').click();open_chat(p);p.locator('.tide-mic').click();expect(p.locator('.tide-voice-chat .tide-error')).to_be_visible();check('Denied permission displays recovery action');close_chat(p);p.locator('#qa-normal').click();open_chat(p)
  # Use typing as a real supported fallback after recovery.
  p.locator('.tide-voice-details').filter(has=p.locator('textarea')).locator('summary').click();p.locator('#tide-typed-message').fill('我想看看大海');p.locator('.tide-voice-chat form button').click();expect(p.locator('.tide-heard')).to_contain_text('我想看看大海');check('Typing fallback works after denied microphone');close_chat(p)
  p.get_by_role('button',name='切換玩家',exact=True).click();p.get_by_role('button',name='選擇斐斐，2年級',exact=True).click();open_chat(p);check('Different child has separate conversation',p.locator('.tide-heard').count()==0)
  for w,h in [(320,760),(390,844),(768,1024),(1024,768)]:
   p.set_viewport_size({'width':w,'height':h});p.wait_for_timeout(150)
   metrics=p.evaluate("""()=>{const d=document.querySelector('dialog.tide-panel')||document.querySelector('.tide-panel'),m=document.querySelector('.tide-mic'),r=m.getBoundingClientRect();return {viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,panelClient:d.clientWidth,panelScroll:d.scrollWidth,mic:{x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom},height:innerHeight}}""")
   check(f'Grade 2 touch layout {w}x{h}',metrics['documentWidth']<=w and metrics['panelScroll']<=metrics['panelClient']+1 and metrics['mic']['bottom']<=h and metrics['mic']['y']>=0,metrics);p.screenshot(path=str(OUT/f'voice-layout-{w}.png'))
  report['navigationDiagnostics']=errors
  check('No JavaScript runtime exception; reload recovers',all(e['name']=='Fetch API cannot load http' and e['message']=='/localhost:4293/api/state due to access control checks.' for e in errors),errors)
  report['status']='PASS';report['recordingEvents']=p.request.get('http://localhost:4293/qa-evidence').json();(OUT/'browser-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
 except Exception:
  p.screenshot(path=str(OUT/'browser-failure.png'));(OUT/'browser-failure.txt').write_text(p.locator('body').inner_text());raise
 finally:c.close();b.close()
