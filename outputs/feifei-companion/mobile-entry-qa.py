exec(open('outputs/feifei-companion/browser-qa.py').read().split('with sync_playwright() as pw:')[0])
with sync_playwright() as pw:
 for engine in ['webkit','chromium']:
  b=pw.webkit.launch() if engine=='webkit' else pw.chromium.launch(channel='chrome',headless=True)
  for width,height in [(393,700),(375,600),(430,760)]:
   c,p=setup(b,width=width);p.set_viewport_size({'width':width,'height':height});p.wait_for_timeout(700)
   launch=p.locator('.tide-launch');expect(launch).to_be_visible();box=launch.bounding_box();assert box['y']>=0 and box['y']+box['height']<=height;assert p.evaluate('scrollY')==0
   assert '/feifei-bow/' in launch.locator('img').get_attribute('src');p.screenshot(path=str(OUT/f'{engine}-entry-{width}.png'))
   launch.click();expect(p.get_by_role('dialog',name='蝴蝶結寶寶 AI 學伴')).to_be_visible();p.get_by_role('button',name='一起休息',exact=True).click();moving(p,'rest',False)
   p.get_by_role('button',name='收起蝴蝶結寶寶',exact=True).click();expect(launch).to_be_visible();expect(launch).to_be_focused();p.evaluate('scrollTo(0,1800)');p.wait_for_timeout(300);box=launch.bounding_box();assert box['y']+box['height']<=height
   check(engine+' first viewport, open rest, close focus and scroll '+str(width));c.close()
  c,p=setup(b,width=834);expect(p.locator('.tide-launch')).to_be_visible();p.locator('.tide-harbor-entry').click();expect(p.get_by_role('dialog',name='蝴蝶結寶寶 AI 學伴')).to_be_visible();check(engine+' tablet launcher and inline entry preserved');c.close()
  for username,player,part in [('olivia','doudou','/olivia-dog'),('jimmy','feifei','/tideglow')]:
   c,p=setup(b,username,player,width=393,reduced=True);expect(p.locator('.tide-launch')).to_be_visible();assert part in p.locator('.tide-launch img').get_attribute('src');check(engine+' mobile identity '+username);c.close()
  b.close()
assert not errors,errors
(OUT/'mobile-entry-results.json').write_text(json.dumps({'pass':True,'checks':checks,'url':BASE,'physicalPhone':False},ensure_ascii=False,indent=2));print(len(checks),'PASS')
