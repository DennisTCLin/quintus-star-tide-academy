from pathlib import Path
import json
ns={};exec(Path('output/floating-companion/browser-qa.py').read_text().split('with sync_playwright() as pw:')[0],ns)
rows=[]
with ns['sync_playwright']() as pw:
 for engine in ['webkit','chromium']:
  b=pw.webkit.launch() if engine=='webkit' else pw.chromium.launch(channel='chrome')
  for w,h in [(320,568),(390,844),(820,1180),(1440,900),(844,390)]:
   c,p=ns['setup'](b,'bow',w,h);shell=p.locator('.companion-docked');launch=p.locator('.tide-launch');panel=p.locator('dialog.tide-panel')
   launch.click();p.keyboard.press('Escape');ns['expect'](launch).to_be_focused()
   p.keyboard.press('Home');assert shell.evaluate('(e)=>e.scrollTop')==0
   p.keyboard.press('PageDown');first=shell.evaluate('(e)=>e.scrollTop');assert first>0
   p.keyboard.press('ArrowDown');assert shell.evaluate('(e)=>e.scrollTop')>first
   p.keyboard.press('PageUp');assert shell.evaluate('(e)=>e.scrollTop')<first
   p.keyboard.press('End');assert shell.evaluate('(e)=>Math.abs(e.scrollTop+e.clientHeight-e.scrollHeight)<2')
   p.keyboard.press('Home');assert shell.evaluate('(e)=>e.scrollTop')==0
   p.keyboard.press('Space');ns['expect'](panel).to_be_visible();p.keyboard.press('Escape');ns['expect'](launch).to_be_focused()
   p.keyboard.press('Enter');ns['expect'](panel).to_be_visible();p.keyboard.press('Escape')
   p.add_style_tag(content='.tide-launch > span,.tide-launch ruby{font-size:32px!important;}');p.wait_for_timeout(100)
   assert shell.bounding_box()['height']+8<=launch.bounding_box()['y']
   assert launch.evaluate('(e)=>{let r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight}')
   p.emulate_media(reduced_motion='reduce');p.keyboard.press('End');launch.click();ns['expect'](panel).to_be_visible();panel.get_by_role('button',name='暫時隱藏',exact=True).click();ns['expect'](panel).to_be_hidden();ns['expect'](p.locator('.tide-launch-cutout')).to_be_hidden()
   launch.click();ns['expect'](panel).to_be_visible();p.keyboard.press('Escape');ns['expect'](p.locator('.tide-launch-cutout')).to_be_visible()
   rows.append({'engine':engine,'viewport':[w,h],'pageKeysAfterClose':True,'enterSpaceOpen':True,'enlargedGrade2Label':True,'hiddenReopen':True});print('PASS keyboard',engine,w,h,flush=True);c.close()
  b.close()
assert not ns['errors'] and not ns['commands'],(ns['errors'],ns['commands'])
Path('output/stable-companion-dock/keyboard-results.json').write_text(json.dumps(rows,indent=2))
