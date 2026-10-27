"""Show boundary-peak frames for human review; does not alter media."""
import json,subprocess
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
root=Path(__file__).parent;out=root/'media-audit';rows=[r for r in json.loads((out/'results.json').read_text()) if r['flags']]
for batch in range(0,len(rows),6):
 sheet=Image.new('RGB',(192*4,220*6),'#103340');d=ImageDraw.Draw(sheet)
 for n,r in enumerate(rows[batch:batch+6]):
  source=Path('public/assets/monsters/wave4')/f"{r['id']}-{r['action']}.mp4";raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(source),'-vf','scale=384:192','-f','rawvideo','-pix_fmt','rgb24','-']);f=np.frombuffer(raw,dtype='uint8').reshape(-1,192,384,3);a=np.clip((f[:,:,192:,0].astype(float)-8)/239,0,1);border=np.concatenate([a[:,0,:],a[:,-1,:],a[:,:,0],a[:,:,-1]],axis=1);peak=int((border>.6).mean(axis=1).argmax())
  for c,k in enumerate([0,max(0,peak-2),peak,len(f)-1]):sheet.paste(Image.fromarray(f[k,:,:192]),(c*192,n*220),Image.fromarray((a[k]*255).astype('uint8')))
  d.text((4,n*220+194),f"{r['index']:03} {r['action']} peak {peak/12:.2f}s / {r['peakBorderFraction']:.3f}",fill='white')
 sheet.save(out/f'peaks-{batch//6+1:02}.jpg',quality=85)
print('contact sheets', (len(rows)+5)//6)
