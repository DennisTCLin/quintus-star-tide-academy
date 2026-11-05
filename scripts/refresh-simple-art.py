"""Refresh only art cache keys and the local review gallery."""
from pathlib import Path
import json,re,subprocess

root=Path('outputs/creatures-simple')
assets=json.loads((root/'assets.json').read_text())['assets']
hashes={f['path'].removeprefix('public'):f['sha256'][:12] for a in assets for f in a['files']}
def replace(m):
    return m[1]+'?v='+hashes[m[1]]
for file in ['src/companions-wave-three.ts','src/monster-wave-five.ts']:
    p=Path(file);old=p.read_text()
    new=re.sub(r'(/assets/creatures-sixty/[^?" ]+)\?v=[a-f0-9]+',replace,old)
    assert re.sub(r'\?v=[a-f0-9]+','',new)==re.sub(r'\?v=[a-f0-9]+','',old)
    p.write_text(new)
page=Path('outputs/creatures-sixty/index.html').read_text()
page=re.sub(r'(/assets/creatures-sixty/[^?" ]+)\?v=[a-f0-9]+',replace,page)
page=page.replace('60 位新面孔，等你一起冒險。','60 隻角色，全新簡化立繪。').replace('STAR TIDE ACADEMY · 新圖鑑','STAR TIDE ACADEMY · 簡化版圖鑑')
(root/'index.html').write_text(page)
print('Refreshed 120 asset cache keys; character definitions otherwise identical.')
