import importlib.util,json
from pathlib import Path
spec=importlib.util.spec_from_file_location('qa',Path(__file__).with_name('browser-qa.py'));t=importlib.util.module_from_spec(spec);spec.loader.exec_module(t);q=t.q
with t.sync_playwright() as pw:
 b=pw.webkit.launch()
 for mascot in ['dog','tideglow']:
  c,p=t.setup(b,mascot,'normal');p.get_by_role('button',name='餵點心',exact=True).tap();q.moving(p,'feed');p.locator('.tide-panel video').evaluate('(v)=>v.pause()');t.frames_move(p,'feed');t.expect(p.locator('.tide-care-actions button').first).to_be_enabled(timeout=18000);q.check(mascot+' silent video freeze switches to full animated feed before unlocking');c.close()
  c,p=t.setup(b,mascot);pattern='**/companion-frames-v1/'+mascot+'/feed-*.jpg';p.route(pattern,lambda route:route.abort());p.get_by_role('button',name='餵點心',exact=True).tap();t.expect(p.locator('.tide-care-actions button').first).to_be_enabled(timeout=11000);q.check(mascot+' broken atlas cannot lock action');p.unroute(pattern);t.action(p,'feed','餵點心');q.check(mascot+' next action retries animation after atlas failure');c.close()
  c,p=t.setup(b,mascot);p.get_by_role('button',name='星光球',exact=True).tap()
  for n in range(1,4):
   p.get_by_role('button',name=f'接第 {n} 顆星光球',exact=True).tap();t.frames_move(p,'play');t.expect(p.locator('.tide-care-actions button').first).to_be_enabled(timeout=15000)
  t.expect(p.locator('.tide-ball-progress')).to_have_attribute('aria-label','完成 3 / 3');q.check(mascot+' all three play targets animate and finish once')
  for w,h in [(390,844),(1194,834)]:
   p.set_viewport_size({'width':w,'height':h});p.get_by_role('button',name='摸摸'+('派對狗狗' if mascot=='dog' else '潮光獸'),exact=True).tap();t.frames_move(p,'pet');t.expect(p.locator('.tide-care-actions button').first).to_be_enabled(timeout=15000);q.check(mascot+' direct touch and layout '+str(w),p.evaluate('document.documentElement.scrollWidth<=innerWidth'))
  c.close()
 b.close()
q.check('No fault-suite JavaScript errors',not q.errors)
(t.out/'fault-results.json').write_text(json.dumps({'pass':True,'checks':q.checks,'physicalDevice':False},ensure_ascii=False,indent=2)+'\n')
