from pathlib import Path
ns={};exec(Path('output/floating-companion/browser-qa.py').read_text().split('with sync_playwright() as pw:')[0],ns)
rows=[]
with ns['sync_playwright']() as pw:
 b=pw.webkit.launch()
 for device,w,h in [('phone',390,844),('ipad',820,1180)]:
  for mascot,index,action in [('dog',0,'pet'),('bow',1,'feed'),('tideglow',2,'play')]:
   c,p=ns['setup'](b,mascot,w,h)
   p.evaluate('scrollTo({top:document.documentElement.scrollHeight,behavior:"instant"})');p.wait_for_timeout(250)
   p.locator('.tide-launch').tap();panel=p.locator('dialog.tide-panel');ns['expect'](panel).to_be_visible()
   actor=panel.locator('.tide-actor').bounding_box();assert actor['height']>=100 and abs(actor['width']-actor['height'])<2,actor
   panel.locator('.tide-care-actions button').nth(index).tap()
   ns['expect'](panel.locator('.tide-stage')).to_have_attribute('data-care-action',action)
   ns['expect'](panel.locator('.tide-actor')).to_have_attribute('data-motion',action)
   # Pixel presentation uses the existing original action footage.
   poster=panel.locator('.tide-actor-poster');ns['expect'](poster).to_have_attribute('data-frame-ready','true',timeout=15000)
   if action=='play':panel.get_by_role('button',name='接第 1 顆星光球').tap()
   panel.locator('.tide-tabs button').nth(1).tap();ns['expect'](panel.locator('.tide-voice-chat')).to_be_visible();panel.locator('.tide-tabs button').first.tap()
   panel.locator('.tide-learn').tap();ns['expect'](p.get_by_role('dialog',name='選擇學習科目')).to_be_visible()
   ns['expect'](p.locator('.tide-launch')).to_be_hidden();ns['expect'](p.locator('.tide-launch')).to_have_attribute('tabindex','-1')
   p.get_by_role('dialog',name='選擇學習科目').get_by_role('button',name='關閉',exact=True).tap()
   p.evaluate('scrollTo({top:document.documentElement.scrollHeight,behavior:"instant"})');p.wait_for_timeout(250)
   ns['expect'](p.locator('.tide-launch')).to_be_visible()
   rows.append({'device':device,'mascot':mascot,'action':action,'tapOpens':True,'actionFootageDecoded':True,'coursePickerSuppresses':True,'restoredAfterClose':True});print('PASS touch',device,mascot,action,flush=True);c.close()
 b.close()
assert not ns['commands'] and not ns['errors'],(ns['commands'],ns['errors'])
Path('output/stable-companion-dock/touch-results.json').write_text(ns['json'].dumps(rows,indent=2)+'\n')
