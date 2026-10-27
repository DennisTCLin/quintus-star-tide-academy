from pathlib import Path
import json
from PIL import Image,ImageChops
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent;assets=json.loads((ROOT/'animation-assets.json').read_text());checks=[]
for a in assets:
 s=a['sprite'];im=Image.open(ROOT/s['file']);assert im.size==(s['columns']*320,s['rows']*320)
 def crop(n):return im.crop(((n%8)*320,(n//8)*320,(n%8+1)*320,(n//8+1)*320))
 assert ImageChops.difference(crop(0),crop(s['frameCount']//2)).getbbox() is not None
 checks.append({'motion':a['motion'],'spriteDimensionsAndChangingFrames':'PASS'})
with sync_playwright() as pw:
 for engine in ['webkit','chromium']:
  b=pw.webkit.launch() if engine=='webkit' else pw.chromium.launch(channel='chrome',headless=True)
  p=b.new_page();p.goto('http://127.0.0.1:47639/preview.html',wait_until='networkidle')
  for a in assets:
   v=p.locator('video[src="'+a['video']+'"]');v.scroll_into_view_if_needed();v.evaluate('(v)=>v.play()')
   p.wait_for_function('src=>{const v=document.querySelector(`video[src="${src}"]`);return v.currentTime>.15&&v.videoWidth===640&&v.readyState>=2}',arg=a['video'])
   v.evaluate('(v)=>v.pause()');checks.append({'engine':engine,'motion':a['motion'],'decodedPlayback':'PASS'})
  b.close()
(ROOT/'animation-verification.json').write_text(json.dumps({'pass':True,'checks':checks,'physicalIPad':False,'websiteIntegration':False},ensure_ascii=False,indent=2));print(len(checks),'checks PASS')
