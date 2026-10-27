import os,copy
os.environ['FEIFEI_QA_URL']='http://127.0.0.1:47741'
os.environ['FEIFEI_QA_OUTPUT']='outputs/monster-wave4/capture-flow'
exec(open('outputs/feifei-companion/browser-qa.py').read().split('with sync_playwright() as pw:')[0])
original=copy.deepcopy(fixture)
scenarios=json.loads(subprocess.check_output(['node','--input-type=module','-e',"""
import * as g from './build/game.mjs';
const out=[];for(const player of ['feifei','doudou','jay','alston'])for(const wrong of [false,true]){
 const f=g.newFamily(),day=g.taipeiDay();if(player==='alston')f.profiles[player].learning.school='jianan';g.startRun(f,player,'math',crypto.randomUUID(),42,false,day,'relaxed');const r=f.profiles[player].run;
 for(let i=0;i<6;i++){g.readyQuestion(f,player,r.id,i);g.answerRun(f,player,r.id,i,g.questionById(r.questions[i]).answer,day,0);if(i<5)g.nextQuestion(f,player,r.id,i);}
 const states=[],choices=[];function state(){const family=structuredClone(f),run=family.profiles[player].run,index=g.captureIndex(run.capture),q=g.questionById(run.capture.trial.questions[index]),{answer,explanation,target,...question}=q;run.capture.trial.questions=run.capture.trial.questions.map((id,i)=>i===index?id:'');states.push({family,captureQuestions:{[run.id]:{...question,...(run.capture.outcome==='pending'?{}:{answer,explanation,target})}}});}
 state();for(let i=0;i<(wrong?2:3);i++){const q=g.questionById(r.capture.trial.questions[i]),choice=wrong&&i===1?(q.answer+1)%q.options.length:q.answer;choices.push(choice);g.answerCapture(f,player,'voyage',r.id,i,choice,day);f.revision++;state();}out.push({player,wrong,states,choices});
}console.log(JSON.stringify(out));"""],text=True))
with sync_playwright() as pw:
 for engine in ['webkit','chromium']:
  b=getattr(pw,engine).launch(headless=True)
  for s in scenarios:
   fixture=copy.deepcopy(original);fixture.update(s['states'][0]);c,p=setup(b,username=s['player'],player=s['player'],width=393,reduced=True);step=[0]
   def command(route):
    body=route.request.post_data_json['command'];i=step[0]
    assert body['type']=='capture-answer' and body['player']==s['player'] and body['index']==i and body['choice']==s['choices'][i],body
    step[0]+=1;fixture.update(s['states'][step[0]]);route.fulfill(json=dict(fixture,username=s['player'],playerId=s['player']))
   p.route('**/api/command',command)
   for i,choice in enumerate(s['choices']):
    p.get_by_role('dialog',name=f'降服挑戰 {i+1}／3').wait_for();expect(p.get_by_role('button',name='聽題目',exact=True)).to_have_count(0 if s['player'] in ['jay','alston'] else 1);p.locator('.capture-answers button').nth(choice).click()
    if i==0:
     p.get_by_role('dialog',name='降服挑戰 2／3').wait_for();p.wait_for_load_state('networkidle');p.reload();p.get_by_role('dialog',name='降服挑戰 2／3').wait_for()
   expect(p.locator('.capture-overlay')).to_contain_text('這題沒有答對' if s['wrong'] else '三題全對，降服成功！');expect(p.locator('.capture-answers button')).to_have_count(0)
   assert step[0]==len(s['choices']);p.get_by_role('button',name='繼續冒險',exact=True).click();expect(p.locator('.capture-overlay')).to_have_count(0)
   check(f"{engine} {s['player']} {'wrong ends capture' if s['wrong'] else 'three answers succeed'}; reload resumes after first answer")
   p.wait_for_load_state('networkidle');c.close()
  b.close()
assert not errors,errors
(OUT/'results.json').write_text(json.dumps({'checks':checks,'errors':errors,'mockApi':True,'physicalIPad':False},ensure_ascii=False,indent=2))
