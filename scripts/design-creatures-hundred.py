from pathlib import Path
import json
root=Path('outputs/creatures-hundred')
rows=[s.split('|') for s in (root/'designs.txt').read_text().splitlines() if s and not s.startswith('#')]
assert len(rows)==100
designs=[]
tiers=['E','E','D','D','C','C','B','B','A','S']
for i,(kind,slug,name,move,feature,brief) in enumerate(rows):
    local=i%50
    designs.append(dict(id=('w4-' if kind=='c' else 'w6-')+slug,kind=kind,name=name,move=move,feature=feature,brief=brief,rarity=tiers[local//5],element=['金','木','水','火','土'][local%5],sheet=i//5+1,cell=i%5))
assert len({d['id'] for d in designs})==100
assert len({d['name'] for d in designs})==100
(root/'designs.json').write_text(json.dumps(designs,ensure_ascii=False,indent=2)+'\n')
base='''Star Tide Academy original fantasy RPG production cutouts. Use the reference images ONLY for the approved simplified smooth 3D-toon rendering style, not their identities. Warcraft-inspired worldbuilding themes: enchanted forests, primordial elements, frost wilderness, heroic beasts and dragon guardians. Create original silhouettes described below. Exactly FIVE different FULL BODY creatures in a strict invisible equal 3-column x2-row grid: three top row, two BOTTOM LEFT and BOTTOM CENTER, bottom right EMPTY. Landscape3:2. Generous 10% empty margin INSIDE every cell, entire ears, tails and wings visible, no overlap. REAL transparent alpha background, no backdrop, no floor, no cast shadows, no cloudy haze, no checkerboard, no labels or text. Premium friendly game art for children: smooth broad color surfaces, 2-3 dominant colors, softly shaded dimensional forms, clear expressive faces, ONE defining feature per creature. NO tiny fur strands, NO fine scales, NO filigree, NO etched armor, NO speckling, NO gems everywhere, NO dense ornament. Rare creatures distinguished by grand silhouette NOT detail density. Animals remain animals, no human riders. Three-quarter left facing. Five identities in exact reading order: '''
requests=[]
for sheet in range(1,21):
    selected=[d for d in designs if d['sheet']==sheet]
    requests.append({'index':sheet,'params':{'model':'gpt_image_2_5','variant':'flare','quality':'medium','resolution':'2k','background':'transparent','aspect_ratio':'3:2','count':1,'medias':[{'role':'image','value':'https://quintus-star-tide-academy-production.up.railway.app/assets/creatures-sixty/w3-magnetelephant.webp'},{'role':'image','value':'https://quintus-star-tide-academy-production.up.railway.app/assets/creatures-sixty/w5-mistumbrella.webp'}],'prompt':base+'; '.join(str(n+1)+'. '+d['brief'] for n,d in enumerate(selected))+'.'}})
(root/'requests.json').write_text(json.dumps(requests,ensure_ascii=False,indent=2)+'\n')
(root/'.gitignore').write_text('sources/\n*.log\n')
print('Prepared 100 designs and 20 generation requests')
