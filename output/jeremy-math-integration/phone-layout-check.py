exec(open('output/jeremy-math-integration/browser-check.py').read().split('with sync_playwright() as pw:')[0])
with sync_playwright() as pw:
 for engine in ['chromium','webkit']:
  b=getattr(pw,engine).launch(headless=True);c=login(b,1,320,740);page=c.new_page();open_math(page);page.locator('.isl-current-island').get_by_role('button',name='繼續玩',exact=False).click();page.locator('.isl-keypad').wait_for()
  for width,height in [(320,740),(393,852),(680,900)]:
   page.set_viewport_size({'width':width,'height':height});layout(page,'final phone header')
   assert page.locator('.isl-journey').evaluate('(e)=>getComputedStyle(e).position')=='static'
   bad=page.locator('.isl-journey-steps li').evaluate_all('(lis)=>lis.flatMap(li=>{let p=li.getBoundingClientRect();return [...li.querySelectorAll("ruby")].filter(e=>{let r=e.getBoundingClientRect();return r.left<p.left-1||r.right>p.right+1}).map(e=>e.textContent)})');assert not bad,(width,bad)
   record(engine+' '+str(width)+'px readable stage labels and non-covering progress')
  page.set_viewport_size({'width':320,'height':740});page.locator('.isl-keypad').scroll_into_view_if_needed();page.screenshot(path=str(OUT/(engine+'-phone-keypad-viewport.png')));page.screenshot(path=str(OUT/(engine+'-keypad-320.png')),full_page=True);c.close();b.close()
 OUT.joinpath('phone-layout-results.json').write_text(json.dumps({'pass':True,'checks':checks},ensure_ascii=False,indent=2)+'\n')
