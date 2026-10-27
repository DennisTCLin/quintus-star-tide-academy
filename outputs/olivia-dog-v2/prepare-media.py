from pathlib import Path
import subprocess,json
from PIL import Image
ROOT=Path.cwd();OUT=ROOT/'public/assets/olivia-dog/actions-v2'
for src in (ROOT/'outputs/olivia-dog-v2/source').glob('*.mp4'):
 name=src.stem;dest=OUT/(name+'.mp4')
 if name=='rest':
  args=['-ss','1.6','-i',str(src),'-filter_complex','[0:v]scale=640:640,fps=24,split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1:a=0[v]','-map','[v]']
 else:args=['-i',str(src),'-vf','scale=640:640,fps=24']
 subprocess.run(['ffmpeg','-v','error',*args,'-an','-c:v','libx264','-crf','23','-pix_fmt','yuv420p','-movflags','+faststart','-y',str(dest)],check=True)
 subprocess.run(['ffmpeg','-v','error','-ss','1.8','-i',str(dest),'-frames:v','1','-q:v','3','-y',str(OUT/(name+'.jpg'))],check=True)
image=Image.open(ROOT/'outputs/olivia-dog-v2/source/icons.png').convert('RGB').resize((768,512),Image.Resampling.LANCZOS)
image.save(ROOT/'public/assets/companion-ui/care-actions-v2.webp',quality=92)
print('Prepared',len(list(OUT.glob('*.mp4'))),'clips and posters; shared icon atlas ready')
