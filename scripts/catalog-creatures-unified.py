from pathlib import Path
import json
root=Path('outputs/creatures-unified');data=json.loads((root/'assets.json').read_text())
art={a['id']:{'image':'/'+a['files'][0]['path'].removeprefix('public/')+'?v='+a['files'][0]['sha256'][:12],'thumbnail':'/'+a['files'][1]['path'].removeprefix('public/')+'?v='+a['files'][1]['sha256'][:12]}for a in data['assets']}
assert len(art)==275
Path('src/creature-art.ts').write_text('''/** Approved heroic portrait refresh. Pure art lookup; no gameplay changes. */
export const CREATURE_ART: Readonly<Record<string, {image: string; thumbnail: string}>> = '''+json.dumps(art,ensure_ascii=False,indent=2)+''';
export function withCreatureArt<T extends {id: string; image: string}>(creature: T): T {
  const art = CREATURE_ART[creature.id];
  return art ? {...creature, ...art} : creature;
}
''')
