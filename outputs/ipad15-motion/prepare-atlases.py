from pathlib import Path
import subprocess,json,math,tempfile,hashlib
root=Path.cwd();dest=root/'public/assets/companion-frames-v1';dest.mkdir(parents=True,exist_ok=True)
manifest={};fps=12;size=256;cols=8;per_sheet=64
for mascot in ['dog','tideglow']:
 for motion in ['pet','feed','play','highfive','bubbles','rest']:
  source=root/'public/assets'/('olivia-dog/actions-v2' if mascot=='dog' else 'tideglow-guide/actions-v2' if motion in ['highfive','bubbles','rest'] else 'tideglow-guide')/(motion+'.mp4')
  folder=dest/mascot;folder.mkdir(exist_ok=True)
  with tempfile.TemporaryDirectory() as temp:
   subprocess.run(['ffmpeg','-v','error','-i',str(source),'-vf',f'fps={fps},scale={size}:{size}',str(Path(temp)/'%04d.png')],check=True)
   frames=sorted(Path(temp).glob('*.png'));sheets=[]
   for index,start in enumerate(range(0,len(frames),per_sheet)):
    count=min(per_sheet,len(frames)-start);name=f'{motion}-{index}.jpg';target=folder/name
    subprocess.run(['ffmpeg','-v','error','-start_number',str(start+1),'-i',str(Path(temp)/'%04d.png'),'-vf',f'tile={cols}x{math.ceil(count/cols)}:nb_frames={count}','-frames:v','1','-q:v','3','-y',str(target)],check=True)
    sheets.append('/'+str(target.relative_to(root/'public')))
   manifest[f'{mascot}:{motion}']={'fps':fps,'size':size,'columns':cols,'perSheet':per_sheet,'frames':len(frames),'sheets':sheets,'duration':len(frames)/fps}
  print(mascot,motion,len(frames),flush=True)
(root/'src/data/companion-frames.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('bytes',sum(p.stat().st_size for p in dest.rglob('*.jpg')))
