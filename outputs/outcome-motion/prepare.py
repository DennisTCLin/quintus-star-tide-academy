import subprocess,json
from pathlib import Path
from PIL import Image,ImageDraw
out=Path('outputs/outcome-motion');public=Path('public/assets/outcome-motion-v1');public.mkdir(parents=True,exist_ok=True);manifest={}
for kind in ['victory','defeat']:
 source=out/f'{kind}-original.mp4';frames=out/kind;frames.mkdir(exist_ok=True)
 subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(source),'-t','4','-an','-vf','scale=960:540,fps=24','-c:v','libx264','-profile:v','main','-pix_fmt','yuv420p','-crf','25','-movflags','+faststart',str(public/f'{kind}.mp4')],check=True)
 subprocess.run(['ffmpeg','-y','-loglevel','error','-i',str(source),'-t','4','-vf','fps=8,scale=480:270',str(frames/'%03d.png')],check=True)
 imgs=[Image.open(p).convert('RGB') for p in sorted(frames.glob('*.png'))][:32]
 assert len(imgs)==32
 sheets=[]
 for n in range(2):
  sheet=Image.new('RGB',(1920,1080))
  for i,frame in enumerate(imgs[n*16:(n+1)*16]):sheet.paste(frame,((i%4)*480,(i//4)*270))
  name=f'{kind}-{n}.jpg';sheet.save(public/name,quality=78,optimize=True);sheets.append('/assets/outcome-motion-v1/'+name)
 imgs[-1].save(public/f'{kind}-poster.jpg',quality=88,optimize=True)
 contact=Image.new('RGB',(960,540))
 for i,k in enumerate([0,8,16,24]):contact.paste(imgs[k],((i%2)*480,(i//2)*270))
 contact.save(out/f'{kind}-contact.jpg')
 manifest[kind]={'fps':8,'size':480,'cellHeight':270,'columns':4,'perSheet':16,'frames':32,'sheets':sheets,'duration':4}
Path('src/data/outcome-frames.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({p.name:p.stat().st_size for p in public.iterdir()},indent=2))
