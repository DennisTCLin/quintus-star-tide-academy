import os,subprocess,pathlib
root=pathlib.Path.cwd();out=root/'output/pr22-main341aff'
env={k:v for k,v in os.environ.items() if k in ['PATH','HOME','TMPDIR','LANG','LC_ALL','SHELL']};env.update(CI='1',NO_COLOR='1')
with (out/'general.log').open('w') as log:
 r=subprocess.run(['npm','test','--','--no-file-parallelism','--reporter=json','--outputFile=output/pr22-main341aff/general.json'],env=env,stdout=log,stderr=subprocess.STDOUT)
raise SystemExit(r.returncode)
