import os,copy
os.environ['FEIFEI_QA_URL']=os.environ.get('QA_URL','http://127.0.0.1:47741')
os.environ['FEIFEI_QA_OUTPUT']='output/feifei-battle-visibility/browser'
exec(open('outputs/feifei-companion/browser-qa.py').read().split('with sync_playwright() as pw:')[0])
x=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import * as g from './build/game.mjs';const f=g.newFamily();g.startRun(f,'feifei','tones',crypto.randomUUID(),42,false,g.taipeiDay(),'relaxed');const r=f.profiles.feifei.run;g.readyQuestion(f,'feifei',r.id,0);console.log(JSON.stringify({family:f,question:g.questionById(r.questions[0])}));"],text=True))
fixture['family']=x['family'];fixture['questions']={'feifei':x['question']}
with sync_playwright() as pw:
 b=pw.webkit.launch();c,p=setup(b,width=1024,reduced=True);p.set_viewport_size({'width':1024,'height':650});p.get_by_role('button',name='繼續挑戰',exact=True).click();p.locator('.quiz-stage').wait_for();p.wait_for_timeout(1500)
 print(p.locator('.answer-grid').get_attribute('class'))
 print(p.evaluate('''()=>Object.fromEntries(['.quiz-stage','.quiz-hud','.quiz-answer-bank','.quiz-question-reading','.quiz-turn-actions','.duel-combatant'].map(s=>{let r=document.querySelector(s).getBoundingClientRect();return [s,{y:r.y,height:r.height,bottom:r.bottom}]}))'''))
 if os.environ.get('QA_PHASE','before')!='before':
  actor=p.locator('.duel-combatant').first.bounding_box();hud=p.locator('.quiz-hud').bounding_box()
  assert actor['height']>=100 and actor['y']>=hud['y']+hud['height']-1
  assert p.locator('.quiz-question-reading').bounding_box()['height']>=64
  for button in p.locator('.answer-grid button').all():
   r=button.bounding_box();assert r['height']>=44 and r['y']+r['height']<=650
 p.screenshot(path=str(OUT/(os.environ.get('QA_PHASE','before')+'.png')));c.close();b.close()
