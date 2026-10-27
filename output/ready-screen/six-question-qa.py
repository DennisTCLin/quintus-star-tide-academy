exec(open('output/ready-screen/layout-qa.py').read().split('with sync_playwright() as p:')[0])
import subprocess
fixture=next(x for x in json.loads((OUT/'fixtures.json').read_text()) if x['grade']==4);rows=[]
with sync_playwright() as p:
 for engine in ['chromium','webkit']:
  subprocess.run(['node','output/ready-screen/reset-six.mjs','4'],check=True)
  b=p.chromium.launch(channel='chrome',headless=True) if engine=='chromium' else p.webkit.launch(headless=True)
  c,page=login(b,4,{'width':390,'height':744});page.locator('.ready-start').click()
  for i in range(6):
   page.wait_for_function('i=>document.querySelector(".quiz-question-count")?.textContent.includes(`第 ${i+1}／`) && document.querySelector("[data-answer-option]:not([disabled])")',arg=i,polling=100)
   page.locator('[data-answer-option]').nth(fixture['questions'][i]['answer']).click()
  page.locator('.quiz-victory').wait_for(timeout=20000);state=page.evaluate('async()=>await(await fetch("/api/state")).json()');r=state['family']['profiles'][state['playerId']]['run'];assert r['status']=='won' and r['answers']==[True]*6
  assert page.locator('.victory-continue').is_visible();page.screenshot(path=str(OUT/f'{engine}-six-won.png'));rows.append({'engine':engine,'correct':6,'status':'won','victoryContinueVisible':True});c.close();b.close()
 (OUT/'six-question-results.json').write_text(json.dumps(rows,indent=2));print('Six question PASS',len(rows))
