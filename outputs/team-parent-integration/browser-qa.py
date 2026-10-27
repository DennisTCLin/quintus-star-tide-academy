"""Actual integrated App + local QA API, WebKit touch-device emulation.
The credential manifest is temporary and never committed. No production access.
"""
import asyncio, json, re, subprocess, sys
from pathlib import Path
from playwright.async_api import async_playwright, expect
from urllib.request import urlopen
import hashlib

OUT=Path('outputs/team-parent-integration')
CFG=json.loads(Path('/tmp/team-parent-qa-access.json').read_text())
assert CFG['base']=='http://localhost:4303'
checks=[]; errors=[]
def check(name, ok=True, detail=None):
    assert ok,(name,detail)
    checks.append({'name':name,'pass':True,'detail':detail});print('PASS',name,flush=True)

async def main():
    local=Path('dist/index.html').read_text()
    remote=urlopen(CFG['base']).read().decode()
    entries=re.findall(r'(?:src|href)="(/assets/[^" ]+\.(?:js|css))"',local)
    check('QA server serves the exact local candidate build',all(path in remote and hashlib.sha256(urlopen(CFG['base']+path).read()).digest()==hashlib.sha256(Path('dist'+path).read_bytes()).digest() for path in entries))
    async with async_playwright() as pw:
        browser=await pw.webkit.launch()
        for device in ['iPhone 13','iPad (gen 7)']:
            for username in (['feifei'] if '--focus-setup' in sys.argv else ['alan','quintus','feifei']):
                ctx=await browser.new_context(**pw.devices[device],reduced_motion='reduce')
                page=await ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
                tag=f'{device}-{username}'
                try:
                    await page.goto(CFG['base']);await page.wait_for_load_state('networkidle')
                    await page.locator('input[autocomplete=username]').fill(username)
                    await page.locator('input[type=password]').fill(CFG['password'])
                    await page.get_by_role('button',name='登入，繼續冒險 →',exact=True).click()
                    await expect(page.locator('.family-nav')).to_be_visible(timeout=20000)
                    before=(await (await page.request.get(CFG['base']+'/api/state')).json())['family']
                    await page.locator('.family-nav').get_by_role('button',name=re.compile('家.*長')).click()
                    await expect(page.locator('.parent-player')).to_have_count(1)
                    await expect(page.locator('.adaptive-child')).to_have_count(1)
                    expected=before['profiles']['feifei' if username=='feifei' else 'quintus']
                    progress=await page.locator('.parent-player > span').inner_text()
                    check(tag+': progress values belong to signed-in profile',str(expected['coins']) in progress and str(expected['milestones']['masteryPoints']) in progress)
                    if username in ['alan','quintus']:
                        name='王梓鑫（Alan）' if username=='alan' else '林沐澤（Quintus）'
                        await expect(page.locator('.parent-player')).to_contain_text(name)
                        await expect(page.locator('.parent-player')).to_contain_text('4 年級')
                        await expect(page.locator('.adaptive-child')).to_contain_text(name)
                        images=page.locator('.parent-player img,.adaptive-child img')
                        await expect(images).to_have_count(2)
                        sources=await images.evaluate_all('(els)=>els.map(e=>({src:e.getAttribute("src"),loaded:e.complete&&e.naturalWidth>0}))')
                        check(tag+': both report names and photos match account',all(x['src']==f'/players/{username}.jpg?v=1' and x['loaded'] for x in sources),sources)
                    await page.screenshot(path=str(OUT/f'{tag}-parent.png'))
                    check(tag+': parent has no document overflow',await page.evaluate('document.documentElement.scrollWidth<=innerWidth'))
                    await page.locator('.family-nav').get_by_role('button',name=re.compile('對.*戰')).click()
                    picker=page.locator('.battle-pet-picker').first
                    await expect(picker).to_be_visible()
                    cards=picker.locator('.battle-pet-card');count=await cards.count();assert count>=4
                    for card in await cards.all():await card.scroll_into_view_if_needed()
                    await expect(picker.locator('.battle-pet-image').first).to_be_visible()
                    await page.wait_for_function('Array.from(document.querySelectorAll(".battle-pet-image")).every(e=>e.complete&&e.naturalWidth>0)')
                    for width,height in [(320,640),(390,844)] if device=='iPhone 13' else [(768,1024),(1024,768)]:
                        await page.set_viewport_size({'width':width,'height':height})
                        layout=await picker.evaluate('''el=>({width:innerWidth,document:document.documentElement.scrollWidth,
                          columns:getComputedStyle(el).gridTemplateColumns.split(' ').length,
                          ruby:document.querySelectorAll('.battle-pet-picker ruby,.battle-heading ruby,.battle-setup-actions ruby,.mode-switch ruby').length,
                          cards:Array.from(el.querySelectorAll('button')).map(b=>({overflow:b.scrollWidth>b.clientWidth+1,w:b.getBoundingClientRect().width,h:b.getBoundingClientRect().height,label:b.getAttribute('aria-label')}))})''')
                        check(f'{tag}: {width}px cards, labels and ruby',layout['document']<=width and layout['ruby']==0 and all(not c['overflow'] and c['w']>=44 and c['h']>=44 and c['label'] for c in layout['cards']) and (width>600 or layout['columns']==2),layout)
                    await page.set_viewport_size(pw.devices[device]['viewport'])
                    selected=picker.locator('[aria-pressed=true]')
                    while await selected.count():await selected.first.tap()
                    start=page.locator('.battle-setup-actions button')
                    await expect(start).to_be_disabled()
                    await cards.first.focus();await cards.first.press('Space');await expect(selected).to_have_count(1)
                    await cards.first.press('Enter');await expect(selected).to_have_count(0)
                    check(tag+': keyboard Space and Enter toggle the focused card')
                    for i in range(3):await cards.nth(i).tap()
                    await expect(selected).to_have_count(3)
                    await expect(picker.locator('button:disabled')).to_have_count(count-3)
                    await cards.nth(2).tap();await expect(selected).to_have_count(2)
                    await expect(picker.locator('button:disabled')).to_have_count(0)
                    check(tag+': selection supports zero, up to three, and cancellation')
                    await page.get_by_role('button',name='👥 雙人輪流',exact=True).click()
                    await expect(page.locator('.battle-pet-picker')).to_have_count(2)
                    other=page.locator('.battle-pet-picker').nth(1)
                    await expect(start).to_be_disabled()
                    await cards.nth(1).tap();await other.locator('button').first.tap()
                    await expect(start).to_be_enabled()
                    await expect(page.locator('.battle-pet-picker ruby')).to_have_count(0)
                    check(tag+': duo uses new picker and requires matching team sizes')
                    check(tag+': no floating companion obscures team selection',await page.locator('.tide-companion').count()==0)
                    await picker.evaluate("el=>el.scrollIntoView({block:'start'})")
                    await page.screenshot(path=str(OUT/f'{tag}-team.png'))
                    await page.get_by_role('button',name='🤖 電腦陪練',exact=True).click()
                    await start.tap();await expect(page.locator('.duel-stage')).to_be_visible()
                    check(tag+': selected team can enter a battle')
                    after=(await (await page.request.get(CFG['base']+'/api/state')).json())['family']
                    check(tag+': selecting and starting local battle preserves learning and resources',before==after)
                except Exception:
                    await page.screenshot(path=str(OUT/'failure.png'))
                    (OUT/'failure.txt').write_text(await page.locator('body').inner_text())
                    raise
                finally:await ctx.close()
        check('No application JavaScript exceptions',not errors,errors)
        (OUT/'verification.json').write_text(json.dumps({'pass':True,'sourceCommit':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'physicalDevice':False,'focusSetup':'--focus-setup' in sys.argv,'method':'WebKit iPhone/iPad emulation, actual integrated App and local synthetic-account API, reduced motion','checks':checks,'errors':errors},ensure_ascii=False,indent=2)+'\n')
        await browser.close()

asyncio.run(main())
