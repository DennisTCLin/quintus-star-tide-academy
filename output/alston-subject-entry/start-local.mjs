// Disposable localhost account only. Never reads or modifies production players.
import { writeFileSync } from 'node:fs';
import { createCloudApi } from '../../server/cloud.mjs';
import { createAppServer } from '../../server.mjs';
import { provisionChildAccount } from '../../server/child-account.mjs';
import { newFamily, startRun, readyQuestion, answerRun, nextQuestion, questionById, validateFamily, taipeiDay } from '../../build/game.mjs';
const api = await createCloudApi({ connectionString: 'postgresql://127.0.0.1:55432/star_tide_alston_entry_20261026', production: false });
const made = await provisionChildAccount(api.pool, { username:'alston', password:process.env.QA_PASSWORD, displayName:'Subject entry QA', grade:6 });
if (!made.created) throw Error('Expected a fresh isolated account');
const family = newFamily(), p = family.profiles.alston;
p.learning.school = 'jianan';
startRun(family, 'alston', 'science', crypto.randomUUID(), 42, false, taipeiDay(), 'relaxed');
for (let i=0; i<6; i++) {
  const r=p.run, q=questionById(r.questions[i]);
  readyQuestion(family, 'alston', r.id, i, Date.now());
  answerRun(family, 'alston', r.id, i, i<3 ? q.answer : (q.answer+1)%q.options.length, taipeiDay());
  if (i<5) nextQuestion(family, 'alston', r.id, i);
}
validateFamily(family);
if (p.run.status!=='failed'||p.run.remediation.receipt!==null) throw Error('Incorrect fixture');
writeFileSync('/tmp/alston-subject-entry-family.json',JSON.stringify(family));
await api.pool.query('UPDATE game_states SET family=$2 WHERE account_id=$1',[made.accountId,family]);
const server=createAppServer({api});await new Promise(r=>server.listen(47830,'127.0.0.1',r));
console.log('Synthetic subject entry QA ready on 47830');
process.on('SIGTERM',()=>server.close(()=>api.close().then(()=>process.exit(0))));
