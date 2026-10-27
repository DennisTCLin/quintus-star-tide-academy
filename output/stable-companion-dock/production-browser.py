from pathlib import Path
import os,json
os.environ['QA_URL']='https://quintus-star-tide-academy-production.up.railway.app/'
ns={};exec(Path('output/floating-companion/browser-qa.py').read_text().split('with sync_playwright() as pw:')[0],ns)
rows=[]
with ns['sync_playwright']() as pw:
 b=pw.webkit.launch()
 for mascot,w,h in [('dog',390,844),('bow',820,1180),('tideglow',1180,820),('dog',1440,900)]:
  c,p=ns['setup'](b,mascot,w,h);shell=p.locator('.companion-docked');launch=p.locator('.tide-launch')
  assert shell.count()==1
  r=launch.bounding_box();assert shell.bounding_box()['height']+8<=r['y']
  for y in [0,300,900,2000,99999]:
   shell.evaluate('(e,y)=>e.scrollTo({top:y,behavior:"instant"})',y);p.wait_for_timeout(30);now=launch.bounding_box()
   assert abs(now['y']-r['y'])<1 and abs(now['x']-r['x'])<1 and launch.is_visible()
  for btn in p.locator('.family-nav button').all():
   btn.scroll_into_view_if_needed();assert btn.evaluate('(e)=>{const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}')
  launch.tap();panel=p.locator('dialog.tide-panel');ns['expect'](panel).to_be_visible();p.locator('.tide-tabs button').nth(1).tap();ns['expect'](p.locator('.tide-voice-chat')).to_be_visible();p.keyboard.press('Escape');ns['expect'](launch).to_be_focused()
  p.keyboard.press('Home');assert shell.evaluate('(e)=>e.scrollTop')==0;p.keyboard.press('End');assert shell.evaluate('(e)=>Math.abs(e.scrollTop+e.clientHeight-e.scrollHeight)<2')
  p.locator('.family-hero').scroll_into_view_if_needed();p.screenshot(path=f'output/stable-companion-dock/production-{w}.png');rows.append({'mascot':mascot,'viewport':[w,h],'stableScrollAnchor':True,'separateDockArea':True,'navTargetsClear':True,'voicePanelOpens':True,'keyboardScroll':True});print('PASS production',mascot,w,h,flush=True);c.close()
 b.close()
assert not ns['errors'] and not ns['commands'],(ns['errors'],ns['commands'])
Path('output/stable-companion-dock/production-browser.json').write_text(json.dumps({'checks':rows,'syntheticAPIIntercepted':True,'productionPlayerWrites':False,'physicalIPad':False},indent=2))
