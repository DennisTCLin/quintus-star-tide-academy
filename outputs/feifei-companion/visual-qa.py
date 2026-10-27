exec(open('outputs/feifei-companion/browser-qa.py').read().split('with sync_playwright() as pw:')[0])
with sync_playwright() as pw:
 for engine in ['webkit','chromium']:
  b=pw.webkit.launch() if engine=='webkit' else pw.chromium.launch(channel='chrome',headless=True)
  for width,height in [(375,700),(393,740),(834,1194),(1440,1000)]:
   c,p=setup(b,width=width);p.set_viewport_size({'width':width,'height':height})
   if width<701:
    launch=p.locator('.tide-launch');expect(launch).to_be_visible();img=launch.locator('img');expect(img).to_have_attribute('src','/assets/feifei-bow/launcher-v2/idle.webp');wait(p,"document.querySelector('.tide-launch-cutout')?.complete");assert img.bounding_box()['width']>=110
    alpha=img.evaluate('(im)=>{let c=document.createElement("canvas");c.width=im.naturalWidth;c.height=im.naturalHeight;let x=c.getContext("2d");x.drawImage(im,0,0);return [...x.getImageData(0,0,1,1).data]}');assert alpha[3]==0,alpha
    p.screenshot(path=str(OUT/f'{engine}-launcher-{width}.png'));launch.click();p.get_by_role('button',name='一起休息',exact=True).click();moving(p,'rest',False);p.get_by_role('button',name='收起蝴蝶結寶寶').click()
   scene=p.locator('.archipelago-scene');scene.scroll_into_view_if_needed();p.wait_for_timeout(1200);expect(scene.locator('img').first).to_be_visible();assert scene.locator('img').first.evaluate('(e)=>getComputedStyle(e).filter')=='none';assert scene.locator('img').first.evaluate('(e)=>getComputedStyle(e).opacity')=='1'
   buttons=scene.locator('.archipelago-stop');expect(buttons).to_have_count(5);box=scene.bounding_box();rects=buttons.evaluate_all('(bs)=>bs.map(b=>{const r=b.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}})')
   for r in rects:assert r['x']>=box['x']-1 and r['x']+r['w']<=box['x']+box['width']+1 and r['y']>=box['y']-1 and r['y']+r['h']<=box['y']+box['height']+1,(width,box,r)
   assert buttons.first.locator('.archipelago-stop-name').evaluate('(e)=>getComputedStyle(e).backgroundImage')=='none'
   wait(p,"document.querySelector('.archipelago-scene').classList.contains('map-moving')");expect(scene.locator('.archipelago-atmosphere')).to_have_count(1)
   p.screenshot(path=str(OUT/f'{engine}-islands-{width}.png'));p.locator('.archipelago-toolbar button').click();expect(scene.locator('.archipelago-atmosphere')).to_have_count(0);p.locator('.archipelago-toolbar button').click();expect(scene.locator('.archipelago-atmosphere')).to_have_count(1)
   assert p.evaluate('document.documentElement.scrollWidth<=innerWidth');check(engine+' cutout and panorama '+str(width));c.close()
  c,p=setup(b,width=393,reduced=True);expect(p.locator('.tide-launch-cutout')).to_have_attribute('src','/assets/feifei-bow/launcher-v2/poster.png');p.locator('.archipelago-scene').scroll_into_view_if_needed();expect(p.locator('.archipelago-atmosphere')).to_have_count(0);check(engine+' reduced motion');c.close();b.close()
assert not errors,errors
(OUT/'visual-results.json').write_text(json.dumps({'pass':True,'checks':checks,'url':BASE,'physicalDevice':False},ensure_ascii=False,indent=2));print(len(checks),'PASS')
