from playwright.sync_api import sync_playwright,expect
from pathlib import Path
import json
OUT=Path('outputs/voice-battle-release');fix=json.loads((OUT/'fixture.json').read_text());report={'engine':'WebKit iPad touch emulation','localSyntheticAccountOnly':True,'checks':[]}
def check(name,ok=True,detail=None):
 assert ok,name
 report['checks'].append({'name':name,'pass':True,'detail':detail});(OUT/'battle-browser-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print('PASS',name,flush=True)
with sync_playwright() as pw:
 b=pw.webkit.launch();c=b.new_context(**pw.devices['iPad (gen 7)']);p=c.new_page();errors=[];p.on('pageerror',lambda e:errors.append({'name':e.name,'message':e.message}))
 try:
  p.goto('http://localhost:4293/qa-login');p.get_by_role('button',name='選擇荳荳，1年級',exact=True).click();p.get_by_role('button',name='開始英文入門',exact=True).click();expect(p.get_by_role('dialog')).to_be_visible();p.get_by_role('button',name='繼續原來的挑戰',exact=True).click();review=p.get_by_role('region',name='戰後錯題補練');expect(review).to_be_visible();check('Return from another island opens pending review')
  before=p.request.get('http://localhost:4293/api/state').json()['family']['profiles']['doudou'];run=before['run'];assert run['id']==fix['runId'];assert run['status']=='failed';assert run['remediation']['receipt'] is None
  for index in range(3):
   options=review.locator('[data-answer-option]');expect(options.first).to_be_enabled();count=options.count();answer=fix['answers'][index]['answer']
   if index==0:
    options.nth((answer+1)%count).click();expect(review.locator('[role=status]')).to_be_visible();state=p.request.get('http://localhost:4293/api/state').json()['family']['profiles']['doudou'];check('Wrong correction awards nothing',state['coins']==before['coins'] and not state['run']['remediation']['corrected'])
   expect(options.nth(answer)).to_be_enabled();options.nth(answer).click()
   if index<2:
    expect(review).to_contain_text(f'已訂正 {index+1} 道');state=p.request.get('http://localhost:4293/api/state').json()['family']['profiles']['doudou'];check(f'Partial correction {index+1} awards nothing',state['coins']==before['coins'] and state['run']['remediation']['receipt'] is None)
  expect(review).to_contain_text('全部訂正完成！');state=p.request.get('http://localhost:4293/api/state').json()['family']['profiles']['doudou'];r=state['run'];check('All corrections settle half reward once',state['coins']==before['coins']+30 and state['growth']['xp'][r['companion']]==30 and r['remediation']['receipt']=={'coins':30,'xp':30,'skipped':False},r['remediation']['receipt'])
  check('Original failure history and other rewards preserved',r['status']=='failed' and r['answers']==run['answers'] and state['tickets']==before['tickets'] and state.get('territory')==before.get('territory'))
  check('No repeat claim button remains',review.locator('[data-answer-option]').count()==0);p.screenshot(path=str(OUT/'tablet-review-settled.png'))
  p.reload();p.get_by_role('button',name='選擇荳荳，1年級',exact=True).click();p.get_by_role('button',name='🎁 查看上次挑戰',exact=True).click();expect(review).to_contain_text('全部訂正完成！');state2=p.request.get('http://localhost:4293/api/state').json()['family']['profiles']['doudou'];check('Reload retains receipt without repeating reward',state2['coins']==state['coins'] and state2['growth']['xp']==state['growth']['xp'] and state2['run']['remediation']['receipt']==r['remediation']['receipt'])
  check('Battle review has no horizontal overflow',p.evaluate('document.documentElement.scrollWidth<=innerWidth'));check('No JavaScript runtime exception; reload recovers',all(e['name']=='Fetch API cannot load http' and e['message']=='/localhost:4293/api/state due to access control checks.' for e in errors),errors);report['status']='PASS';(OUT/'battle-browser-verification.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
 except Exception:
  p.screenshot(path=str(OUT/'battle-failure.png'));(OUT/'battle-failure.txt').write_text(p.locator('body').inner_text());raise
 finally:c.close();b.close()
