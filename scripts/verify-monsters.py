"""Layout/catalog checks use intercepted API fixtures. Live mode uses an isolated QA account.
MONSTER_QA_URL defaults to the local production server; never modifies real learners.
"""
import json, os, subprocess, uuid
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'outputs/monster-bestiary'; OUT.mkdir(parents=True,exist_ok=True)
BASE=os.environ.get('MONSTER_QA_URL','http://127.0.0.1:4199').rstrip('/')
checks=[]; errors=[]; metrics=[]

def fixture(player='quintus',level=1,won=False,legacy=False):
    code="""import{newFamily,startRun,answerRun,nextQuestion,questionById,taipeiDay}from'./build/game.mjs';
const family=newFamily(),id=process.argv[1],p=family.profiles[id],level=Number(process.argv[2]);p.growth.xp.tideglow=25*(level-1)*(level+2)/2;
startRun(family,id,'math','monster-fixture',level===1?3:12);
if(process.argv[3]==='true')for(let i=0;i<5;i++){const r=p.run;answerRun(family,id,r.id,r.index,questionById(r.questions[r.index]).answer);if(i<4)nextQuestion(family,id,r.id,r.index);}
if(process.argv[4]==='true'){delete p.run.encounter.variant;delete p.lastMonsterVariant;}
console.log(JSON.stringify({family,questions:{[id]:questionById(p.run.questions[p.run.index])},username:'fixture',playerId:id,displayName:'QA',csrf:'fixture',day:taipeiDay(),verified:{quintus:0,feifei:0,qingqing:0,doudou:0},legacy:false,canMigrate:false}));"""
    return json.loads(subprocess.check_output(['node','--input-type=module','-e',code,player,str(level),str(won).lower(),str(legacy).lower()],cwd=ROOT))

def overflow(page):
    assert not page.evaluate('document.documentElement.scrollWidth>innerWidth'), 'page overflow'

def setup(browser, width, player, level=1, won=False, legacy=False, reduced=True, height=1000, broken=False):
    ctx=browser.new_context(viewport={'width':width,'height':height},reduced_motion='reduce' if reduced else 'no-preference')
    page=ctx.new_page();page.set_default_timeout(10000);page.on('pageerror',lambda e:errors.append(str(e)))
    state=fixture(player,level,won,legacy)
    page.route('**/api/**',lambda r:r.fulfill(json=state))
    if broken:page.route('**/assets/monsters/**',lambda r:r.abort())
    page.goto(BASE);page.locator('.course-card').first.click();page.locator('.quiz-stage').wait_for()
    return ctx,page,state

with sync_playwright() as pw:
    browser=pw.chromium.launch(channel='chrome',headless=True)
    for width,player,level,won in [(1440,'quintus',5,False),(1440,'quintus',5,True),(768,'feifei',1,False),(390,'feifei',5,False),(320,'feifei',1,False),(320,'feifei',5,True)]:
        ctx,page,state=setup(browser,width,player,level,won)
        stage=page.locator('.quiz-stage'); stage.wait_for(); page.wait_for_timeout(250)
        overflow(page)
        size=stage.bounding_box();metrics.append({'width':width,'player':player,'level':level,'won':won,'stage':size})
        assert size['height']>=280
        if width==1440:
            assert size['width']>750
            if won:
                assert size['width']>1100
                assert page.locator('.result-panel').bounding_box()['y']>size['y']+size['height']
        if player=='feifei':assert page.locator('.quiz-hud rt').count()>0
        assert page.locator('.quiz-stage .monster-art img').evaluate('(e)=>e.complete&&e.naturalWidth===640')
        if not won:
            choice=page.locator('.answer-grid [data-answer-option]').first;choice.scroll_into_view_if_needed()
            assert choice.evaluate('(e)=>{const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}'),'answer covered'
        page.evaluate('window.scrollTo(0,0)');page.screenshot(path=str(OUT/f'battle-{width}-{player}-{level}-{won}.png'),full_page=True)
        page.locator('.quiz-bestiary-link button').click();page.locator('.monster-grid').wait_for()
        assert page.locator('.monster-card').count()==30
        overflow(page)
        if player=='feifei':assert page.locator('.monster-card rt').count()>0
        # Readability at 200% text size; controls remain actionable.
        if width==320 and not won:page.evaluate('document.documentElement.style.fontSize="200%"');overflow(page)
        page.screenshot(path=str(OUT/f'bestiary-{width}-{player}-{level}-{won}.png'))
        page.get_by_role('group',name='篩選怪物屬性').get_by_role('button',name='水',exact=False).click()
        assert page.locator('.monster-card').count()==6
        page.locator('select[name=monster-family]').select_option('golem')
        assert page.locator('.monster-card').count()==2
        page.locator('select[name=monster-form]').select_option('warden')
        assert page.locator('.monster-card').count()==1
        opener=page.locator('.monster-card');opener.click();page.locator('.monster-dialog[open]').wait_for()
        assert page.locator('#monster-title').inner_text().replace('\n','')
        assert page.locator('.monster-dialog').evaluate('e=>e.scrollWidth<=e.clientWidth')
        page.screenshot(path=str(OUT/f'detail-{width}-{player}.png'))
        page.keyboard.press('Escape');assert page.locator('.monster-dialog').count()==0
        assert opener.evaluate('e=>e===document.activeElement'),'dialog focus not restored'
        page.locator('input[name=monster-search]').fill('找不到的怪物')
        assert page.locator('.monster-card').count()==0;assert page.locator('.bestiary-empty').is_visible()
        page.locator('.bestiary-empty button').click();assert page.locator('.monster-card').count()==30
        page.locator('.bestiary-top button').last.click();page.locator('.quiz-stage').wait_for()
        assert page.locator('.quiz-hud').inner_text().find('5')>=0 or level==1
        assert page.locator('.quiz-stage').get_attribute('data-phase')=='idle'
        checks.append([width,player,level,won,'battle, filters, empty state, detail, Escape/focus and resume PASS']);ctx.close()
    # Every generated file decodes; catalog loads portraits lazily.
    ctx,page,state=setup(browser,1440,'quintus')
    page.locator('.quiz-bestiary-link button').click()
    assert page.locator('.monster-card img').first.get_attribute('loading')=='lazy'
    for card in page.locator('.monster-card').all():
        card.scroll_into_view_if_needed();card.locator('img').evaluate('(e)=>e.decode()')
        assert card.locator('img').evaluate('(e)=>e.naturalWidth===640')
    checks.append(['all 30 generated assets decode, lazy-loading PASS']);ctx.close()
    for legacy,broken in [(True,False),(False,True)]:
        ctx,page,state=setup(browser,390,'feifei',legacy=legacy,broken=broken)
        if legacy:assert page.locator('.quiz-monster img').count()==1
        else:
            page.locator('.quiz-stage .monster-art-fallback').wait_for();page.locator('.quiz-bestiary-link button').click();page.locator('.monster-card').first.click();page.locator('.monster-dialog .monster-art-fallback').wait_for()
        overflow(page);checks.append(['legacy' if legacy else 'broken asset','PASS']);ctx.close()
    ctx,page,state=setup(browser,640,'feifei',height=360)
    choice=page.locator('.answer-grid [data-answer-option]').first;choice.scroll_into_view_if_needed()
    assert choice.evaluate('(e)=>{const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}')
    checks.append(['landscape short viewport answers remain reachable PASS']);ctx.close()
    assert not errors,errors
    browser.close()
    (OUT/'ui-verification.json').write_text(json.dumps({'url':BASE,'checks':checks,'metrics':metrics,'pageErrors':errors},ensure_ascii=False,indent=2))
    print(json.dumps({'checks':len(checks),'pageErrors':errors,'result':'PASS'}))
