"""Include new wave-4 media; restore byte-identical existing public assets by SHA256."""
from pathlib import Path
import tempfile,subprocess,shutil,json,hashlib
root=Path.cwd();base='7498f9f'
matte=json.loads((root/'outputs/monster-wave4/matte-videos.json').read_text())
assert len(matte)==150 and {r['index'] for r in matte}==set(range(1,151)), 'All 150 generated foreground masks must finish before release'
for row in matte:
 p=root/'public/assets/monsters/wave4'/f"{row['id']}-{row['action']}.mp4"
 assert row['format']=='rgb-alpha-side-by-side-h264' and row['width']==2*row['height']
 assert hashlib.sha256(p.read_bytes()).hexdigest()==row['sha256'],p
byindex={r['index']:r for r in matte}
motion=json.loads((root/'outputs/monster-wave4/all-motion/results.json').read_text())
expected={(engine,index) for engine in ['chromium','webkit'] for index in range(1,151)}
assert len(motion)==300 and {(r['engine'],r['index']) for r in motion}==expected, 'All 300 browser/media checks must finish'
assert all(r['sha256']==byindex[r['index']]['sha256'] for r in motion), 'Browser evidence is stale after media edits'
audit=json.loads((root/'outputs/monster-wave4/media-audit/results.json').read_text())
assert len(audit)==150 and {r['index'] for r in audit}==set(range(1,151)), 'Every video needs a frame audit'
assert all(r['sha256']==byindex[r['index']]['sha256'] for r in audit), 'Stale media audits'
assert not (root/'outputs/monster-wave4/credit-block.json').exists(), 'Unresolved production blocker'
manual=json.loads((root/'outputs/monster-wave4/manual-review.json').read_text()) if (root/'outputs/monster-wave4/manual-review.json').exists() else []
held={r['index'] for r in manual if r.get('state')=='awaiting-consolidated-review'}
assert len(held)==30
accepted_effects={r['index'] for r in manual if r.get('state')=='accepted-effect-only'}
assert accepted_effects=={4,38}
assert all(not r['flags'] or r['index'] in held|accepted_effects for r in audit),'Unreviewed visual issue'
# The runtime routing and packaged file set must agree exactly.
subprocess.run(['./node_modules/.bin/esbuild','src/monster-motion-policy.ts','--bundle','--platform=node','--format=esm','--outfile=/tmp/wave4-release-policy.mjs'],check=True,capture_output=True)
actual=json.loads(subprocess.check_output(['node','--input-type=module','-e',"import {MONSTER_CATALOG} from './build/game.mjs';import {hasMonsterMotion,monsterMotionSource} from '/tmp/wave4-release-policy.mjs';console.log(JSON.stringify(MONSTER_CATALOG.filter(m=>hasMonsterMotion(m.id)).map(m=>({id:m.id,actions:['entrance','idle','attack','hit','capture'].map(a=>({action:a,source:monsterMotionSource(m.id,a)}))}))))"]).decode())
assert len(actual)==30 and len({m['id'] for m in actual})==30
used={(m['id'],a['source']) for m in actual for a in m['actions']}
safe={(r['id'],r['action']) for r in matte if r['index'] not in held}
assert used==safe and len(used)==120,'Runtime references a held clip or omits reviewed media'
release_motion=json.loads((root/'outputs/monster-wave4/release-motion.json').read_text())
assert len(release_motion)==60 and {(r['engine'],r['index']) for r in release_motion}=={(e,i) for e in ['chromium','webkit'] for i in held}
assert all(r['sameCharacter'] and r['idleTransition'] for r in release_motion)

stage=Path(tempfile.mkdtemp(prefix='star-tide-wave4-'))
for name in ['dist','build','server']:shutil.copytree(root/name,stage/name)
for name in ['package.json','package-lock.json','server.mjs']:shutil.copy2(root/name,stage/name)
(stage/'src/data').mkdir(parents=True)
for name in ['interface-zhuyin.json','dragon-vocabulary.json']:shutil.copy2(root/'src/data'/name,stage/'src/data'/name)
shutil.copy2(root/'outputs/quiz-victory/release-Dockerfile',stage/'Dockerfile')
shutil.copy2(root/'outputs/quiz-victory/release-restore-assets.mjs',stage/'restore-assets.mjs')
(stage/'railway.json').write_text(json.dumps({'build':{'builder':'DOCKERFILE'},'deploy':{'healthcheckPath':'/healthz','healthcheckTimeout':300,'restartPolicyType':'ON_FAILURE','restartPolicyMaxRetries':3}}))
def entry(p,base):
 b=p.read_bytes();return {'path':p.relative_to(base).as_posix(),'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()}
# Remove deferred portraits and quarantined videos from the upload, not from the source archive.
allowed={f"{m['id']}{suffix}.webp" for m in actual for suffix in ['', '-320']}|{f'{id}-{action}.mp4' for id,action in used}
for p in (stage/'dist/assets/monsters/wave4').glob('*'):
 if p.name not in allowed:p.unlink()
allfiles=[entry(p,stage/'dist') for p in (stage/'dist').rglob('*') if p.is_file()];preserved=[]
for name in subprocess.check_output(['git','ls-tree','-r','--name-only','-z',base,'--','public']).decode().split('\0'):
 if not name:continue
 p=root/name;rel=p.relative_to(root/'public');target=stage/'dist'/rel
 original=subprocess.check_output(['git','show',base+':'+name]);assert p.read_bytes()==original,name
 assert target.read_bytes()==original,name
 preserved.append(entry(p,root/'public'));target.unlink()
new=list((stage/'dist/assets/monsters/wave4').glob('*'));assert len(new)==180,len(new)
assert sum(p.suffix=='.mp4' for p in new)==120
(stage/'preserved-assets.json').write_text(json.dumps(preserved))
byname={p['path']:p for p in preserved}
for item in allfiles:assert (byname[item['path']] if item['path'] in byname else entry(stage/'dist'/item['path'],stage/'dist'))==item
manifest={'commit':subprocess.check_output(['git','rev-parse','HEAD']).decode().strip(),'stage':str(stage),'releasedCreatures':30,'safeVideos':120,'heldOriginalClips':sorted(held),'backupActions':30,'preservedFiles':len(preserved),'newMediaFiles':len(new),'validatedDistFiles':len(allfiles),'dist':allfiles}
Path('/tmp/star-tide-wave4-release.json').write_text(json.dumps(manifest,indent=2));print(str(stage));print(len(preserved),'preserved;',len(new),'new;',len(allfiles),'verified')
