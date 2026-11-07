import pathlib,subprocess,os,json,uuid,re
root=pathlib.Path.cwd();out=root/'output/finals131/cloud-per-file';out.mkdir(exist_ok=True)
minimal={k:v for k,v in os.environ.items() if k in ['PATH','HOME','TMPDIR','LANG','LC_ALL','SHELL']};minimal.update(NO_COLOR='1',CI='1')
files=[p for p in sorted((root/'src/__tests__').glob('*test.mjs')) if 'TEST_DATABASE_URL' in p.read_text()]
results=[]
for file in files:
 name='f131_clean_'+uuid.uuid4().hex[:12]
 subprocess.run(['createdb','-h','127.0.0.1','-p','55931','-U','finals131_test','--no-password',name],check=True,capture_output=True)
 env={**minimal,'TEST_DATABASE_URL':f'postgresql://finals131_test@127.0.0.1:55931/{name}'}
 log=out/(file.stem+'.log')
 with log.open('w') as f:r=subprocess.run(['npx','vitest','run','--no-file-parallelism',str(file.relative_to(root))],cwd=root,env=env,stdout=f,stderr=subprocess.STDOUT)
 text=log.read_text();passed=re.findall(r'Tests\s+(\d+) passed',text)
 entry={'file':file.name,'exitCode':r.returncode,'passedTests':int(passed[-1]) if passed else None,'database':name,'freshDatabasePerFile':True,'log':str(log.relative_to(root))};results.append(entry);print(entry,flush=True)
 summary={'runAgainst':'working tree test corrections on unchanged1437cee product code','expectedFiles':len(files),'completedFiles':len(results),'allPassed':len(results)==len(files) and all(x['exitCode']==0 for x in results),'passedTests':sum(x['passedTests'] or 0 for x in results),'results':results}
 (out/'results.json').write_text(json.dumps(summary,indent=2)+'\n')
 if r.returncode:break
