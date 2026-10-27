import subprocess,sys
subprocess.run(['node','output/grade6-pending-media/seed-synthetic.mjs'],check=True)
for script in ['answer-flow-check.py','browser-figures.py','browser-review.py','battle-review-check.py']:
 subprocess.run([sys.executable,'output/grade6-pending-media/'+script],check=True)
