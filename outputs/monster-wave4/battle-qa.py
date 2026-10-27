"""Synthetic grade-2/grade-6 saves only; real UI, both browser engines."""
import os,copy
os.environ['FEIFEI_QA_URL']=os.environ.get('QA_URL','http://127.0.0.1:47741')
os.environ['FEIFEI_QA_OUTPUT']='outputs/monster-wave4/battle-browser'
exec(open('outputs/feifei-companion/browser-qa.py').read().split('with sync_playwright() as pw:')[0])
original=copy.deepcopy(fixture)
fixtures=json.loads(subprocess.check_output(['node','--input-type=module','-e',"""
import * as g from './build/game.mjs';
const out={};for(const player of ['feifei','alston'])for(const settled of [false,true]){
 const f=g.newFamily();f.profiles[player].learning.school=player==='alston'?'jianan':'yongchun';
 f.profiles[player].growth.xp.tideglow=350;g.startRun(f,player,player==='feifei'?'tones':'science',crypto.randomUUID(),42,false,g.taipeiDay(),'relaxed');
 if(player==='alston')f.profiles[player].run.questions[0]='g6sc-c2d40bb3fc7b554cc1';
 const r=f.profiles[player].run;const monster=g.MONSTER_CATALOG.find(m=>m.id==='wave4-metal-01');delete r.encounter.route;r.encounter.variant=monster.id;r.encounter.monster=monster.family;g.readyQuestion(f,player,r.id,r.index);const q=g.questionById(r.questions[r.index]);
 if(settled)g.answerRun(f,player,r.id,r.index,(q.answer+1)%q.options.length,g.taipeiDay());
 out[player+settled]={family:f,question:q};
}console.log(JSON.stringify(out));"""],text=True))
with sync_playwright() as pw:
 for engine in ['webkit','chromium']:
  b=getattr(pw,engine).launch(headless=True)
  for player in ['feifei','alston']:
   for settled in [False,True]:
    x=fixtures[player+str(settled).lower()];fixture=copy.deepcopy(original);fixture['family']=x['family'];fixture['questions']={player:x['question']}
    c,p=setup(b,username=player,player=player,width=1024,reduced=True);p.get_by_role('button',name='繼續挑戰',exact=True).click();p.locator('.quiz-stage').wait_for()
    for width,height in [(1024,650),(1024,748),(1180,720),(834,1194),(768,940),(393,740),(320,568),(812,375)]:
     p.set_viewport_size({'width':width,'height':height});p.wait_for_timeout(350)
     assert p.evaluate('document.documentElement.scrollWidth<=innerWidth'),(engine,width,'overflow')
     rects=p.evaluate('''()=>{const box=s=>{let r=document.querySelector(s).getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height}};return {actor:box('.duel-combatant'),hud:box('.quiz-hud'),reading:box('.quiz-question-reading'),stage:box('.quiz-stage')}}''')
     assert rects['actor']['top']>=rects['hud']['bottom']-1,(engine,width,height,player,settled,rects)
     assert rects['reading']['height']>=63,(engine,width,height,rects)
     for button in p.locator('.answer-grid button').all():
      box=button.bounding_box();assert box['height']>=44 and box['y']+box['height']<=height,(engine,width,height,box)
     if settled:
      button=p.get_by_role('button',name='看懂了，下一題',exact=True);box=button.bounding_box();assert box and box['height']>=44 and box['y']+box['height']<=height
      assert button.evaluate('(e)=>{const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}')
     if player=='feifei' and width==1024 and height==650:
      assert rects['actor']['height']>=100,rects
      p.screenshot(path=str(OUT/f'{engine}-{player}-{settled}.png'))
     check(f'{engine} {player} settled={settled} {width}x{height}: actors clear, answers visible, reading and next preserved')
    if settled:
     p.set_viewport_size({'width':1024,'height':650})
     p.route('**/api/online-battle*',lambda r:r.fulfill(json={'serverNow':int(time.time()*1000),'available':True,'room':{'id':'visibility-qa','status':'finished','revision':1,'side':0,'names':['QA','QA'],'battle':None,'hostPet':'nebulafox','deadline':int(time.time()*1000)+120000,'reason':'timeout'}}))
     p.evaluate("dispatchEvent(new Event('pageshow'))");expect(p.locator('.online-battle-banner')).to_contain_text('好友對戰結果')
     for expanded in [False,True]:
      if expanded:p.get_by_role('button',name='展開題目',exact=True).click()
      p.wait_for_timeout(350);button=p.get_by_role('button',name='看懂了，下一題',exact=True);box=button.bounding_box();assert box['y']+box['height']<=650
      assert button.evaluate('(e)=>{const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}')
      check(f'{engine} {player} friend banner expanded={expanded}: next remains tappable')
    c.close()
  b.close()
assert not errors,errors
(OUT/'results.json').write_text(json.dumps({'checks':checks,'errors':errors,'realPlayerWrites':False,'physicalIPad':False},ensure_ascii=False,indent=2)+'\n')
