import json,subprocess
from pathlib import Path
import numpy as np
root=Path(__file__).parent;rows=json.loads((root/'media-audit/results.json').read_text());out=[]
for r in rows:
 if not r['flags'] or r['action'] not in ['entrance','capture']:continue
 p=Path('public/assets/monsters/wave4')/f"{r['id']}-{r['action']}.mp4";raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-vf','scale=384:192','-f','rawvideo','-pix_fmt','rgb24','-']);f=np.frombuffer(raw,dtype='uint8').reshape(-1,192,384,3);a=f[:,:,192:,0]>151;border=np.concatenate([a[:,0,:],a[:,-1,:],a[:,:,0],a[:,:,-1]],axis=1).mean(axis=1);valid=border<.01;ranges=[];start=None
 for i,v in enumerate([*valid,False]):
  if v and start is None:start=i
  if not v and start is not None:
   if i-start>=12:ranges.append([round(start/12,3),round(i/12,3)])
   start=None
 out.append({'index':r['index'],'action':r['action'],'clearSegments':ranges});print(out[-1])
(root/'trim-candidates.json').write_text(json.dumps(out,indent=2)+'\n')
