"""Inspect packed media only. Reports suspicious clips for visual review; does not alter art."""
import json,subprocess,hashlib
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
root=Path(__file__).parent;out=root/'media-audit';out.mkdir(exist_ok=True);ledger=json.loads((root/'matte-videos.json').read_text());rows=[]
for item in ledger:
 source=Path('public/assets/monsters/wave4')/f"{item['id']}-{item['action']}.mp4"
 if (out/f"{item['index']:03}.json").exists() and json.loads((out/f"{item['index']:03}.json").read_text())['sha256']==item['sha256'] and json.loads((out/f"{item['index']:03}.json").read_text()).get('auditVersion')==2:
  rows.append(json.loads((out/f"{item['index']:03}.json").read_text()));continue
 assert hashlib.sha256(source.read_bytes()).hexdigest()==item['sha256']
 data=subprocess.check_output(['ffmpeg','-v','error','-i',str(source),'-vf','scale=384:192','-f','rawvideo','-pix_fmt','rgb24','-']);frames=np.frombuffer(data,dtype=np.uint8).reshape(-1,192,384,3);color=frames[:,:,:192,:];alpha=np.clip((frames[:,:,192:,0].astype(float)-8)/239,0,1);flat=color.astype(float)*alpha[:,:,:,None]
 coverage=(alpha>.5).mean(axis=(1,2));border=np.concatenate([alpha[:,0,:],alpha[:,-1,:],alpha[:,:,0],alpha[:,:,-1]],axis=1)
 motion=np.abs(np.diff(flat,axis=0)).mean(axis=(1,2,3));pink=(np.minimum(color[:,:,:,0].astype(float),color[:,:,:,2])-color[:,:,:,1]>70)&(alpha>.85)
 flags=[]
 if coverage.mean()<.04:flags.append('little foreground')
 if coverage.min()<.01:flags.append('blank frames')
 if (border>.6).mean()>.03 or (border>.6).mean(axis=1).max()>.015:flags.append('possible cropping')
 if motion.max()<.15:flags.append('possibly frozen')
 if pink.mean()>.005:flags.append('pink contamination review')
 row={**item,'auditVersion':2,'peakBorderFraction':float((border>.6).mean(axis=1).max()),'meanCoverage':float(coverage.mean()),'borderFraction':float((border>.6).mean()),'maxMotion':float(motion.max()),'meanMotion':float(motion.mean()),'pinkFraction':float(pink.mean()),'flags':flags}
 sheet=Image.new('RGB',(192*4,220),'#103340');draw=ImageDraw.Draw(sheet)
 for column,idx in enumerate([0,len(frames)//3,len(frames)*2//3,len(frames)-1]):
  c=Image.fromarray(color[idx]);a=Image.fromarray((alpha[idx]*255).astype('uint8'));sheet.paste(c,(column*192,0),a)
 draw.text((8,197),f"{item['index']:03} {item['id']} {item['action']} {'; '.join(flags)}",fill='white');sheet.save(out/f"{item['index']:03}.jpg",quality=85)
 (out/f"{item['index']:03}.json").write_text(json.dumps(row,indent=2));rows.append(row)
(out/'results.json').write_text(json.dumps(rows,indent=2));print('audited',len(rows),'flagged',[(r['index'],r['flags']) for r in rows if r['flags']],flush=True)
for first in range(1,251,25):
 available=[r for r in rows if first<=r['index']<first+25]
 if len(available)!=25:continue
 sheet=Image.new('RGB',(192*5,220*5),'#103340');draw=ImageDraw.Draw(sheet)
 for n,r in enumerate(sorted(available,key=lambda r:r['index'])):
  frame=Image.open(out/f"{r['index']:03}.jpg").crop((192,0,384,192));x=n%5*192;y=n//5*220;sheet.paste(frame,(x,y));draw.text((x+4,y+195),f"{r['index']:03} {r['action']}",fill='white')
 sheet.save(out/f'contact-{first:03}.jpg',quality=85)
