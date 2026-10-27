"""Keep a reviewed, fully visible Higgsfield entrance segment without more paid jobs.
Stop the matte/QA writers before editing; original sources remain recoverable.
"""
import argparse,json,hashlib,shutil,subprocess
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--index',type=int,required=True);p.add_argument('--start',type=float,default=0);p.add_argument('--end',type=float,required=True);p.add_argument('--duration',type=float,default=2);p.add_argument('--reason',required=True);args=p.parse_args()
index=args.index;assert 1<=index<=150 and 0<=args.start<args.end<=4.084 and args.duration>0
root=Path(__file__).parent;manifest=root/'editorial-trims.json';edits=json.loads(manifest.read_text()) if manifest.exists() else []
assert not any(e['index']==index for e in edits),'Already edited: inspect the preserved uncut source first'
ledger=root/'matte-videos.json';rows=json.loads(ledger.read_text());source=root/'source'/f'video-{index:03}.mp4';backup=root/'source/uncut'/source.name;backup.parent.mkdir(exist_ok=True);assert not backup.exists();shutil.copy2(source,backup);temp=source.with_suffix('.trim.mp4')
subprocess.run(['ffmpeg','-v','error','-y','-i',str(backup),'-vf',f'trim=start={args.start}:end={args.end},setpts=(PTS-STARTPTS)*{args.duration/(args.end-args.start)},fps=24,tpad=stop_mode=clone:stop_duration=1','-t',str(args.duration),'-an','-c:v','libx264','-crf','17','-pix_fmt','yuv420p','-movflags','+faststart',str(temp)],check=True);temp.replace(source)
edits.append({'index':index,'sourceSha256':hashlib.sha256(backup.read_bytes()).hexdigest(),'editedSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'sourceStart':args.start,'sourceEnd':args.end,'duration':args.duration,'reason':args.reason,'previousMatte':next((r for r in rows if r['index']==index),None)})
manifest.write_text(json.dumps(edits,indent=2)+'\n');ledger.write_text(json.dumps([r for r in rows if r['index']!=index],indent=2)+'\n')
