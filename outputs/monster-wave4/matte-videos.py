"""Local video foreground masks. One RGB+alpha H.264 movie is synchronized by construction.
BiRefNet-General-Lite source: https://github.com/danielgatis/rembg (MIT).
Only generated video frames are processed; existing player media is never read.
"""
from pathlib import Path
import os,time,json,hashlib,subprocess,sys
import numpy as np
from PIL import Image
root=Path(__file__).parent;out=Path('public/assets/monsters/wave4')
exec((root/'key-background.py').read_text())
plan=json.loads((root/'plan.json').read_text());ledger=root/'matte-videos.json'
model=Path('/tmp/star-tide-wave4-birefnet.onnx')
assert hashlib.md5(model.read_bytes()).hexdigest()=='4fab47adc4ff364be1713e97b7e66334'
provider=os.environ.get('WAVE4_MATTE_PROVIDER','CPU')
if provider=='MPS':
 os.environ['PYTORCH_ENABLE_MPS_FALLBACK']='1'
 import torch
 from transformers import AutoModelForImageSegmentation
 weights=Path('/tmp/star-tide-wave4-birefnet-torch');assert hashlib.sha256((weights/'model.safetensors').read_bytes()).hexdigest()=='4417d89795250e698c3cb0ae8df15743810065f646f48a694fdfa7ca052d0815'
 torch.set_num_threads(4)
 session=AutoModelForImageSegmentation.from_pretrained(str(weights),trust_remote_code=True,local_files_only=True).eval().to('mps')
 def infer(x):
  with torch.inference_mode():return session(torch.from_numpy(x.copy()).to('mps'))[-1].sigmoid().cpu().numpy()[0,0]
else:
 import onnxruntime as ort
 opt=ort.SessionOptions();opt.intra_op_num_threads=4;opt.inter_op_num_threads=1
 session=ort.InferenceSession(str(model),sess_options=opt,providers=['CPUExecutionProvider']);name=session.get_inputs()[0].name
 def infer(x):
  logits=session.run(None,{name:x})[0][0,0];return 1/(1+np.exp(-np.clip(logits,-30,30)))
mean=np.array([.485,.456,.406],dtype='float32');std=np.array([.229,.224,.225],dtype='float32')
size=480;fps=12
print('model ready',provider,flush=True)
def pack(index):
 m=plan['items'][(index-1)//5];action=m['animations'][(index-1)%5];source=root/'source'/f'video-{index:03}.mp4';dest=out/f"{m['id']}-{action}.mp4";temp=dest.with_suffix('.matte-part.mp4')
 decoder=subprocess.Popen(['ffmpeg','-v','error','-i',str(source),'-vf',f'scale={size}:{size},fps={fps}','-f','rawvideo','-pix_fmt','rgb24','-'],stdout=subprocess.PIPE)
 encoder=subprocess.Popen(['ffmpeg','-v','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s',f'{size*2}x{size}','-r',str(fps),'-i','-','-c:v','libx264','-profile:v','baseline','-pix_fmt','yuv420p','-crf','19','-preset','fast','-an','-movflags','+faststart',str(temp)],stdin=subprocess.PIPE)
 count=0;start=time.time();areas=[]
 try:
  while True:
   raw=decoder.stdout.read(size*size*3)
   if not raw:break
   assert len(raw)==size*size*3
   rgb=np.frombuffer(raw,dtype='uint8').reshape(size,size,3).copy();im=Image.fromarray(rgb)
   x=np.asarray(im.resize((1024,1024),Image.Resampling.LANCZOS)).astype('float32');x=x/max(x.max(),1e-6);x=((x-mean)/std).transpose((2,0,1))[None]
   pred=infer(x);pred=(pred-pred.min())/max(float(pred.max()-pred.min()),1e-6)
   mask=np.asarray(Image.fromarray((pred*255).astype('uint8')).resize((size,size),Image.Resampling.LANCZOS))
   mask=clear_key_magenta(rgb,mask)
   areas.append(float(np.mean(mask>128)))
   # Decontaminate only partially transparent edge pixels; opaque armor stays intact.
   edge=(mask>5)&(mask<240)&(np.minimum(rgb[:,:,0].astype('int16'),rgb[:,:,2])-rgb[:,:,1]>15)
   rgb[edge,0]=np.minimum(rgb[edge,0],rgb[edge,1]+np.minimum(8,255-rgb[edge,1]));rgb[edge,2]=np.minimum(rgb[edge,2],rgb[edge,1]+np.minimum(8,255-rgb[edge,1]))
   rgb[mask<5]=0;both=np.concatenate([rgb,np.repeat(mask[:,:,None],3,axis=2)],axis=1)
   encoder.stdin.write(both.tobytes());count+=1
  encoder.stdin.close();assert decoder.wait()==0;assert encoder.wait()==0
  trims=json.loads((root/'editorial-trims.json').read_text()) if (root/'editorial-trims.json').exists() else []
  edit=next((e for e in trims if e['index']==index),None)
  if edit:
   assert hashlib.sha256(source.read_bytes()).hexdigest()==edit['editedSha256']
   assert count==round(edit['duration']*fps),(index,count)
  else:assert 45<=count<=60,(index,count)
  assert min(areas)>.025 and max(areas)<.85,(index,min(areas),max(areas))
  temp.replace(dest)
  return {'index':index,'id':m['id'],'action':action,'frames':count,'fps':fps,'format':'rgb-alpha-side-by-side-h264','width':size*2,'height':size,'bytes':dest.stat().st_size,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'foregroundMin':min(areas),'foregroundMax':max(areas),'seconds':round(time.time()-start,2),'maskModel':'BiRefNet-General-Lite','provider':provider,'keyRefinement':1}
 finally:
  if decoder.poll() is None:decoder.kill()
  if encoder.poll() is None:encoder.kill()
while True:
 rows=json.loads(ledger.read_text()) if ledger.exists() else []
 completed={r['index'] for r in rows};limit=json.loads((root/'production-control.json').read_text())['originalVideoLimit'];available=[i for i in range(1,limit+1) if i not in completed and (root/'source'/f'video-{i:03}.mp4').exists()]
 if '--one' in sys.argv:available=available[:1]
 for index in available:
  row=pack(index);rows.append(row);tmp=ledger.with_suffix('.tmp');tmp.write_text(json.dumps(rows,indent=2)+'\n');tmp.replace(ledger);print(json.dumps(row),flush=True)
 if '--watch' not in sys.argv or len(rows)==limit:break
 time.sleep(10)
