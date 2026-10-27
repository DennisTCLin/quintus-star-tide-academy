"""Run after browser-check.py; shares only the disposable localhost fixture."""
from playwright.sync_api import sync_playwright, expect
from pathlib import Path
import json, os, subprocess
BASE=Path('/tmp/jeremy-latest-browser-base.txt').read_text().strip();OUT=Path('output/jeremy-latest-integration');rows=[]
def reset(mode):
    family=Path('/tmp/jeremy-latest-'+mode+'.json').read_text().replace("'","''")
    subprocess.run(['/opt/homebrew/opt/postgresql@17/bin/psql','-h','127.0.0.1','-p','55432','-d','star_tide_latest_browser_20261026','-c',"DELETE FROM request_limits; UPDATE game_states SET family='"+family+"'::jsonb WHERE account_id=(SELECT account_id FROM player_logins WHERE username='alston')"],check=True,capture_output=True)
def state(c):return c.request.get(BASE+'/api/state').json()['family']
with sync_playwright() as p:
    for engine in ['chromium','webkit']:
        b=getattr(p,engine).launch(headless=True)
        for mode in ['pending','completed','active','rejected']:
            reset('completed' if mode=='rejected' else mode)
            c=b.new_context(viewport={'width':1024,'height':748},has_touch=True,reduced_motion='reduce')
            assert c.request.post(BASE+'/api/login',headers={'Origin':BASE},data={'username':'alston','password':os.environ['MATH_QA_PASSWORD']}).status==200
            before=state(c);page=c.new_page();commands=[]
            page.on('request',lambda r:commands.append(r.post_data_json['command']['type']) if r.url.endswith('/api/command') else None)
            page.goto(BASE,wait_until='networkidle')
            if mode=='active':
                page.get_by_role('button',name='從群島開始英文',exact=True).click()
                d=page.get_by_role('dialog',name='前往另一座島',exact=True);expect(d).to_be_visible()
                assert state(c)==before and not commands
                d.get_by_role('button',name='繼續原來的挑戰',exact=True).click()
                expect(page.locator('.challenge-preparation')).to_be_visible()
                assert state(c)==before and not commands
            else:
                page.get_by_role('button',name='領取獎勵' if mode=='pending' else '🎁 查看上次挑戰',exact=True).click()
                page.locator('.victory-secondary').get_by_role('button',name='換個科目',exact=True).click()
                d=page.get_by_role('dialog',name='選擇學習科目',exact=True);expect(d.locator('.course-picker-card')).to_have_count(6)
                if mode=='rejected':
                    page.route('**/api/command',lambda route:route.fulfill(status=503,json={'error':'QA temporary unavailable'}))
                d.get_by_role('button',name='開始英文',exact=True).click()
                if mode=='pending':
                    reward=page.get_by_role('dialog',name='前往另一座島',exact=True)
                    expect(reward).to_contain_text('先領好獎勵');assert page.locator('dialog[open]').count()==1
                    assert state(c)==before and not commands
                    reward.get_by_role('button',name='先領取獎勵',exact=True).click()
                    expect(page.locator('.quiz-victory')).to_be_visible();assert state(c)==before and not commands
                elif mode=='rejected':
                    expect(d).to_be_visible();expect(d.get_by_role('alert')).to_contain_text('QA temporary unavailable')
                    assert state(c)==before
                else:
                    expect(page.locator('.challenge-preparation')).to_be_visible();after=state(c)
                    assert after['profiles']['alston']['run']['course']=='english' and commands==['start']
                    for key in ['coins','tickets','rewardStars','owned','growth']:
                        assert after['profiles']['alston'][key]==before['profiles']['alston'][key]
            rows.append({'engine':engine,'mode':mode,'pass':True});c.close()
        b.close()
OUT.joinpath('guard-results.json').write_text(json.dumps({'pass':True,'cases':rows,'productionMutations':False,'physicalDevice':False},indent=2)+'\n')
print('PASS',len(rows),'pending reward, completed voyage, active voyage, rejected request guard checks')
