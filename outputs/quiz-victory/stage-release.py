import shutil,subprocess,tempfile,json,hashlib
from pathlib import Path
root=Path.cwd(); stage=Path(tempfile.mkdtemp(prefix='star-tide-victory-release-'))
for name in ['dist','build','server']:shutil.copytree(root/name,stage/name)
for name in ['server.mjs','package.json','package-lock.json']:shutil.copy2(root/name,stage/name)
(stage/'src/data').mkdir(parents=True)
for name in ['interface-zhuyin.json','dragon-vocabulary.json']:shutil.copy2(root/'src/data'/name,stage/'src/data'/name)
shutil.copy2(root/'outputs/quiz-victory/release-Dockerfile',stage/'Dockerfile')
shutil.copy2(root/'outputs/quiz-victory/release-restore-assets.mjs',stage/'restore-assets.mjs')
(stage/'railway.json').write_text(json.dumps({'build':{'builder':'DOCKERFILE','dockerfilePath':'Dockerfile'},'deploy':{'healthcheckPath':'/healthz','healthcheckTimeout':300,'restartPolicyType':'ON_FAILURE'}}))
# Restore only files identical to the already published battle release.
old=set(subprocess.check_output(['git','ls-tree','-r','--name-only','4df3f84','--','public/assets'],text=True).splitlines())
changed=set(subprocess.check_output(['git','diff','--name-only','4df3f84','--','public/assets'],text=True).splitlines())
items=[]
for name in sorted(old-changed):
 p=stage/'dist'/name.removeprefix('public/')
 if not p.is_file():continue
 b=p.read_bytes();items.append({'path':name.removeprefix('public/'),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()});p.unlink()
(stage/'preserved-assets.json').write_text(json.dumps(items))
manifest={item['path']:item for item in items}
validated=0
for source in (root/'dist').rglob('*'):
 if not source.is_file():continue
 rel=source.relative_to(root/'dist').as_posix();data=source.read_bytes();target=stage/'dist'/rel
 if rel in manifest:
  item=manifest[rel]
  assert not target.exists() and item['bytes']==len(data) and item['sha256']==hashlib.sha256(data).hexdigest(),rel
 else:assert target.read_bytes()==data,rel
 validated+=1
Path('outputs/quiz-victory/stage.json').write_text(json.dumps({'path':str(stage),'preservedFiles':len(items),'validatedDistFiles':validated,'runtimeBytes':sum(p.stat().st_size for p in stage.rglob('*') if p.is_file()),'commit':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()},indent=2))
print(Path('outputs/quiz-victory/stage.json').read_text())
