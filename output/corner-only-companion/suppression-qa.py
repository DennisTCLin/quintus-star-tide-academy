from pathlib import Path
import os,json
os.environ['QA_URL']=os.getenv('CORNER_QA_URL','http://127.0.0.1:47892')
ns={};exec(Path('output/floating-companion/browser-qa.py').read_text().split('with sync_playwright() as pw:')[0].replace("wait_until='networkidle'","wait_until='domcontentloaded',timeout=45000"),ns)
rows=[]
with ns['sync_playwright']() as pw:
 for engine in ['webkit','chromium']:
  b=getattr(pw,engine).launch()
  for w,h in [(390,844),(1024,768)]:
   c,p=ns['setup'](b,'dog',w,h)
   p.locator('.harbor-departure-start').click();ns['expect'](p.locator('.family-dialog')).to_be_visible();ns['expect'](p.locator('.tide-launch')).to_have_count(0)
   p.keyboard.press('Escape');ns['expect'](p.locator('.tide-launch')).to_be_visible()
   p.locator('.family-nav button').nth(2).click();ns['expect'](p.locator('.tide-launch')).to_have_count(0)
   p.locator('.family-nav button').first.click();ns['expect'](p.locator('.tide-launch')).to_be_visible()
   rows.append({'engine':engine,'viewport':[w,h],'coursePickerSuppressed':True,'leaderboardSuppressed':True,'homeRestores':True});c.close()
  b.close()
assert not ns['commands'] and not ns['errors']
Path('output/corner-only-companion/suppression-results.json').write_text(json.dumps(rows,indent=2)+'\n')
print('PASS 4 overlay/navigation suppression flows')
