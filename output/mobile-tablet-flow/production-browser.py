from pathlib import Path
import os,json
os.environ['QA_URL']='https://quintus-star-tide-academy-production.up.railway.app/'
ns={};exec(Path('output/floating-companion/browser-qa.py').read_text().split('with sync_playwright() as pw:')[0],ns)
rows=[]
with ns['sync_playwright']() as p:
 b=p.webkit.launch()
 for mascot,w,h in [('dog',375,667),('bow',820,1180),('tideglow',1180,820)]:
  c,page=ns['setup'](b,mascot,w,h)
  assert page.locator('.harbor-departure-start').evaluate('(e)=>{let r=e.getBoundingClientRect();return r.top>=0&&r.bottom<=innerHeight&&e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}')
  for button in page.locator('.family-nav button').all():
   button.scroll_into_view_if_needed();page.wait_for_timeout(250);assert page.evaluate(ns['clear']);assert button.evaluate('(e)=>{let r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}')
  page.evaluate('scrollTo({top:document.documentElement.scrollHeight,behavior:"instant"})');page.wait_for_timeout(350);assert page.evaluate(ns['clear']);ns['expect'](page.locator('.tide-launch')).to_be_visible();page.locator('.tide-launch').tap();ns['expect'](page.locator('dialog.tide-panel')).to_be_visible();actor=page.locator('.tide-actor').bounding_box();assert abs(actor['width']-actor['height'])<2
  page.locator('.tide-tabs button').nth(1).tap();ns['expect'](page.locator('.tide-voice-chat')).to_be_visible();page.locator('.tide-window-actions button').last.tap();page.screenshot(path=f'output/mobile-tablet-flow/production-{mascot}-{w}.png');rows.append({'mascot':mascot,'viewport':[w,h],'firstScreenDeparture':True,'navClear':True,'launcherClear':True,'dialogActorSquare':True,'voicePanelOpens':True});c.close();print('PASS production UI',mascot,w,h,flush=True)
 b.close()
assert not ns['commands'] and not ns['errors']
Path('output/mobile-tablet-flow/production-browser.json').write_text(json.dumps({'checks':rows,'syntheticAPIIntercepted':True,'productionStateWrites':False,'physicalIPad':False,'pageErrors':ns['errors']},indent=2))
