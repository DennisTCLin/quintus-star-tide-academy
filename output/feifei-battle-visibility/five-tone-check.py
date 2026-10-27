exec(open('output/feifei-battle-visibility/check.py').read().split('x=json.loads')[0])
x=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import * as g from './build/game.mjs';const f=g.newFamily();g.startRun(f,'qingqing','tones',crypto.randomUUID(),42,false,g.taipeiDay(),'relaxed');const r=f.profiles.qingqing.run;r.questions[0]='cxg1-g1ck2-dc9d4a1be017';g.readyQuestion(f,'qingqing',r.id,0);console.log(JSON.stringify({family:f,question:g.questionById(r.questions[0])}));"],text=True))
fixture['family']=x['family'];fixture['questions']={'qingqing':x['question']}
with sync_playwright() as pw:
 b=pw.webkit.launch();c,p=setup(b,username='jasper',player='qingqing',width=320,reduced=True);p.set_viewport_size({'width':320,'height':568});p.get_by_role('button',name='繼續挑戰',exact=True).click();p.wait_for_timeout(500)
 assert p.locator('.answer-grid button').count()==5
 for e in p.locator('.answer-grid button').all():
  r=e.bounding_box();assert r['height']>=44 and r['y']+r['height']<=568
 assert p.locator('.quiz-question-reading').bounding_box()['height']>=64
 print('PASS: five-option grade-1 tone question remains readable at 320x568')
 c.close();b.close()
