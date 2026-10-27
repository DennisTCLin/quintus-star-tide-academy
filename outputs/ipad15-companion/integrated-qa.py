import importlib.util,json
from pathlib import Path
spec=importlib.util.spec_from_file_location('qa',Path(__file__).with_name('browser-qa.py'));q=importlib.util.module_from_spec(spec);spec.loader.exec_module(q)
with q.sync_playwright() as pw:
 for engine in ['webkit','chromium']:
  b=pw.webkit.launch() if engine=='webkit' else pw.chromium.launch(channel='chrome',headless=True)
  c,p=q.setup(b,username='other-child')
  for motion,label,target in [('highfive','擊掌','和潮光獸擊掌'),('bubbles','吹泡泡','點第 1 個泡泡')]:
   p.get_by_role('button',name='一起休息',exact=True).click();p.locator('.tide-care-actions').get_by_role('button',name=label,exact=True).click();p.get_by_role('button',name=target,exact=True).click();q.moving(p,motion)
   assert '/tideglow-guide/actions-v2/' in p.locator('.tide-panel video').get_attribute('src');q.expect(p.locator('.tide-care-actions button').first).to_be_enabled(timeout=15000);q.check(engine+': new tideglow '+motion+' frames and completion preserved')
  p.get_by_role('button',name='一起休息',exact=True).click();q.moving(p,'rest');p.wait_for_timeout(9000);q.moving(p,'rest');q.check(engine+': new tideglow rest keeps playing beyond watchdog')
  p.locator('.tide-footer button').first.click();q.usable_image(p);q.expect(q.poster(p)).to_have_attribute('src','/assets/tideglow-guide/actions-v2/rest.jpg');q.check(engine+': new tideglow sleep poster preserved');c.close()
  c,p=q.setup(b,'pending');p.get_by_role('button',name='餵點心',exact=True).click();q.usable_image(p);q.expect(p.locator('.tide-care-actions button').first).to_be_enabled(timeout=11000);q.check(engine+': dog pending fallback retained on integrated build');c.close();b.close()
q.check('No integrated JavaScript errors',not q.errors)
(q.out/'integrated-results.json').write_text(json.dumps({'pass':True,'checks':q.checks,'base':'6fbd059','physicalDevice':False},ensure_ascii=False,indent=2)+'\n')
