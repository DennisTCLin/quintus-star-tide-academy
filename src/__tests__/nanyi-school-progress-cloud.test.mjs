import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createAppServer } from '../../server.mjs';
import { createCloudApi } from '../../server/cloud.mjs';
import { provisionChildAccount } from '../../server/child-account.mjs';
import { provisionAdmin } from '../../server/admin.mjs';
import { questionById } from '../../build/game.mjs';

const suite=process.env.TEST_DATABASE_URL ? describe : describe.skip;
suite('fourth-grade Nanyi pilot in the authenticated game',()=>{
  let api, server, base, child, admin, memberId, otherMemberId, player;
  const topic='4:math:nanyi-fraction-kind';

  async function request(path, body, session) {
    const response=await fetch(base+path,{method:body===undefined?'GET':'POST',
      headers:{Origin:base,...(body===undefined?{}:{'Content-Type':'application/json'}),
        ...(session?{Cookie:session.cookie,'X-CSRF-Token':session.data.csrf}:{})},
      ...(body===undefined?{}:{body:JSON.stringify(body)})});
    return {status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};
  }
  const childPayload=(fields,revision=child.data.family.revision)=>({id:randomUUID(),revision,command:{player,...fields}});
  async function play(fields) {
    const reply=await request('/api/command',childPayload(fields),child);
    expect(reply.status,JSON.stringify(reply.data)).toBe(200);
    child.data=reply.data;
    return reply.data.family.profiles[player].learning.study?.session;
  }

  beforeAll(async()=>{
    api=await createCloudApi({connectionString:process.env.TEST_DATABASE_URL,production:false});
    server=createAppServer({api});
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    base=`http://127.0.0.1:${server.address().port}`;
    const pupil=await provisionChildAccount(api.pool,{username:'brownie',password:'2947',displayName:'Synthetic curriculum learner',grade:4});
    const other=await provisionChildAccount(api.pool,{username:'nanyi_other',password:'2947',displayName:'Synthetic unrelated learner',grade:4});
    ({memberId,playerId:player}=pupil);otherMemberId=other.memberId;
    const credentials={username:'nanyi_pilot_admin',password:'Local-QA-Only-2026'};
    await provisionAdmin(api.pool,credentials);
    child=await request('/api/login',{username:'brownie',password:'2947'});
    admin=await request('/api/admin/login',credentials);
    expect(child.status).toBe(200);
    expect(admin.status).toBe(200);
    await play({type:'starter-draw'});await play({type:'starter-confirm'});
  });
  afterAll(async()=>{if(server)await new Promise(resolve=>server.close(resolve));if(api)await api.close();});

  it('authorizes the real roster match, preserves balances, and replaces a pending exam when school progress changes', async()=>{
    const path='/api/admin/parent/'+memberId;
    const scope=state=>({topic,state});
    const ledger=p=>({coins:p.coins,tickets:p.tickets,starTickets:p.starTickets,owned:p.owned,growth:p.growth,milestones:p.milestones});
    const prior=ledger(child.data.family.profiles[player]);
    expect((await request(path,scope('taught'),child)).status).toBe(401);
    expect((await request('/api/command',childPayload({type:'learning-progress',...scope('taught')}),child)).status).toBe(403);
    expect((await request('/api/admin/parent/'+otherMemberId,scope('taught'),admin)).status).toBe(400);
    expect((await request(path,scope('taught'),{...admin,data:{csrf:'bad'}})).status).toBe(403);
    const set=await request(path,scope('taught'),admin);
    expect(set.status).toBe(200);
    expect(set.data.schoolProgress.find(t=>t.id===topic).exposure).toBe('taught');
    child.data=(await request('/api/state',undefined,child)).data;

    const session=await play({type:'review-start',mode:'learn',course:'math'});
    expect(session.phase).toBe('lesson');
    expect(child.data.studyQuestions[player]).toBeUndefined();
    expect(child.data.learningLessons[player].example.id).toBe('ny4-fraction-kind-0');
    await play({type:'learning-lesson',sessionId:session.id,index:0,done:true});
    for(let i=0;i<2;i++){
      const visible=child.data.studyQuestions[player];
      expect(visible.answer).toBeUndefined();
      expect(visible.id.startsWith('ny4-fraction-kind-')).toBe(true);
      await play({type:'review-answer',sessionId:session.id,index:i,choice:questionById(visible.id).answer});
      await play({type:'review-next',sessionId:session.id,index:i});
    }
    expect(child.data.studyQuestions[player].id).toBe('g4m-tcool-20003314-i1');
    expect(child.data.studyQuestions[player].answer).toBeUndefined();
    const before=child.data.family.revision;
    expect((await request(path,scope('not-yet'),admin)).status).toBe(200);
    expect((await request('/api/command',childPayload({type:'review-answer',sessionId:session.id,index:2,choice:3},before),child)).status).toBe(409);
    const after=(await request('/api/state',undefined,child)).data;
    const profile=after.family.profiles[player];
    expect(profile.learning.study.session).toMatchObject({id:session.id,answers:[true,true]});
    expect(profile.learning.study.session.questions[2]).not.toBe('g4m-tcool-20003314-i1');
    expect(after.studyQuestions[player]?.id).not.toBe('g4m-tcool-20003314-i1');
    expect(ledger(profile)).toEqual(prior);
  });
});
