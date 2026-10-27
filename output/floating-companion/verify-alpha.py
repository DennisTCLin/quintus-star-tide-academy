from PIL import Image
from pathlib import Path
import hashlib,json
paths={'dog':'public/assets/olivia-dog/poster-v1.png','tideglow':'public/assets/tideglow-companion.png','bow':'public/assets/companion-launcher-v3/bow.png'}
rows=[]
for mascot,path in paths.items():
 im=Image.open(path);assert im.mode=='RGBA';alpha=im.getchannel('A');hist=alpha.histogram()
 corners=[alpha.getpixel(p) for p in [(0,0),(im.width-1,0),(0,im.height-1),(im.width-1,im.height-1)]]
 assert corners==[0]*4 and hist[0]/sum(hist)>.3 and sum(hist[230:])>10000
 rows.append({'mascot':mascot,'path':path,'size':im.size,'transparentCorners':corners,'fullyTransparentFraction':hist[0]/sum(hist),'sha256':hashlib.sha256(Path(path).read_bytes()).hexdigest()})
Path('output/floating-companion/alpha-verification.json').write_text(json.dumps(rows,indent=2)+'\n')
print('PASS all three source PNGs have actual alpha, clear corners and >30% fully transparent canvas')
