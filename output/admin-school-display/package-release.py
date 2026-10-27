"""Package verified build; restore unchanged public media by SHA256 during Docker build."""
from pathlib import Path
import tempfile,subprocess,shutil,json,hashlib
root=Path.cwd();stage=Path(tempfile.mkdtemp(prefix='star-tide-admin-school-'))
assert not subprocess.check_output(['git','diff','62a4b2c','HEAD','--','public'])
for name in ['dist','build','server']:shutil.copytree(root/name,stage/name)
for name in ['package.json','package-lock.json','server.mjs']:shutil.copy2(root/name,stage/name)
(stage/'src/data').mkdir(parents=True)
for name in ['interface-zhuyin.json','dragon-vocabulary.json']:shutil.copy2(root/'src/data'/name,stage/'src/data'/name)
shutil.copy2(root/'outputs/quiz-victory/release-Dockerfile',stage/'Dockerfile')
shutil.copy2(root/'outputs/quiz-victory/release-restore-assets.mjs',stage/'restore-assets.mjs')
(stage/'railway.json').write_text(json.dumps({'build':{'builder':'DOCKERFILE'},'deploy':{'healthcheckPath':'/healthz','healthcheckTimeout':300,'restartPolicyType':'ON_FAILURE','restartPolicyMaxRetries':3}}))
def entry(p,base):
 b=p.read_bytes();return {'path':p.relative_to(base).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
allfiles=[entry(p,root/'dist') for p in (root/'dist').rglob('*') if p.is_file()];preserved=[]
for name in subprocess.check_output(['git','ls-files','-z','public']).decode().split('\0'):
 if not name:continue
 p=root/name;rel=p.relative_to(root/'public');target=stage/'dist'/rel
 assert target.read_bytes()==p.read_bytes(),name
 preserved.append(entry(p,root/'public'));target.unlink()
(stage/'preserved-assets.json').write_text(json.dumps(preserved))
byname={p['path']:p for p in preserved}
for item in allfiles:
 assert (byname[item['path']] if item['path'] in byname else entry(stage/'dist'/item['path'],stage/'dist'))==item
manifest={'commit':subprocess.check_output(['git','rev-parse','HEAD']).decode().strip(),'stage':str(stage),'preservedFiles':len(preserved),'validatedDistFiles':len(allfiles),'dist':allfiles}
Path('/tmp/admin-school-release.json').write_text(json.dumps(manifest,indent=2));print(str(stage));print(len(preserved),'preserved;',len(allfiles),'verified')
