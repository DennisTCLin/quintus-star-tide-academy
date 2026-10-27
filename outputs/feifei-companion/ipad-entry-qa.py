# Public site assets with synthetic API responses; never mutates a child's account.
exec(open('outputs/feifei-companion/browser-qa.py').read().split('with sync_playwright() as pw:')[0])
CHROME_IPAD='Mozilla/5.0 (iPad; CPU OS 15_8 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/138.0.7204.119 Mobile/15E148 Safari/604.1'
def ipad(b,width,height,username='feifei',player='feifei',reduced=False,broken=False):
 c=b.new_context(viewport={'width':width,'height':height},has_touch=True,user_agent=CHROME_IPAD,reduced_motion='reduce' if reduced else 'no-preference')
 p=c.new_page();p.set_default_timeout(20000);p.on('pageerror',lambda e:errors.append(str(e)))
 def api(r):
  u=r.request.url;data=fixture['guide'] if '/api/guide' in u else {'revision':0,'history':[],'available':False} if '/api/companion-talk' in u else {'invitations':[],'rooms':[],'players':[]} if '/api/battle' in u else dict(fixture,username=username,playerId=player)
  r.fulfill(json=data)
 p.route('**/api/**',api)
 if broken:p.route('**/assets/feifei-bow/launcher-v2/idle.webp',lambda r:r.abort())
 p.goto(BASE,wait_until='networkidle');p.locator('.tide-harbor-entry').wait_for();return c,p
with sync_playwright() as pw:
 for engine in ['webkit','chromium']:
  b=getattr(pw,engine).launch(headless=True)
  for width,height in [(393,740),(700,1024),(701,1024),(768,940),(810,1080),(834,1194),(1024,700),(1194,834),(1366,1024),(1440,900)]:
   c,p=ipad(b,width,height);launch=p.locator('.tide-launch');expect(launch).to_be_visible();img=launch.locator('img');wait(p,"document.querySelector('.tide-launch-cutout')?.complete && document.querySelector('.tide-launch-cutout')?.naturalWidth>0")
   box=launch.bounding_box();assert box['x']>=0 and box['y']>=0 and box['x']+box['width']<=width and box['y']+box['height']<=height,(width,box)
   assert img.bounding_box()['width']>=116;assert p.evaluate('scrollY')==0;assert p.evaluate('document.documentElement.scrollWidth<=innerWidth')
   assert img.evaluate('(im)=>{let c=document.createElement("canvas");c.width=im.naturalWidth;c.height=im.naturalHeight;let x=c.getContext("2d");x.drawImage(im,0,0);return x.getImageData(0,0,1,1).data[3]}')==0
   if width in [768,1024]:
    p.screenshot(path=str(OUT/f'{engine}-launcher-{width}.png'));launch.click();expect(p.get_by_role('dialog',name='蝴蝶結寶寶 AI 學伴')).to_be_visible()
    for motion,label in [('highfive','擊掌'),('bubbles','吹泡泡'),('rest','一起休息')]:
     p.get_by_role('button',name='一起休息',exact=True).click();p.get_by_role('button',name=label,exact=True).click()
     if motion=='highfive':p.get_by_role('button',name='和蝴蝶結寶寶擊掌',exact=True).click()
     if motion=='bubbles':p.get_by_role('button',name='點第 1 個泡泡',exact=True).click()
     p.locator('.tide-stage').scroll_into_view_if_needed();moving(p,motion,True);p.screenshot(path=str(OUT/f'{engine}-{motion}-{width}.png'));check(f'{engine} iPad Chrome {width} animated {motion}')
    p.get_by_role('button',name='收起蝴蝶結寶寶',exact=True).click();expect(launch).to_be_visible();expect(launch).to_be_focused()
    p.evaluate('scrollTo(0,1800)');p.wait_for_timeout(100);assert launch.bounding_box()['y']+launch.bounding_box()['height']<=height
   check(f'{engine} visible transparent launcher {width}');c.close()
  for username,player,asset in [('olivia','doudou','/olivia-dog'),('jimmy','feifei','/tideglow')]:
   c,p=ipad(b,834,1194,username,player,reduced=True);expect(p.locator('.tide-launch')).to_be_visible();assert asset in p.locator('.tide-launch img').get_attribute('src');check(engine+' tablet identity '+username);c.close()
  for reduced,broken in [(True,False),(False,True)]:
   c,p=ipad(b,768,940,reduced=reduced,broken=broken);img=p.locator('.tide-launch-cutout');expect(img).to_have_attribute('src','/assets/feifei-bow/launcher-v2/poster.png');wait(p,"document.querySelector('.tide-launch-cutout')?.naturalWidth>0");check(engine+' static fallback '+str((reduced,broken)));c.close()
  b.close()
assert not errors,errors
(OUT/'results.json').write_text(json.dumps({'pass':True,'checks':checks,'errors':errors,'url':BASE,'physicalIPad':False,'iPadChromeUserAgent':CHROME_IPAD,'realAccountMutations':False},ensure_ascii=False,indent=2)+'\n');print(len(checks),'PASS')
