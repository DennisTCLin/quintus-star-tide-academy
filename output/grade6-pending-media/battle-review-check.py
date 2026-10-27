from playwright.sync_api import sync_playwright
from pathlib import Path
import json,uuid,subprocess
out=Path('output/grade6-pending-media');base='http://127.0.0.1:4199';subprocess.run(['node',str(out/'seed-figure-run.mjs'),'science'],check=True)
s=Path('src/grade6-supplement-exams.ts').read_text();bank={q['id']:q for q in json.loads(s[s.index('= [')+2:].strip().removesuffix(';'))}
with sync_playwright() as p:
 b=p.webkit.launch();c=b.new_context(storage_state='tmp/alston-browser-session.json',viewport={'width':820,'height':1180})
 def state():return c.request.get(base+'/api/state').json()
 def cmd(command):
  st=state();r=c.request.post(base+'/api/command',headers={'Origin':base,'X-CSRF-Token':st['csrf']},data={'id':str(uuid.uuid4()),'revision':st['family']['revision'],'command':dict(player='alston',**command)});assert r.status==200,r.text();return r.json()
 for i in range(3):
  run=state()['family']['profiles']['alston']['run'];cmd(dict(type='ready-question',runId=run['id'],index=i));q=state()['questions']['alston'];cmd(dict(type='answer',runId=run['id'],index=i,choice=(bank[q['id']]['answer']+1)%4))
  if i<2:cmd(dict(type='next',runId=run['id'],index=i))
 assert state()['family']['profiles']['alston']['run']['status']=='failed'
 page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 c.route('**/exams/grade6/**',lambda r:r.continue_() if '?retry=' in r.request.url else r.abort())
 page.goto(base,wait_until='networkidle');page.get_by_role('button',name='繼續自然挑戰',exact=True).click();page.get_by_role('button',name='重新載入題圖').wait_for();assert page.locator('.battle-review [data-answer-option]:disabled').count()==4
 page.get_by_role('button',name='重新載入題圖').click();page.wait_for_timeout(1000);page.wait_for_function("document.querySelector('.battle-review .question-figure img')?.naturalWidth>0",polling=100);page.wait_for_function("!document.querySelector('.battle-review [data-answer-option]').disabled",polling=100)
 results=[]
 for width,height in [(390,844),(820,1180),(1180,820),(1440,900)]:
  page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(100);assert not page.evaluate('document.documentElement.scrollWidth>innerWidth');page.screenshot(path=str(out/f'battle-review-figure-{width}.png'),full_page=True);results.append({'viewport':[width,height],'failedLoadBlockedAnswers':True,'retryRecovered':True,'noOverflow':True})
 assert not errors; b.close()
(out/'browser-battle-review-results.json').write_text(json.dumps(results,indent=2)+'\n');print(results)
