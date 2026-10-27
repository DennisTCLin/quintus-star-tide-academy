"""Each suite gets a newly created task-owned local DB; never share or reuse player databases."""
from pathlib import Path
import concurrent.futures, json, os, re, subprocess
OUT=Path('outputs/monster-wave4/database');OUT.mkdir(parents=True,exist_ok=True);PG='/opt/homebrew/opt/postgresql@17/bin/'
files=[x['file'] for x in json.loads(Path('output/jeremy-math-integration/database-tests.json').read_text())]
def run(pair):
    index,file=pair;db=f'star_tide_wave4_test_{index:02d}_20261026'
    subprocess.run([PG+'createdb','-h','127.0.0.1','-p','55432',db],check=True,capture_output=True)
    try:
        result=subprocess.run(['npm','test','--',file],capture_output=True,text=True,env={**os.environ,'TEST_DATABASE_URL':f'postgresql://127.0.0.1:55432/{db}','NO_COLOR':'1','FORCE_COLOR':'0'})
        raw=result.stdout+result.stderr
        (OUT/f'db-{index:02d}.txt').write_text(raw)
        match=re.search(r'Tests\s+(\d+) passed',raw)
        row={'file':file,'exitCode':result.returncode,'passed':int(match[1]) if match else 0,'database':db}
        print(json.dumps(row),flush=True)
        return row
    finally:subprocess.run([PG+'dropdb','-h','127.0.0.1','-p','55432',db],check=True,capture_output=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:rows=list(pool.map(run,enumerate(files)))
(OUT/'database-tests.json').write_text(json.dumps(rows,indent=2)+'\n')
assert len(rows)==23 and all(r['exitCode']==0 and r['passed']>0 for r in rows)
print('PASS',len(rows),'isolated suites',sum(r['passed'] for r in rows),'tests')
