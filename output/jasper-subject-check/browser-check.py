"""Synthetic shortage and existing-review states, real isolated localhost API."""
from playwright.sync_api import sync_playwright,expect
from pathlib import Path
import json,subprocess
BASE=Path('/tmp/jasper-entry-base.txt').read_text().strip();OUT=Path('output/jasper-subject-check');rows=[];errors=[]
def reset(mode='exhausted'):
    family=Path('/tmp/jasper-entry-'+mode+'.json').read_text().replace("'","''")
    subprocess.run(['/opt/homebrew/opt/postgresql@17/bin/psql','-h','127.0.0.1','-p','55432','-d','star_tide_jasper_entry_20261026','-c',"DELETE FROM request_limits; UPDATE game_states SET family='"+family+"'::jsonb WHERE account_id=(SELECT account_id FROM player_logins WHERE username='jasper')"],check=True,capture_output=True)
def state(c):return c.request.get(BASE+'/api/state').json()
def open_page(b,w,h,mode='exhausted'):
    reset(mode);c=b.new_context(viewport={'width':w,'height':h},has_touch=True,reduced_motion='reduce')
    assert c.request.post(BASE+'/api/login',headers={'Origin':BASE},data={'username':'jasper','password':'2468'}).status==200
    page=c.new_page();page._qa_active=True;page.on('pageerror',lambda e:errors.append(str(e)) if page._qa_active else None)
    page.goto(BASE,wait_until='networkidle');return c,page
def close(c,page):page._qa_active=False;c.close()
with sync_playwright() as p:
    for engine in ['chromium','webkit']:
        b=getattr(p,engine).launch(headless=True)
        for w,h in [(1024,748),(768,940)]:
            for course,name in [('math','數學'),('english','英文入門'),('tones','聲調'),('medials','拼音'),('pairs','辨音')]:
                c,page=open_page(b,w,h);before=state(c)['family']
                page.get_by_role('button',name='從群島開始'+name,exact=True).click()
                panel=page.locator('section.f-panel').filter(has=page.get_by_role('heading',name='學過的題目，接著練',exact=True))
                expect(panel).to_be_attached()
                box=panel.bounding_box();onscreen=bool(box and box['y']<h and box['y']+box['height']>0)
                if w==1024 and course=='english':page.screenshot(path=str(OUT/(engine+'-shortage-feedback.png')))
                assert state(c)['family']==before
                review=panel.get_by_role('button',name='開始複習',exact=True);expect(review).to_be_enabled(timeout=12000);review.click()
                session=page.get_by_role('region',name='複習題目',exact=True);expect(session).to_be_visible()
                after=state(c);profile=after['family']['profiles']['qingqing'];r=profile['learning']['study']['session']
                assert r['course']==course and len(r['questions'])==6
                q=after['studyQuestions']['qingqing'];assert q['grade']==1 and q['course']==course and 'answer' not in q
                assert session.locator('[data-answer-option]').count()==len(q['options'])
                for key in ['coins','tickets','rewardStars','owned','growth']:
                    assert profile[key]==before['profiles']['qingqing'][key]
                assert all(after['family']['profiles'][key]==before['profiles'][key] for key in before['profiles'] if key!='qingqing')
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
                rows.append({'engine':engine,'width':w,'course':course,'reviewOpened':True,'shortageFeedbackInViewport':onscreen,'rewardsAndOtherProfilesUnchanged':True})
                close(c,page)
        c,page=open_page(b,393,740,'resume')
        original=state(c)['family']['profiles']['qingqing']['learning']['study']['session']
        page.get_by_role('button',name='接續複習 · 第 1 題',exact=True).click();expect(page.get_by_role('region',name='複習題目')).to_be_visible()
        assert state(c)['family']['profiles']['qingqing']['learning']['study']['session']['id']==original['id']
        page.screenshot(path=str(OUT/(engine+'-resume-phone.png')));rows.append({'engine':engine,'width':393,'resumeExistingSession':True});close(c,page)
        c,page=open_page(b,1024,748)
        page.locator('.island-course-details > summary').click();page.get_by_role('button',name='去數學島',exact=True).click();expect(page.locator('#math-island')).to_be_visible()
        rows.append({'engine':engine,'width':1024,'mathIslandMapOpened':True});close(c,page);b.close()
assert not errors,errors
OUT.joinpath('browser-results.json').write_text(json.dumps({'pass':True,'cases':rows,'errors':errors,'physicalIPad':False,'productionWrites':False,'shortageFixture':'Synthetic same remaining counts, not a copied player save'},ensure_ascii=False,indent=2)+'\n')
print('PASS',len(rows),'review/island checks; offscreen shortage notices:',sum(r.get('shortageFeedbackInViewport') is False for r in rows))
