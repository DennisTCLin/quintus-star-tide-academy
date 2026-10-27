from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import shutil,json,subprocess
from PIL import Image
ROOT=Path.cwd();SRC=ROOT/'outputs/feifei-companion';DEST=ROOT/'public/assets/feifei-bow/v1';DEST.mkdir(parents=True,exist_ok=True)
for p in (SRC/'animations-v1').glob('*'):shutil.copy2(p,DEST/p.name)
Image.open(SRC/'feifei-character-v3.png').convert('RGB').resize((640,640),Image.Resampling.LANCZOS).save(DEST/'portrait.jpg',quality=92)
assets=json.loads((SRC/'animation-assets.json').read_text())
def atlas(a):
 n=a['motion'];frames=int(a['duration']*10)
 subprocess.run(['ffmpeg','-v','error','-i',str(DEST/(n+'.mp4')),'-vf',f'fps=10,trim=end_frame={frames},scale=256:256:flags=lanczos,tile=layout=8x8:nb_frames=64','-q:v','4','-start_number','0','-y',str(DEST/(n+'-frames-%d.jpg'))],check=True)
 sheets=sorted(DEST.glob(n+'-frames-*.jpg'));assert len(sheets)==(frames+63)//64
 return 'bow:'+n,{'fps':10,'size':256,'columns':8,'perSheet':64,'frames':frames,'sheets':['/'+str(p.relative_to(ROOT/'public')) for p in sheets],'duration':frames/10}
manifest=ROOT/'src/data/companion-frames.json';data=json.loads(manifest.read_text())
with ThreadPoolExecutor(max_workers=3) as pool:data.update(dict(pool.map(atlas,assets)))
manifest.write_text(json.dumps(data,indent=2)+'\n')
print('Installed 12 clips, posters and bounded iPad frame atlases')
