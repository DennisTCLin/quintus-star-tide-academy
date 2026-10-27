import json,uuid,time
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
fixture=json.loads(Path('/tmp/star-tide-jasper-private/browser.json').read_text());base='http://127.0.0.1:4385';results=[]
with sync_playwright() as p:
 for engine in ['webkit','chromium']:
  b=getattr(p,engine).launch();c=b.new_context(viewport={'width':375,'height':667});page=c.new_page();page.set_default_timeout(20000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(base);page.get_by_placeholder('英文字母、數字或底線').fill(fixture['username']);page.get_by_placeholder('請輸入密碼').fill(fixture['password']);page.get_by_role('button',name='登入，繼續冒險 →').click();page.locator('.harbor-departure-start').wait_for()
  for course,label in [('math','數學'),('medials','拼音')]:
   def state():return c.request.get(base+'/api/state').json()
   def command(cmd):
    st=state();r=c.request.post(base+'/api/command',headers={'Origin':base,'X-CSRF-Token':st['csrf']},data={'id':str(uuid.uuid4()),'revision':st['family']['revision'],'command':{'player':'qingqing',**cmd}});assert r.status==200,r.text();return r.json()
   st=state();assert st['family']['profiles']['qingqing']['learning']['school']=='xingan';old=st['family']['profiles']['qingqing'].get('run')
   if old and old['status']=='active':command({'type':'quit','runId':old['id']});page.reload();page.locator('.harbor-departure-start').wait_for()
   page.locator('.harbor-departure-start').click()
   page.get_by_role('button',name='開始'+label,exact=True).click();page.get_by_label('慢慢想').click();expect(page.get_by_label('慢慢想')).to_be_checked();page.locator('.ready-start').click();page.locator('[data-answer-option]').first.wait_for()
   st=state();q=st['questions']['qingqing'];run=st['family']['profiles']['qingqing']['run'];assert q['grade']==1 and q['course']==course;assert 'answer' not in q and 'explanation' not in q
   supplied=True;assert q['publisher']==('翰林' if course=='math' else '康軒') and q.get('examSources')
   for width,height in [(320,568),(375,667),(820,1180)]:
    page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(150)
    assert not page.evaluate('document.documentElement.scrollWidth>innerWidth+1'),(engine,course,width)
    assert page.locator('[data-answer-option]').count()==len(q['options'])
    reading=page.locator('#quiz-reading');assert ''.join(q['prompt'].split()) in ''.join(reading.inner_text().split());
    if supplied and width==375:
     reading.evaluate('(e)=>e.scrollTop=0');page.screenshot(path=f'output/jasper-curriculum/{engine}-{course}-375-top.png')
    scroll=reading.evaluate('(e)=>{e.scrollTop=e.scrollHeight;return {scroll:e.scrollTop,overflow:e.scrollHeight>e.clientHeight+1}}');assert not scroll['overflow'] or scroll['scroll']>0
    results.append({'engine':engine,'course':course,'width':width,'question':q['id'],'supplied':supplied,'readingComplete':True,'scrollableWhenNeeded':True,'noHorizontalOverflow':True})
    if width==375 or (supplied and width==820):page.screenshot(path=f'output/jasper-curriculum/{engine}-{course}-{width}.png')
   page.locator('[data-answer-option]').nth(fixture['answers'][q['id']]).click()
   for _ in range(80):
    saved=state()
    if saved['family']['profiles']['qingqing']['run']['answers']:break
    page.wait_for_timeout(150)
   assert saved['family']['profiles']['qingqing']['run']['answers'][0] is True
   before=saved['family']['profiles']['qingqing']['learning'];page.reload();page.locator('.harbor-departure-start').wait_for();assert state()['family']['profiles']['qingqing']['learning']==before
   command({'type':'quit','runId':run['id']});assert not errors,errors
   results.append({'engine':engine,'course':course,'uiAnswerSaved':True,'reloadPreservesLearning':True,'pageErrors':errors})
   page.reload();page.locator('.harbor-departure-start').wait_for()
  c.close();b.close()
Path('output/jasper-curriculum/browser-results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'checks':len(results),'syntheticOnly':True}))
