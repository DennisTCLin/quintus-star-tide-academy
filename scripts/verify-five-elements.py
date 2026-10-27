"""UI check using production-built assets and synthetic API responses; never writes player data."""
import json, os, subprocess
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

BASE = os.environ.get('ELEMENT_QA_URL', 'http://127.0.0.1:4287')
OUT = Path('outputs/five-elements'); OUT.mkdir(parents=True, exist_ok=True)
fixture = json.loads(subprocess.check_output(['node', '--input-type=module', '-e', '''
import * as g from './build/game.mjs';
const family=g.newFamily();for(const p of Object.values(family.profiles))for(const c of g.ROSTER){p.owned[c.id]=2;p.firstAcquired[c.id]=null;}
console.log(JSON.stringify({roster:g.ROSTER,state:{family,questions:{},username:'five-elements-preview',playerId:'quintus',displayName:'五行預覽',csrf:'preview',day:g.taipeiDay(),verified:{quintus:0,feifei:0,qingqing:0,doudou:0},legacy:false,canMigrate:false}}));
''']))
NAMES = ['金', '木', '水', '火', '土']
ICONS = ['metal', 'leaf', 'water', 'fire', 'earth']
rows, errors, writes = [], [], []
PLAIN = "el=>{const c=el.cloneNode(true);c.querySelectorAll('rt,.brand-symbol-text').forEach(x=>x.remove());return c.textContent}"
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, channel='chrome')
    def setup(player, width, reduced='reduce'):
        page = browser.new_page(viewport={'width':width,'height':900}, reduced_motion=reduced)
        page.set_default_timeout(10000)
        page.on('pageerror', lambda e: errors.append(str(e)))
        def api(route):
            if route.request.method != 'GET': writes.append(route.request.method)
            route.fulfill(json=dict(fixture['state'], playerId=player))
        page.route('**/api/**', api)
        page.goto(BASE, wait_until='networkidle')
        return page
    for player, width in [('quintus',1440),('feifei',320),('qingqing',390)]:
        page = setup(player, width)
        page.locator('.family-nav button').nth(1).click()
        select = page.get_by_role('combobox', name='五行屬性')
        expect(select.locator('option')).to_have_text(['全部五行',*NAMES])
        for name, icon in zip(NAMES,ICONS):
            select.select_option(name)
            expected = [c for c in fixture['roster'] if c['element']==name]
            assert page.locator('.pet-card').count()==min(12,len(expected))
            for card in page.locator('.pet-card').all():
                assert name in card.locator('.card-caption > span').evaluate(PLAIN)
                assert card.locator(f'[data-brand-icon="{icon}"]').count()==1
            if player=='feifei':
                assert page.locator('.pet-card').first.locator('.card-caption ruby').count()>0
            page.locator('.pet-card').first.click()
            expect(page.get_by_role('dialog')).to_be_visible()
            assert name in page.locator('dialog .count-badge').evaluate(PLAIN)
            assert not page.evaluate('document.documentElement.scrollWidth>innerWidth+1')
            if player=='quintus': page.locator('dialog .detail-card').screenshot(path=str(OUT/f'card-{icon}.png'))
            page.get_by_role('button',name='關閉',exact=True).click()
            assert not page.evaluate('document.documentElement.scrollWidth>innerWidth+1')
            rows.append({'player':player,'width':width,'element':name,'cards':len(expected),'overflow':False})
        select.select_option('all')
        page.get_by_role('textbox',name='搜尋夥伴').fill('金')
        assert page.locator('.pet-card').count()==len([c for c in fixture['roster'] if c['element']=='金'])
        page.get_by_role('textbox',name='搜尋夥伴').fill('')
        if player=='quintus':
            page.locator('.catalog-tools').scroll_into_view_if_needed()
            page.wait_for_function("() => Array.from(document.querySelectorAll('.pet-card .pet-art img')).slice(0,4).every(img=>img.complete && img.naturalWidth>0)")
            page.screenshot(path=str(OUT/'collection-desktop.png'))
        page.locator('.family-nav button').nth(5).click()
        assert '金剋木、木剋土、土剋水、水剋火、火剋金' in page.locator('main').evaluate(PLAIN)
        earth = next(i for i,c in enumerate(fixture['roster']) if c['element']=='土')
        page.locator('.pet-picker button').nth(earth).click()
        page.locator('section').filter(has=page.locator('.pet-picker')).locator('button.f-primary').click()
        expect(page.locator('.duel-stage')).to_be_visible()
        assert '土' in page.locator('.duel-health').first.locator('.duel-element').evaluate(PLAIN)
        assert not page.evaluate('document.documentElement.scrollWidth>innerWidth+1')
        page.locator('.duel-stage').screenshot(path=str(OUT/f'battle-{player}.png'))
        page.close()
    for name,icon in [('金','metal'),('土','earth')]:
        page=setup('quintus',1440,'no-preference')
        page.locator('.family-nav button').nth(5).click()
        index=next(i for i,c in enumerate(fixture['roster']) if c['element']==name)
        page.locator('.pet-picker button').nth(index).click()
        page.locator('section').filter(has=page.locator('.pet-picker')).locator('button.f-primary').click()
        page.locator('.battle-controls button').first.click()
        expect(page.locator(f'.spell-{icon}').first).to_be_attached()
        page.wait_for_function("() => document.querySelector('.duel-stage')?.dataset.phase==='flight' && Number(getComputedStyle(document.querySelector('.duel-spell')).opacity)>0.5")
        page.locator('.duel-stage').screenshot(path=str(OUT/f'spell-{icon}.png'),animations='allow')
        expect(page.locator('.duel-stage')).to_have_attribute('data-round','2',timeout=10000)
        page.close()
    browser.close()
assert not errors, errors
assert not writes, writes
(OUT/'browser.json').write_text(json.dumps({'base':BASE,'cases':rows,'errors':errors,'writes':writes},ensure_ascii=False,indent=2)+'\n')
print('PASS: 15 five-element filters/details across three grades; 320/390/1440px; search; combat labels; metal/earth effects; zero JS errors or API writes')
