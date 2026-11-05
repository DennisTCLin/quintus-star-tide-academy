from pathlib import Path
import json
p=Path('outputs/creatures-unified');all=json.loads((p/'all-results.json').read_text());mapping=json.loads((p/'rework-map.json').read_text());selected={j['index']:j for j in all if j['index']<=55}
for j in sorted(all,key=lambda j:j['index']):
 if str(j['index']) in mapping:selected[mapping[str(j['index'])]]={**j,'sourceIndex':j['index'],'index':mapping[str(j['index'])]}
assert len(selected)==55
(p/'results.json').write_text(json.dumps([selected[i] for i in sorted(selected)],indent=2))
