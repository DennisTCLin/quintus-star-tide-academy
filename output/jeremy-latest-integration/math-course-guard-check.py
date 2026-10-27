"""Regression at the only merge conflict: both types of journey use the existing guarded entry."""
from playwright.sync_api import sync_playwright,expect
from pathlib import Path
import json,os,subprocess
BASE=Path('/tmp/jeremy-latest-browser-base.txt').read_text().strip();OUT=Path('output/jeremy-latest-integration');rows=[]
def reset(mode):
    family=Path('/tmp/jeremy-latest-'+mode+'.json').read_text().replace("'","''")
    subprocess.run(['/opt/homebrew/opt/postgresql@17/bin/psql','-h','127.0.0.1','-p','55432','-d','star_tide_latest_browser_20261026','-c',"DELETE FROM request_limits; UPDATE game_states SET family='"+family+"'::jsonb WHERE account_id=(SELECT account_id FROM player_logins WHERE username='alston')"],check=True,capture_output=True)
def state(c):return c.request.get(BASE+'/api/state').json()['family']
def modal_check(page,d,engine):
    expect(d).to_be_visible();assert page.locator('dialog[open]').count()==1
    assert d.evaluate('(d)=>d.contains(document.activeElement)')
    close=d.get_by_role('button',name='關閉',exact=True);box=close.bounding_box()
    assert box and 0<=box['y'] and box['y']+box['height']<=page.viewport_size['height']
    # WebKit's default macOS keyboard preference skips buttons with Tab.
    # Option-Tab traverses all controls, matching full keyboard navigation.
    page.keyboard.press('Alt+Tab' if engine=='webkit' else 'Tab')
    assert d.evaluate('(d)=>d.contains(document.activeElement)')
with sync_playwright() as p:
    for engine in ['chromium','webkit']:
        b=getattr(p,engine).launch(headless=True)
        for mode in ['failed','pending','active','math-active']:
            reset(mode);c=b.new_context(viewport={'width':393 if mode=='math-active' else 1024,'height':740 if mode=='math-active' else 748},has_touch=True,reduced_motion='reduce')
            assert c.request.post(BASE+'/api/login',headers={'Origin':BASE},data={'username':'alston','password':os.environ['MATH_QA_PASSWORD']}).status==200
            before=state(c);page=c.new_page();commands=[]
            page.on('request',lambda r:commands.append(r.post_data_json['command']['type']) if r.url.endswith('/api/command') else None)
            page.goto(BASE,wait_until='networkidle')
            if mode=='active':
                page.locator('.island-course-details > summary').click();page.get_by_role('button',name='去數學島',exact=True).click()
            else:
                page.get_by_role('button',name={'failed':'繼續挑戰','pending':'領取獎勵','math-active':'🎁 查看上次挑戰'}[mode],exact=True).click()
                if mode=='failed':page.get_by_role('button',name='換個科目',exact=True).click()
                else:page.locator('.victory-secondary').get_by_role('button',name='換個科目',exact=True).click()
                picker=page.get_by_role('dialog',name='選擇學習科目');modal_check(page,picker,engine)
                expect(picker.locator('.course-picker-card')).to_have_count(6)
                picker.get_by_role('button',name='開始英文' if mode=='math-active' else '去數學島',exact=True).click()
            d=page.get_by_role('dialog',name='前往另一座島');modal_check(page,d,engine);assert state(c)==before and not commands
            if mode=='pending':
                expect(d).to_contain_text('先領好獎勵');d.get_by_role('button',name='先領取獎勵',exact=True).click();expect(page.locator('.quiz-victory')).to_be_visible()
                assert state(c)==before and not commands
            else:
                button=d.get_by_role('button',name='結束本趟並換島',exact=True);button.click()
                expect(page.locator('.challenge-preparation') if mode=='math-active' else page.locator('#math-island[data-screen=map]')).to_be_visible()
                after=state(c);old=before['profiles']['alston'];new=after['profiles']['alston']
                for key in ['coins','tickets','rewardStars','owned','growth','milestones']:assert new[key]==old[key],key
                assert all(after['profiles'][k]==before['profiles'][k] for k in before['profiles'] if k!='alston')
                if mode=='failed':assert commands==['skip-remediation'] and new['run']['remediation']['receipt']['skipped']
                elif mode=='active':assert commands==['quit'] and new['run'] is None
                else:
                    assert commands==['island-quit','start'] and new['run']['course']=='english'
                    for key in ['stats','units','recent']:assert new['mathIsland'].get(key)==old['mathIsland'].get(key)
            rows.append({'engine':engine,'case':mode,'pass':True,'singleModal':True,'focusInside':True,'keyboardKey':'Alt+Tab' if engine=='webkit' else 'Tab','rewardsPreserved':True});print('PASS',engine,mode,flush=True);c.close()
        b.close()
OUT.joinpath('math-course-guard-results.json').write_text(json.dumps({'pass':True,'cases':rows,'realLocalPostgres':True,'physicalDevice':False,'productionMutations':False},indent=2)+'\n');print('PASS',len(rows),'math/ordinary switching guards')
