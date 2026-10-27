"""Compare production entrypoints and bundles to the reviewed local build."""
import hashlib
import json
import os
from pathlib import Path
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
BASE = "https://quintus-star-tide-academy-production.up.railway.app"


def get(path):
    with urllib.request.urlopen(BASE + path, timeout=45) as response:
        assert response.status == 200, (path, response.status)
        return response.read()


html = get("/").decode()
assets = []
for path in sorted((ROOT / "dist/assets").glob("*.js")) + sorted((ROOT / "dist/assets").glob("*.css")):
    relative = "/" + str(path.relative_to(ROOT / "dist"))
    if path.name.startswith("index."):
        assert relative in html, ("root references old build", relative)
    data = get(relative)
    assert data == path.read_bytes(), ("asset differs", relative)
    assets.append({"path": relative, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()})
health = json.loads(get("/healthz"))
assert health["ok"], health
result = {
    "base": BASE,
    "runtimeCommit": os.environ["ELEMENT_RELEASE_COMMIT"],
    "deployment": os.environ["ELEMENT_DEPLOYMENT_ID"],
    "health": health,
    "allAssetsByteIdentical": True,
    "assets": assets,
    "result": "PASS",
}
out = ROOT / "outputs/element-animation/production-release.json"
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
print(json.dumps(result, ensure_ascii=False, indent=2))
