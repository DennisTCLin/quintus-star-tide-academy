"""Anonymous release verification; never reads or changes player state."""
import hashlib, json, re
from pathlib import Path
from urllib.request import Request, urlopen
ROOT = Path(__file__).resolve().parents[2]
SITE = "https://quintus-star-tide-academy-production.up.railway.app"
def get(path):
    with urlopen(Request(SITE + path, headers={"Cache-Control": "no-cache"}), timeout=60) as r:
        return r.read(), r.headers.get("Content-Type", "")
local = (ROOT / "dist/index.html").read_text()
remote = get("/")[0].decode()
entry = re.search(r'<script[^>]+src="([^"]+)"', local).group(1)
checks = [{"check":"health", "pass":json.loads(get("/healthz")[0])["ok"] is True},
          {"check":"entry", "path":entry, "pass":entry in remote}]
paths = [entry] + re.findall(r'<link[^>]+href="([^"]+\.css)"', local)
paths += ["/assets/subject-islands/panorama-loop.mp4", "/assets/tideglow-guide/idle.mp4", "/assets/tideglow-guide/listening.mp4", "/assets/tideglow-guide/speaking.mp4", "/assets/tideglow-care/actions.webp", "/assets/tideglow-voice/kiki-care-20261025/highfive.mp3"]
for path in paths:
    expected = ROOT / "dist" / path.lstrip("/")
    data, mime = get(path)
    digest = hashlib.sha256(data).hexdigest()
    checks.append({"path":path, "bytes":len(data), "mime":mime, "sha256":digest,
                   "pass":expected.is_file() and digest == hashlib.sha256(expected.read_bytes()).hexdigest()})
result = {"site":SITE, "noAccountAccess":True, "entry":entry, "checks":checks, "pass":all(x["pass"] for x in checks)}
(ROOT / "outputs/mobile-tablet-review/production-verification.json").write_text(json.dumps(result, indent=2) + "\n")
print(json.dumps({"pass":result["pass"], "entry":entry, "checks":len(checks)}))
raise SystemExit(0 if result["pass"] else 1)
