import json
from pathlib import Path
from urllib.request import urlopen
from concurrent.futures import ThreadPoolExecutor
root=Path('outputs/creatures-unified');(root/'sources').mkdir(exist_ok=True)
def fetch(job):
    path=root/'sources'/f"sheet-{job.get('sourceIndex',job['index']):02}.png"
    if path.exists():return
    assert job['status']=='completed'
    with urlopen(job['result_url'],timeout=90) as response:data=response.read()
    assert data.startswith(b'\x89PNG'),job['index']
    path.write_bytes(data)
jobs=json.loads((root/'results.json').read_text())
with ThreadPoolExecutor(max_workers=4) as pool:list(pool.map(fetch,jobs))
print('Downloaded',len(jobs),'sheets')
