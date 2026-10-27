"""Validate only changed completed media while this production task is active."""
import json,hashlib,time,subprocess,os
from pathlib import Path
root=Path(__file__).parent;previous=None
while True:
 raw=(root/'matte-videos.json').read_bytes();fingerprint=hashlib.sha256(raw).hexdigest()
 if fingerprint!=previous:
  subprocess.run(['python3',str(root/'update-provenance.py')],check=True)
  subprocess.run(['python3',str(root/'audit-media.py')],check=True)
  subprocess.run(['/tmp/star-tide-dog-qa/bin/python',str(root/'check-all-motion.py')],check=True)
  subprocess.run(['python3',str(root/'update-provenance.py')],check=True)
  previous=fingerprint
  if len(json.loads(raw))==json.loads((root/'production-control.json').read_text())['originalVideoLimit']:break
 time.sleep(30)
