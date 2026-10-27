"""Reproduce original exam crops from the reviewed manifest (requires Poppler and Pillow).
Original PDFs are parent-provided local files, not redistributed. Never redraw exam figures.
"""
import hashlib,json,subprocess,tempfile
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[2]
manifest=json.loads((ROOT/'output/grade6-pending-media/media-manifest.json').read_text())
with tempfile.TemporaryDirectory(prefix='grade6-figures-') as cache:
 for entry in manifest:
  pdf=Path(entry['pdf']);assert hashlib.sha256(pdf.read_bytes()).hexdigest()==entry['sha256'],pdf
  w,h=entry['referenceDimensions'];rot=entry['rotationDegrees'];bbox=entry['bbox'];ow,oh=entry['outputDimensions']
  scale=ow/(bbox[2]-bbox[0]);assert abs(oh/(bbox[3]-bbox[1])-scale)<0.001
  if abs(rot)%180:w,h=h,w
  target=Path(cache)/'page'
  subprocess.run(['pdftoppm','-f',str(entry['pdfPage']),'-singlefile','-scale-to-x',str(round(w*scale)),'-scale-to-y',str(round(h*scale)),'-png',str(pdf),str(target)],check=True)
  image=Image.open(target.with_suffix('.png')).rotate(rot,expand=True).crop(tuple(round(v*scale) for v in bbox))
  destination=ROOT/'public'/entry['asset'].lstrip('/');destination.parent.mkdir(parents=True,exist_ok=True)
  image.save(destination,'WEBP',lossless=True)
  assert image.size==(ow,oh)
print(f'Rendered {len(manifest)} original figures; run content audit to compare media bytes.')
