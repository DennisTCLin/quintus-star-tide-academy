from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import subprocess,urllib.request,json,hashlib
ROOT=Path(__file__).resolve().parent
SOURCE=ROOT/'animation-source';OUT=ROOT/'animations-v1';CONTACT=ROOT/'animation-contacts'
for p in [SOURCE,OUT,CONTACT]:p.mkdir(exist_ok=True)
data=json.loads((ROOT/'animations-generation.json').read_text())
def prepare(job):
 name=data['actions'][job['index']][0];raw=SOURCE/(name+'.mp4')
 if not raw.exists():urllib.request.urlretrieve(job['result_url'],raw)
 subprocess.run(['ffmpeg','-v','error','-i',str(raw),'-vf','fps=2,scale=200:200,tile=5x2','-frames:v','1','-y',str(CONTACT/(name+'.png'))],check=True)
 dest=OUT/(name+'.mp4')
 subprocess.run(['ffmpeg','-v','error','-i',str(raw),'-an','-vf','scale=640:640:flags=lanczos,fps=24','-c:v','libx264','-crf','23','-pix_fmt','yuv420p','-movflags','+faststart','-y',str(dest)],check=True)
 subprocess.run(['ffmpeg','-v','error','-ss','2.5','-i',str(dest),'-frames:v','1','-q:v','3','-y',str(OUT/(name+'.jpg'))],check=True)
 meta=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(dest)]))
 return {'motion':name,'jobId':job['job_id'],'file':str(dest.relative_to(ROOT)),'bytes':dest.stat().st_size,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'duration':meta['format']['duration'],'streams':[{k:s.get(k) for k in ['codec_name','codec_type','width','height','pix_fmt']} for s in meta['streams']]}
with ThreadPoolExecutor(max_workers=3) as pool:assets=list(pool.map(prepare,data['completed']))
(ROOT/'animation-assets.json').write_text(json.dumps(assets,ensure_ascii=False,indent=2))
print('Prepared',len(assets),'animation clips and matching posters')
