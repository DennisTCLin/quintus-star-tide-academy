"""Exercise generation healing through the UI with isolated synthetic API fixtures."""
import json,os,subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
base=os.environ.get('ELEMENT_QA_URL','http://127.0.0.1:4287')
out=Path('outputs/element-cycle');out.mkdir(parents=True,exist_ok=True)
fixture=json.loads(subprocess.check_output(['node','--input-type=module','-e', '''
import * as g from './build/game.mjs'; const family=g.newFamily(); for(const p of Object.values(family.profiles))for(const c of g.ROSTER){p.owned[c.id]=1;p.firstAcquired[c.id]=null;}
console.log(JSON.stringify({family,questions:{},username:'cycle-preview',playerId:'quintus',displayName:'相生預覽',csrf:'preview',day:g.taipeiDay(),verified:{quintus:0,feifei:0,qingqing:0,doudou:0},legacy:false,canMigrate:false}));
''']))
plain="el=>{const c=el.cloneNode(true);c.querySelectorAll('rt,.brand-symbol-text').forEach(x=>x.remove());return c.textContent}"
errors=[];writes=[];cases=[]
with sync_playwright() as p:
 b=p.chromium.launch(channel='chrome',headless=True)
 for player,width in [('quintus',1440),('feifei',320),('qingqing',390)]:
  page=b.new_page(viewport={'width':width,'height':950},reduced_motion='reduce');page.set_default_timeout(15000)
  page.on('pageerror',lambda e:errors.append(str(e)))
  def route(r):
   if r.request.method!='GET':writes.append(r.request.method)
   r.fulfill(json=dict(fixture,playerId=player))
  page.route('**/api/**',route);page.goto(base,wait_until='networkidle')
  page.locator('.family-nav button').nth(1).click();page.locator('.pet-card').first.click()
  guide=page.locator('dialog .element-guide');expect(guide).to_be_visible()
  text=guide.evaluate(plain)
  for phrase in ['水生木','金生水','水剋火','土剋水']:assert phrase in text
  assert not page.evaluate('document.documentElement.scrollWidth>innerWidth+1')
  guide.screenshot(path=str(out/f'card-guide-{player}.png'))
  page.get_by_role('button',name='關閉',exact=True).click()
  page.locator('.family-nav button').nth(5).click()
  guide=page.locator('.element-guide');expect(guide).to_be_visible();text=guide.evaluate(plain)
  for phrase in ['金生水、水生木、木生火、火生土、土生金','金剋木、木剋土、土剋水、水剋火、火剋金']:assert phrase in text
  guide.screenshot(path=str(out/f'full-guide-{player}.png'))
  page.locator('.pet-picker button').nth(0).click();page.locator('.pet-picker button').nth(3).click()
  page.locator('section').filter(has=page.locator('.pet-picker')).locator('button.f-primary').click()
  reserve=page.locator('.arena > .f-actions button').first
  assert '體力已滿' in reserve.evaluate(plain)
  reserve.click();expect(page.locator('.duel-stage')).to_have_attribute('data-round','3')
  expect(page.locator('.battle-controls button').first).to_be_enabled()
  assert '相生接力，體力已滿' in page.locator('.battle-log').evaluate(plain)
  reserve.click();expect(page.locator('.duel-stage')).to_have_attribute('data-round','5')
  expect(page.locator('.battle-controls button').first).to_be_enabled()
  assert '回復 8 體力' in reserve.evaluate(plain)
  reserve.click();expect(page.locator('.duel-stage')).to_have_attribute('data-round','7')
  expect(page.locator('.battle-controls button').first).to_be_enabled()
  assert '相生接力，回復 8 體力' in page.locator('.battle-log').evaluate(plain)
  assert not page.evaluate('document.documentElement.scrollWidth>innerWidth+1')
  page.locator('details.duel-history').first.locator('summary').click()
  expect(page.locator('.element-guide')).to_be_visible()
  if player=='feifei':assert page.locator('.element-guide ruby').count()>20
  cases.append({'player':player,'width':width,'detailRelations':True,'bothCycles':True,'fullHpNoHeal':True,'swapHeal8':True,'overflow':False})
  page.close()
 b.close()
assert not errors,errors
assert not writes,writes
(out/'browser.json').write_text(json.dumps({'base':base,'cases':cases,'errors':errors,'writes':writes},ensure_ascii=False,indent=2)+'\n')
print('PASS: three-grade full/detail relations, real UI swap sequence fullHP→no heal and injured→+8, mobile no overflow, zero errors/API writes')
