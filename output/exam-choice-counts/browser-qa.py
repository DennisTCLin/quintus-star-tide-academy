exec(open('output/progress-top/layout-qa.py').read().split('with sync_playwright() as p:')[0].replace("OUT=Path('output/progress-top')","OUT=Path('output/exam-choice-counts')").replace("'console_'+suffix","'choices_'+suffix"))
fixtures=json.loads((OUT/'fixtures.json').read_text());results=[]
with sync_playwright() as p:
 for engine in ['chromium','webkit']:
  b=p.chromium.launch(channel='chrome',headless=True) if engine=='chromium' else p.webkit.launch(headless=True)
  for fixture in fixtures:
   suffix=fixture['suffix'];ctx,page=login(b,suffix)
   for w,h in [(320,568),(390,844),(812,375),(820,1180),(1180,820)]:
    page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(180);m=page.evaluate(measure)
    assert m['docH']<=h+1 and m['docW']<=w,(engine,suffix,w,m)
    assert m['reading']['h']>=44 and m['stage']['h']>=50,(engine,suffix,w,m)
    assert len(m['answers'])==len(fixture['options']),(engine,suffix,w,'count differs')
    assert all(a['b']<=h and a['h']>=44 and a['x']>=0 and a['x']+a['w']<=w+1 for a in m['answers']),(engine,suffix,w,m)
    assert m['bank']['scroll']<=m['bank']['client']+1,(engine,suffix,w,m)
    if fixture['grade']==4:
     rendered=page.locator('[data-answer-option] .choice-content').all_text_contents();assert rendered==fixture['options'],(rendered,fixture['options'])
    results.append({'engine':engine,'fixture':suffix,'options':len(m['answers']),'size':[w,h],'allOptionsVisible':True,'sourceCountMatched':True})
    if suffix=='seven' and w in [390,820]:page.screenshot(path=str(OUT/f'{engine}-seven-{w}.png'))
   ctx.close()
  b.close()
 assert not errors,errors;(OUT/'results.json').write_text(json.dumps({'checks':results,'errors':errors,'pass':True},ensure_ascii=False,indent=2));print(json.dumps({'checks':len(results),'pass':True}))
