from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import subprocess,json,hashlib,math,html,zipfile
ROOT=Path(__file__).resolve().parent;OUT=ROOT/'animations-v1';FRAMES=ROOT/'frames-v1';FRAMES.mkdir(exist_ok=True)
# Keep the untouched five-second originals in animation-source; prepare continuous sleepy/idle loops.
for name,start in [('rest',2.0),('idle',1.5)]:
 subprocess.run(['ffmpeg','-v','error','-ss',str(start),'-i',str(ROOT/'animation-source'/f'{name}.mp4'),'-filter_complex','[0:v]scale=640:640,fps=24,split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1:a=0[v]','-map','[v]','-an','-c:v','libx264','-crf','23','-pix_fmt','yuv420p','-movflags','+faststart','-y',str(OUT/f'{name}.mp4')],check=True)
 subprocess.run(['ffmpeg','-v','error','-ss','1.5','-i',str(OUT/f'{name}.mp4'),'-frames:v','1','-q:v','3','-y',str(OUT/f'{name}.jpg')],check=True)
labels={'idle':'待機','greet':'打招呼','pet':'摸摸','feed':'吃點心','play':'接星光球','highfive':'擊掌','bubbles':'吹泡泡','rest':'一起休息','listening':'聆聽','thinking':'思考','speaking':'說話','cheering':'歡呼'}
def frame_asset(name):
 clip=OUT/f'{name}.mp4';duration=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',str(clip)]));count=int(duration*10);rows=math.ceil(count/8)
 atlas=FRAMES/f'{name}.jpg'
 subprocess.run(['ffmpeg','-v','error','-i',str(clip),'-vf',f'fps=10,scale=320:320:flags=lanczos,tile=layout=8x{rows}:nb_frames={count}','-frames:v','1','-q:v','4','-y',str(atlas)],check=True)
 return {'motion':name,'label':labels[name],'video':str(clip.relative_to(ROOT)),'poster':f'animations-v1/{name}.jpg','duration':duration,'sha256':hashlib.sha256(clip.read_bytes()).hexdigest(),'loop':name in ['idle','rest','listening','thinking','speaking'],'sprite':{'file':str(atlas.relative_to(ROOT)),'fps':10,'frameCount':count,'frameWidth':320,'frameHeight':320,'columns':8,'rows':rows}}
with ThreadPoolExecutor(max_workers=3) as pool:assets=list(pool.map(frame_asset,labels))
(ROOT/'animation-assets.json').write_text(json.dumps(assets,ensure_ascii=False,indent=2))
cards=''.join(f'<article><h2>{a["label"]}</h2><video controls playsinline muted preload="metadata" poster="{a["poster"]}" src="{a["video"]}" '+('loop ' if a['loop'] else '')+'></video></article>' for a in assets)
(ROOT/'preview.html').write_text('<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>婓婓的學伴動畫</title><style>body{margin:0;padding:32px;background:#fff8e8;color:#543a2b;font-family:system-ui}h1{font-size:28px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px}article{border:1px solid #e3ceae;border-radius:20px;padding:16px;background:#fffdf7}h2{font-size:18px;margin:0 0 12px}video{width:100%;border-radius:14px}p{line-height:1.6}</style><h1>婓婓的學伴動畫</h1><p>黑眼睛定稿版 · 12 種動作 · 點選播放查看。待機與休息已整理成循環版本。</p><main>'+cards+'</main></html>')
(ROOT/'ANIMATIONS-README.md').write_text('''# 婓婓學伴動畫（黑眼睛定稿）

12 段 Higgsfield Kling 3.0 standard 無聲動畫，原始每段 5 秒，共 90 credits。

- animations-v1：網頁用 H264 / yuv420p / 640×640 / 24fps MP4 與對應 JPG。
- frames-v1：供 iPad 舊版影片播放受限時使用的 JPEG 逐格圖集，320×320 / 10fps。讀取 animation-assets.json 的欄列、幀數與速度；需前端 canvas 播放器整合，單獨 JPEG 不會自動播放。
- preview.html：12 段影片本機預覽。
- animations-generation.json：生成提示、參考圖、job ID 與原始結果來源。

已逐段視檢：摸頭、吃星形餅乾、接球、碰掌、吹泡泡、閉眼躺睡、揮手、聆聽、思考、說話、歡呼、待機。黑眼睛、粉紅蝴蝶結和黃色斑塊身份保留。

休息裁切自 2 秒後的睡姿，待機裁切自 1.5 秒後的放手姿勢，使用正反序列讓循環不跳回初始揮手站姿。未修改星潮網站，未部署或綁定帳號；這批是可供後續整合的動畫素材。
''')
with zipfile.ZipFile(ROOT/'feifei-animations-v1.zip','w',zipfile.ZIP_DEFLATED) as z:
 for folder in [OUT,FRAMES]:
  for p in folder.iterdir():z.write(p,p.relative_to(ROOT))
 for name in ['preview.html','animation-assets.json','ANIMATIONS-README.md','animations-generation.json','feifei-character-v3.png']:z.write(ROOT/name,name)
print('Packaged',len(assets),'clips, posters and JPEG frame atlases')
