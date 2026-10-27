from pathlib import Path
import json
ns={};exec(Path('output/floating-companion/browser-qa.py').read_text().split('with sync_playwright() as pw:')[0],ns)
rows=[]
with ns['sync_playwright']() as pw:
 for engine in ['webkit','chromium']:
  b=pw.webkit.launch() if engine=='webkit' else pw.chromium.launch(channel='chrome')
  for w,h in [(390,844),(820,1180),(844,390)]:
   c,p=ns['setup'](b,'bow',w,h);shell=p.locator('.companion-docked');launch=p.locator('.tide-launch')
   p.add_style_tag(content=f'body{{min-height:{h+100}px;}}');p.mouse.move(20,h-10);p.mouse.wheel(0,400);p.wait_for_timeout(120)
   assert p.evaluate('scrollY')==0 and shell.bounding_box()['y']==0
   shell.evaluate('(e)=>e.scrollTo({top:600,behavior:"instant"})');assert shell.evaluate('(e)=>e.scrollTop')==600
   assert abs(launch.bounding_box()['y']-shell.bounding_box()['height']-12)<1
   # Browser chrome/rotation is simulated by viewport resizing, not claimed real iPad.
   for height in [h-100,h]:
    p.set_viewport_size({'width':w,'height':height});p.wait_for_timeout(150);assert p.evaluate('scrollY')==0
    assert abs(launch.bounding_box()['y']-shell.bounding_box()['height']-12)<1
   p.locator('.family-nav button').nth(2).click();assert p.locator('.companion-docked').count()==0
   assert not p.evaluate('document.documentElement.classList.contains("companion-document-docked")')
   p.evaluate('scrollTo({top:100,behavior:"instant"})');assert p.evaluate('scrollY')>0
   p.locator('.family-nav button').first.click();ns['expect'](shell).to_be_visible();assert p.evaluate('scrollY')==0
   rows.append({'engine':engine,'viewport':[w,h],'oversizedBodyDoesNotScroll':True,'shellStillScrolls':True,'resizeAnchorStable':True,'quietPageUnlocksDocument':True});print('PASS viewport',engine,w,h,flush=True);c.close()
  b.close()
assert not ns['errors'] and not ns['commands'],(ns['errors'],ns['commands'])
Path('output/stable-companion-dock/viewport-results.json').write_text(json.dumps(rows,indent=2))
