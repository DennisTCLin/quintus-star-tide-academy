from pathlib import Path
import subprocess, json, urllib.request, hashlib
ROOT=Path.cwd(); OUT=ROOT/'outputs/tideglow-actions-v2'; SOURCE=OUT/'source'; SOURCE.mkdir(exist_ok=True)
PUBLIC=ROOT/'public/assets/tideglow-guide/actions-v2'; PUBLIC.mkdir(exist_ok=True)
data=json.loads((OUT/'generation.json').read_text())
for job in data['completed']:
 name=data['actions'][job['index']][0]; src=SOURCE/(name+'.mp4')
 if not src.exists():urllib.request.urlretrieve(job['result_url'],src)
 subprocess.run(['ffmpeg','-v','error','-i',str(src),'-vf','fps=2,scale=200:200,tile=5x2','-frames:v','1','-y',str(OUT/(name+'-generated-contact.png'))],check=True)
 if name=='rest':
  args=['-ss',str(data.get('restTrimSeconds',2.0)),'-i',str(src),'-filter_complex','[0:v]scale=640:640,fps=24,split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1:a=0[v]','-map','[v]']
 else:args=['-i',str(src),'-vf','scale=640:640,fps=24']
 dest=PUBLIC/(name+'.mp4')
 subprocess.run(['ffmpeg','-v','error',*args,'-an','-c:v','libx264','-crf','23','-pix_fmt','yuv420p','-movflags','+faststart','-y',str(dest)],check=True)
 subprocess.run(['ffmpeg','-v','error','-ss','1.8','-i',str(dest),'-frames:v','1','-q:v','3','-y',str(PUBLIC/(name+'.jpg'))],check=True)
for name in ['pet','feed','play']:
 subprocess.run(['ffmpeg','-v','error','-ss','2.0','-i',str(PUBLIC.parent/(name+'.mp4')),'-frames:v','1','-q:v','3','-y',str(PUBLIC/(name+'.jpg'))],check=True)
data['assets']=[{'path':str(p.relative_to(ROOT)),'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(PUBLIC.glob('*'))]
(OUT/'generation.json').write_text(json.dumps(data,ensure_ascii=False,indent=2))
