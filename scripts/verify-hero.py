import json, sys, os
from pathlib import Path
from playwright.sync_api import sync_playwright

url = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:4193'
auth = {}
if os.environ.get('CLOUD_STORAGE_STATE'):
    state = json.loads(Path(os.environ['CLOUD_STORAGE_STATE']).read_text())
    state['origins'] = []  # Keep login cookies; start a fresh animation shuffle bag.
    auth = {'storage_state': state}
out = Path('outputs')
out.mkdir(exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, channel='chrome')
    context = browser.new_context(**auth, viewport={'width':1440,'height':1000})
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.goto(url, wait_until='networkidle')
    print('buttons', page.get_by_role('button').all_text_contents())
    page.wait_for_function("() => !!document.querySelector('video.ready') && !document.querySelector('video').paused")
    first = page.locator('.hero-route-tabs button.active').get_attribute('aria-label')
    time = page.locator('video').evaluate('(v) => v.currentTime')
    page.wait_for_timeout(400)
    assert page.locator('video').evaluate('(v) => v.currentTime') > time
    assert page.locator('.hero-route-tabs button').count() == 6
    assert page.locator('.profile-card').count() == 4
    page.screenshot(path=str(out/'hero-six-desktop.png'), full_page=True)
    # Six fresh visits consume one shuffle bag. Stop before autoplay consumes the shot.
    openings = [first]
    for _ in range(5):
        page.reload(wait_until='networkidle')
        openings.append(page.locator('.hero-route-tabs button.active').get_attribute('aria-label'))
    assert len(set(openings)) == 6, openings
    page.reload(wait_until='networkidle')
    assert page.locator('.hero-route-tabs button.active').get_attribute('aria-label') != openings[-1]
    # Each asset decodes, shows visible frames and advances, including the three new clips.
    for i in range(6):
        page.locator('.hero-route-tabs button').nth(i).click()
        page.wait_for_function("() => !!document.querySelector('video.ready') && document.querySelector('video').currentTime > 0.1")
        assert page.locator('video').evaluate('(v) => v.videoWidth > 0 && !v.paused')
    page.get_by_role('button', name='Ⅱ 暫停動態', exact=True).click()
    assert page.locator('video').count() == 0
    page.get_by_role('button', name='▶ 播放動態', exact=True).click()
    page.wait_for_function("() => !!document.querySelector('video.ready') && !document.querySelector('video').paused")
    # Let a clip finish naturally and observe transition.
    page.locator('.hero-route-tabs button').nth(0).click()
    page.wait_for_function("() => !!document.querySelector('video.ready')")
    page.locator('video').evaluate('(v) => { v.currentTime = v.duration - 0.3 }')
    page.wait_for_function("() => document.querySelector('.hero-route-tabs button.active').getAttribute('aria-label').includes('第 2 段')")
    page.get_by_role('button', name='選擇Quintus，4年級', exact=True).click()
    page.wait_for_selector('.family-hero video.ready')
    assert page.locator('.family-hero video').evaluate('(v) => !v.paused')
    # Mobile, still with real decoding and all six controls reachable.
    mobile = browser.new_context(**auth, viewport={'width':390,'height':844}, is_mobile=True, device_scale_factor=1)
    mp = mobile.new_page()
    mp.goto(url, wait_until='networkidle')
    mp.wait_for_selector('video.ready')
    assert '-mobile.mp4' in mp.locator('video').get_attribute('src')
    assert mp.evaluate('document.documentElement.scrollWidth <= innerWidth')
    mp.screenshot(path=str(out/'hero-six-mobile.png'), full_page=True)
    for i in range(6):
        mp.locator('.hero-route-tabs button').nth(i).click()
        mp.wait_for_function("() => !!document.querySelector('video.ready') && document.querySelector('video').currentTime > 0.1")
    mp.get_by_role('button', name='選擇Quintus，4年級', exact=True).click()
    mp.wait_for_selector('.family-hero video.ready')
    assert mp.evaluate('document.documentElement.scrollWidth <= innerWidth')
    for width in [320, 390, 720]:
        mp.set_viewport_size({'width':width,'height':844})
        for i in range(6):
            mp.locator('.hero-route-tabs button').nth(i).click()
            mp.wait_for_function("() => !!document.querySelector('video.ready') && document.querySelector('video').currentTime > 0.1")
        mp.get_by_role('button', name='暫停首頁航線影片', exact=True).click()
        assert mp.locator('video').evaluate('(v) => v.paused')
        mp.get_by_role('button', name='播放首頁航線影片', exact=True).click()
        mp.wait_for_function("() => !document.querySelector('video').paused")
        assert mp.evaluate('document.documentElement.scrollWidth <= innerWidth')
    mp.set_viewport_size({'width':390,'height':844})
    mp.screenshot(path=str(out/'hero-six-harbor-mobile.png'), full_page=True)
    reduced = browser.new_context(**auth, reduced_motion='reduce')
    rp = reduced.new_page()
    requests = []
    rp.on('request', lambda r: requests.append(r.url))
    rp.goto(url, wait_until='networkidle')
    assert rp.locator('video').count() == 0
    assert not any('.mp4' in u for u in requests)
    # Storage exception only for animation preferences; preserve player data behavior.
    blocked = browser.new_context(**auth)
    bp = blocked.new_page()
    bp.add_init_script("""const g = Storage.prototype.getItem, s = Storage.prototype.setItem;
      Storage.prototype.getItem = function(k) { if(k === 'star-tide.hero-visit.v1') throw new Error('blocked'); return g.call(this,k) };
      Storage.prototype.setItem = function(k,v) { if(k === 'star-tide.hero-visit.v1') throw new Error('blocked'); return s.call(this,k,v) };""")
    bp.goto(url, wait_until='networkidle')
    bp.wait_for_selector('video.ready')
    assert bp.locator('.profile-card').count() == 4
    # A failed video must retain the poster and allow choosing a working scene.
    failure = browser.new_context(**auth)
    fp = failure.new_page()
    fp.route('**/*desktop.mp4*', lambda route: route.abort())
    fp.goto(url, wait_until='networkidle')
    assert fp.locator('video').count() == 0
    assert fp.locator('.hero-poster img').evaluate('(img) => img.complete && img.naturalWidth > 0')
    assert not errors, errors
    print(json.dumps({'openings':openings,'desktop_mobile_six_clips':'PASS','pause_resume':'PASS','autoadvance':'PASS','reduced_motion':'PASS','storage_fallback':'PASS','video_error_poster':'PASS','console_errors':errors}, ensure_ascii=False))
    browser.close()
