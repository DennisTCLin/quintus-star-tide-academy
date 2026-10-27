import os,copy
os.environ['FEIFEI_QA_URL']='http://127.0.0.1:47741'
os.environ['FEIFEI_QA_OUTPUT']='outputs/monster-wave4/capture-browser'
exec(open('outputs/feifei-companion/browser-qa.py').read().split('with sync_playwright() as pw:')[0])
original=copy.deepcopy(fixture)
fixtures=json.loads(subprocess.check_output(['node','--input-type=module','-e',"""
import * as g from './build/game.mjs';
const out={};for(const player of ['feifei','doudou','qingqing','quintus','jay']){
 const f=g.newFamily();g.startRun(f,player,'math',crypto.randomUUID(),42,false,g.taipeiDay(),'relaxed');const r=f.profiles[player].run;
 for(let i=0;i<6;i++){g.readyQuestion(f,player,r.id,i);g.answerRun(f,player,r.id,i,g.questionById(r.questions[i]).answer,g.taipeiDay(),0);if(i<5)g.nextQuestion(f,player,r.id,i);}
 const q=g.questionById(r.capture.trial.questions[0]);const {answer,explanation,target,...question}=q;r.capture.trial.questions=r.capture.trial.questions.map((v,i)=>i===0?v:'');
 out[player]={family:f,captureQuestions:{[r.id]:question}};
}console.log(JSON.stringify(out));"""],text=True))
with sync_playwright() as pw:
 for engine in ['webkit','chromium']:
  b=getattr(pw,engine).launch(headless=True)
  for player in fixtures:
   fixture=copy.deepcopy(original);fixture.update(fixtures[player]);c,p=setup(b,username=player,player=player,width=1024,reduced=True)
   dialog=p.get_by_role('dialog',name='降服挑戰 1／3');dialog.wait_for()
   for width,height in [(1024,650),(834,1194),(768,940),(393,740),(320,568),(812,375)]:
    p.set_viewport_size({'width':width,'height':height});p.wait_for_timeout(150)
    assert p.evaluate('document.documentElement.scrollWidth<=innerWidth'),(engine,player,width)
    for button in p.locator('.capture-answers button').all():
     button.scroll_into_view_if_needed();box=button.bounding_box();assert box['height']>=44 and box['width']>=44
     hit=button.evaluate('(e)=>{let r=e.getBoundingClientRect();let t=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return {ok:e.contains(t),rect:r.toJSON(),top:t?.outerHTML};}')
     if not hit['ok']:p.screenshot(path=str(OUT/'failure.png'));raise AssertionError((engine,player,width,height,hit))
    check(f'{engine} {player} capture {width}x{height}: choices tappable without horizontal overflow')
   p.set_viewport_size({'width':1024,'height':650});p.locator('.capture-overlay').evaluate('e=>e.scrollTop=0');p.screenshot(path=str(OUT/f'{engine}-{player}.png'))
   p.get_by_role('button',name='稍後繼續',exact=True).click();expect(dialog).to_have_count(0)
   p.get_by_role('button',name='繼續降服挑戰',exact=False).click();dialog.wait_for();p.get_by_role('button',name='放棄這次降服',exact=True).click();expect(p.get_by_text('放棄後，這趟無法再次降服；戰鬥獎勵仍保留。')).to_be_visible()
   c.close()
  b.close()
assert not errors,errors
(OUT/'results.json').write_text(json.dumps({'checks':checks,'errors':errors,'physicalIPad':False,'realPlayerWrites':False},ensure_ascii=False,indent=2)+'\n')
