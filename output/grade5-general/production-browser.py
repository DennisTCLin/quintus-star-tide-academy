# Real production assets, mocked API identity. Never signs into or modifies a real child.
import os
os.environ['FEIFEI_QA_URL']='https://quintus-star-tide-academy-production.up.railway.app'
os.environ['FEIFEI_QA_OUTPUT']='output/grade5-general/production-browser'
exec(open('outputs/feifei-companion/browser-qa.py').read().split('with sync_playwright() as pw:')[0])
with sync_playwright() as pw:
 b=pw.webkit.launch(headless=True)
 for width,height in [(393,852),(834,1194)]:
  c,p=setup(b,username='jay',player='jay',width=width,reduced=True);p.set_viewport_size({'width':width,'height':height});p.wait_for_load_state('networkidle')
  assert '5 年級' in p.locator('body').inner_text();assert '五年級五科通用暖身已開放' in p.locator('body').inner_text();expect(p.locator('.subject-island-card')).to_have_count(5)
  for subject in ['數學','國語','英文','自然','社會']:expect(p.get_by_role('button',name='從群島開始'+subject,exact=True)).to_have_count(1)
  scene=p.locator('.archipelago-scene');scene.scroll_into_view_if_needed();expect(scene.locator('.archipelago-stop')).to_have_count(5);assert not p.evaluate('document.documentElement.scrollWidth>innerWidth');p.screenshot(path=str(OUT/f'five-islands-{width}.png'));check('Jay five subjects on public assets '+str(width));c.close()
 b.close()
assert not errors,errors
(OUT/'results.json').write_text(json.dumps({'pass':True,'checks':checks,'errors':errors,'realAccountMutations':False,'physicalDevice':False,'url':BASE},ensure_ascii=False,indent=2)+'\n')
