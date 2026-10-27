import concurrent.futures, hashlib, json, pathlib, subprocess, urllib.request
root = pathlib.Path(__file__).parent
public = root.parent.parent / 'public/assets/tideglow-guide'
source = root / 'original'
source.mkdir(exist_ok=True)
data = json.loads((root / 'generation.json').read_text())
def process(job):
    name = data['states'][job['index']]
    raw = source / (name + '.mp4')
    if not raw.exists(): urllib.request.urlretrieve(job['result_url'], raw)
    target = public / (name + '.mp4')
    def run(args): subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(raw)] + args, check=True)
    if not target.exists(): run(['-an', '-vf', 'scale=640:640:flags=lanczos,fps=24', '-c:v', 'libx264', '-preset', 'slow', '-crf', '25', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(target)])
    run(['-vf', 'fps=2,scale=200:200,tile=5x2', '-frames:v', '1', '-q:v', '2', str(root / (name + '-contact.jpg'))])
    meta = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(target)]))
    return {'state': name, 'job':job['job_id'], 'bytes':target.stat().st_size, 'sha256':hashlib.sha256(target.read_bytes()).hexdigest(), 'streams':[{k:s.get(k) for k in ['codec_name','codec_type','width','height','r_frame_rate','duration']} for s in meta['streams']]}
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    records = list(pool.map(process, [j for j in data['results']['jobs'] if j['status']=='completed']))
(root / 'media-checks.json').write_text(json.dumps(records, indent=2)+'\n')
print(json.dumps(records, indent=2))
