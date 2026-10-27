"""Production frontend, synthetic in-memory API: no live player writes."""
import os,re
os.environ['FEIFEI_QA_URL']='https://quintus-star-tide-academy-production.up.railway.app'
os.environ['FEIFEI_QA_OUTPUT']='outputs/monster-wave4/production-ui'
exec(open('outputs/feifei-companion/browser-qa.py').read().split('with sync_playwright() as pw:')[0])
with sync_playwright() as pw:
 for engine in ['webkit','chromium']:
  b=getattr(pw,engine).launch();c,p=setup(b,player='feifei',username='feifei',width=1024)
  p.get_by_role('navigation',name='主要導覽').get_by_role('button',name=re.compile('夥伴')).click()
  p.get_by_role('button',name=re.compile('怪物圖鑑')).click();expect(p.locator('.bestiary-count strong')).to_have_text('110')
  for name in ['星鑄裁決者','斷空刃鷲','冰冠九首龍','深燈噬海王']:
   # Resolve final name from the actual 30th catalog entry, not a guessed label.
   if name=='深燈噬海王':name=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import{MONSTER_CATALOG}from './build/game.mjs';console.log(JSON.stringify(MONSTER_CATALOG[109].name))"],text=True))
   p.locator('input[name=monster-search]').fill(name);p.get_by_role('button',name=re.compile('查看'+name+'，')).click()
   p.locator('.monster-dialog [data-motion-ready=true]').wait_for(timeout=30000)
   canvas=p.locator('.monster-dialog canvas');before=canvas.evaluate('c=>c.toDataURL()');p.wait_for_timeout(500);assert before!=canvas.evaluate('c=>c.toDataURL()')
   assert p.locator('.monster-dialog video').evaluate('v=>v.muted&&v.playsInline&&v.videoWidth===960')
   for width,height in [(1024,768),(393,740)]:
    p.set_viewport_size({'width':width,'height':height});p.wait_for_timeout(150);assert p.evaluate('document.documentElement.scrollWidth<=innerWidth')
   p.set_viewport_size({'width':1024,'height':768});p.get_by_role('button',name='關閉怪物詳情',exact=True).click();check(engine+' live bundle animated '+name)
  p.locator('input[name=monster-search]').fill('熔星');expect(p.locator('.bestiary-empty')).to_be_visible()
  assert not errors,errors;c.close();b.close()
(OUT/'results.json').write_text(json.dumps({'checks':checks,'errors':errors,'liveFrontend':True,'mockApi':True,'playerWrites':False,'physicalIPad':False},ensure_ascii=False,indent=2)+'\n')
