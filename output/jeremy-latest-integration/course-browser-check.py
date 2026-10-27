"""Real localhost API + disposable synthetic grade-six account, never production sessions."""
from playwright.sync_api import sync_playwright, expect
from pathlib import Path
import json, os, subprocess
BASE=Path('/tmp/jeremy-latest-browser-base.txt').read_text().strip()
OUT=Path('output/jeremy-latest-integration')
rows=[]; errors=[]; navigation_errors=[]
def reset():
    family=Path('/tmp/jeremy-latest-failed.json').read_text().replace("'","''")
    subprocess.run(['/opt/homebrew/opt/postgresql@17/bin/psql','-h','127.0.0.1','-p','55432','-d','star_tide_latest_browser_20261026','-c',"DELETE FROM request_limits; UPDATE game_states SET family='"+family+"'::jsonb WHERE account_id=(SELECT account_id FROM player_logins WHERE username='alston')"],check=True,capture_output=True)
def state(c): return c.request.get(BASE+'/api/state').json()['family']
def picker(page):
    page.get_by_role('button',name='繼續挑戰',exact=True).click()
    page.get_by_role('button',name='換個科目',exact=True).click()
    d=page.get_by_role('dialog',name='選擇學習科目',exact=True)
    expect(d.locator('.course-picker-card')).to_have_count(6)
    return d
with sync_playwright() as p:
    for engine in ['chromium','webkit']:
        b=getattr(p,engine).launch(headless=True)
        for w,h in [(1024,748),(768,940),(393,740)]:
            for course,name in [('math','數學'),('chinese','國語'),('english','英文'),('social','社會'),('science','自然')]:
                reset()
                c=b.new_context(viewport={'width':w,'height':h},has_touch=True,reduced_motion='reduce')
                r=c.request.post(BASE+'/api/login',headers={'Origin':BASE},data={'username':'alston','password':os.environ['MATH_QA_PASSWORD']});assert r.status==200
                before=state(c);page=c.new_page();page.set_default_timeout(12000);page._qa_active=True
                page.on('pageerror',lambda e:(errors if page._qa_active else navigation_errors).append(str(e)))
                commands=[]
                page.on('request',lambda r:commands.append(r.post_data_json['command']['type']) if r.url.endswith('/api/command') else None)
                page.goto(BASE,wait_until='networkidle');d=picker(page)
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
                if course=='math': page.screenshot(path=str(OUT/f'course-{engine}-{w}-picker.png'))
                d.get_by_role('button',name='開始'+name,exact=True).click()
                expect(d).not_to_be_visible()
                if course=='science':
                    expect(page.get_by_role('heading',name='🛟 挑戰失敗')).to_be_visible()
                    assert state(c)==before and not commands
                    rows.append(dict(engine=engine,width=w,course=course,result='resumed pending corrections without mutation'))
                else:
                    confirm=page.get_by_role('dialog',name='前往另一座島',exact=True)
                    expect(confirm).to_be_visible();expect(confirm).to_contain_text('略過這次補練')
                    assert page.locator('dialog[open]').count()==1
                    assert state(c)==before
                    # Closing the confirmation must not discard corrections or earned progress.
                    confirm.get_by_role('button',name='關閉',exact=True).click()
                    assert state(c)==before and not commands
                    page.get_by_role('button',name='繼續挑戰',exact=True).click()
                    page.get_by_role('button',name='換個科目',exact=True).click()
                    page.get_by_role('dialog',name='選擇學習科目').get_by_role('button',name='開始'+name,exact=True).click()
                    confirm.get_by_role('button',name='結束本趟並換島',exact=True).click()
                    expect(page.locator('.challenge-preparation')).to_be_visible()
                    after=state(c);old=before['profiles']['alston'];new=after['profiles']['alston']
                    assert new['run']['course']==course and new['run']['index']==0 and len(new['run']['questions'])==6
                    for key in ['coins','tickets','starTickets','rewardStars','owned','growth','milestones']:
                        assert new[key]==old[key],key
                    assert new['learning']['mastered']==old['learning']['mastered']
                    assert all(after['profiles'][key]==before['profiles'][key] for key in before['profiles'] if key!='alston')
                    assert commands==['skip-remediation','start'],commands
                    page._qa_active=False;page.reload(wait_until='networkidle');page._qa_active=True
                    assert state(c)['profiles']['alston']['run']==new['run']
                    rows.append(dict(engine=engine,width=w,course=course,result='confirmed switch, 6 questions, progress and rewards preserved, reload preserved'))
                page._qa_active=False;c.close()
        b.close()
assert not errors,errors
assert all('/api/state due to access control checks.' in e for e in navigation_errors),navigation_errors
OUT.joinpath('course-browser-results.json').write_text(json.dumps({'pass':True,'cases':rows,'errors':errors,'navigationCancellationErrors':navigation_errors,'realLocalPostgres':True,'physicalIPad':False,'productionMutations':False},ensure_ascii=False,indent=2)+'\n')
print('PASS',len(rows),'subject-entry flows')
