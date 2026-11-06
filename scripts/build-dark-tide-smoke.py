"""Convert the supplied transparent smoke MOV into a bounded WebGL flipbook.
Usage: python3 scripts/build-dark-tide-smoke.py /path/to/source.mov
Requires ffmpeg and Pillow with WebP support. The original movie is never copied into the site.
"""
import hashlib,json,subprocess,sys,tempfile
from PIL import Image
from pathlib import Path
source=Path(sys.argv[1])
out=Path('public/assets/conquest/fx')
out.mkdir(parents=True,exist_ok=True)
# 48 frames / 7.2 s; no atlas mipmaps at runtime. Sample texel centers to avoid
# neighbouring frames bleeding into a cell. Preserve the source's straight alpha.
asset=out/'dark-tide-smoke-v2.webp'
with tempfile.TemporaryDirectory(prefix='dark-tide-smoke-') as scratch:
 frame_path=Path(scratch)/'atlas.png'
 command=['ffmpeg','-hide_banner','-loglevel','error','-i',str(source),'-vf','fps=20/3,scale=512:288:flags=lanczos,format=rgba,tile=8x6','-frames:v','1','-y',str(frame_path)]
 subprocess.run(command,check=True)
 with Image.open(frame_path) as frame:
  frame.save(asset,format='WEBP',quality=88,method=6)

manifest={'source':source.name,'sourceSha256':hashlib.file_digest(source.open('rb'),'sha256').hexdigest(),'asset':asset.name,'assetSha256':hashlib.file_digest(asset.open('rb'),'sha256').hexdigest(),'frames':48,'columns':8,'rows':6,'frameWidth':512,'frameHeight':288,'durationSeconds':7.2,'alpha':'straight','bytes':asset.stat().st_size}
(out/'dark-tide-smoke-v2.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(manifest))
