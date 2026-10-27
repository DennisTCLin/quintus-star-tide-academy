"""Anonymous production checks; browser-local request aborts do not alter service state."""
from playwright.sync_api import sync_playwright,expect
from pathlib import Path
from urllib.parse import urlparse, urljoin
import json,re,os
out=Path('outputs/voice-battle-release');site=os.environ.get('QA_RECOVERY_SITE','https://quintus-star-tide-academy-production.up.railway.app/');prefix=os.environ.get('QA_RECOVERY_PREFIX','production');checks=[]
def check(name,ok=True,detail=None):
 assert ok,name
 checks.append({'name':name,'pass':True,'detail':detail});print('PASS',name,flush=True)
with sync_playwright() as pw:
 b=pw.webkit.launch()
 c=b.new_context(**pw.devices['iPad (gen 7)']);p=c.new_page();media=[];errors=[];p.on('request',lambda r:media.append(r.url) if urlparse(r.url).path.endswith('.mp4') else None);p.on('pageerror',lambda e:errors.append(e.message))
 p.goto(site+'?safe=1');expect(p.get_by_role('button',name='登入，繼續冒險 →',exact=True)).to_be_visible(timeout=20000);expect(p.locator('.safe-mode-notice')).to_be_visible();p.wait_for_timeout(5000);check('Safe iPad entry renders login with explicit mode notice');check('Safe mode requests no videos',len(media)==0,media);check('Safe page has no runtime errors',not errors,errors);check('Safe page has no horizontal overflow',p.evaluate('document.documentElement.scrollWidth<=innerWidth'));p.screenshot(path=str(out/f'{prefix}-ipad-safe.png'))
 p.locator('.safe-mode-notice a').click();expect(p.locator('.safe-mode-notice')).to_have_count(0);expect(p.get_by_role('button',name='登入，繼續冒險 →',exact=True)).to_be_visible();check('Exit returns to normal URL',urlparse(p.url).query=='');c.close()
 c=b.new_context(**pw.devices['iPad (gen 7)']);p=c.new_page();p.route(re.compile(r'/assets/index\.v-[^/]+\.js'),lambda route:route.abort())
 p.goto(site);expect(p.get_by_role('heading',name='星潮學院',exact=True)).to_be_visible(timeout=20000);expect(p.get_by_role('link',name='用輕量模式開啟',exact=True)).to_be_visible();check('Blocked entry still shows readable static recovery');p.screenshot(path=str(out/f'{prefix}-ipad-entry-fallback.png'));p.unroute_all();p.get_by_role('link',name='用輕量模式開啟',exact=True).click();expect(p.get_by_role('button',name='登入，繼續冒險 →',exact=True)).to_be_visible(timeout=20000);check('Entry recovery retries script and reaches safe login');c.close()
 c=b.new_context(**pw.devices['iPad (gen 7)']);p=c.new_page();p.add_init_script("if (!location.search.includes('safe=1')) { window.matchMedia = () => { throw new Error('Synthetic browser-local render failure'); }; }")
 p.goto(site);expect(p.get_by_role('heading',name='航程暫時打不開',exact=True)).to_be_visible(timeout=20000);expect(p.get_by_role('button',name='重新載入',exact=True)).to_be_visible();check('Render failure shows working recovery actions',p.get_by_role('link',name='用輕量模式開啟',exact=True).get_attribute('href')==urljoin(site, '?safe=1'));p.screenshot(path=str(out/f'{prefix}-ipad-recovery.png'));p.get_by_role('link',name='用輕量模式開啟',exact=True).click();expect(p.get_by_role('button',name='登入，繼續冒險 →',exact=True)).to_be_visible(timeout=20000);check('Render recovery actually restarts application in safe mode');c.close();b.close()
result={'site':site,'noAccountAccess':True,'checks':checks,'pass':True,'physicalDevice':'Not tested; WebKit iPad emulation only'};(out/f'{prefix}-recovery-browser.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
