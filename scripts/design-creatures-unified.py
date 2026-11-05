import json
from pathlib import Path
root=Path('outputs/creatures-unified');base=json.loads((root/'baseline.json').read_text());monsters={m['id']:m for m in base['monsters']}
chars=[c for c in base['characters'] if not c['id'].startswith(('w4-','w6-'))];assert len(chars)==275
style=json.load(open('outputs/creatures-hero-style/request.json'))['resultUrl']
req=[];designs=[]
for off in range(0,len(chars),5):
 group=chars[off:off+5];sheet=off//5+1
 prompt='Restyle FIVE existing Star Tide Academy fantasy RPG creatures to the APPROVED HEROIC STYLE in reference image1. References2-6 are the five respective identities, in order: preserve species, palette and recognizable silhouette/features, but remove decorative clutter. Match image1 mature proportions, smaller focused eyes, defined shoulders and functional limbs, directional painterly dimensional lighting, sculpted broad forms, restrained rim lighting. NO toy/plush/chibi proportions, shiny vinyl, dense tiny scales, intricate filigree, all-over runes or particles. Majestic high-rarity creatures rely on strong silhouettes and ONE focal feature rather than ornament. Keep each original body plan (birds fly, fish swim, serpents coil, quadrupeds stand); do not turn them all into dogs or add limbs. Simplify surface patterns while retaining identity. STRICT LAYOUT: exactly5 full-body subjects in equal 3-column x2-row grid. Three top, two bottom LEFT and CENTER, bottom right EMPTY. Each fully within its cell with 12% clear margins. No overlapping subjects; complete horns/wings/tails/paws. Transparent alpha, NO floor/background/glowcloud/checkerboard/labels/text. Threequarter left-facing. STYLE reference background is NOT to be copied. FIVE identities in reading order: '
 for cell,c in enumerate(group):
  info=monsters.get(c['id'],c);feature=info.get('feature') or c.get('artBrief') or c.get('story','');prompt+=f"{cell+1}. {c['name']} ({c['id']}), {c['element']} element, {c['rarity']} rarity: {feature}. "
  designs.append(dict(id=c['id'],name=c['name'],kind='m' if c['id'] in monsters else 'c',sheet=sheet,cell=cell,rarity=c['rarity'],element=c['element'],feature=feature,move=info.get('move') or c.get('signatureMove',''),original=c['image']))
 refs=[style]+['https://quintus-star-tide-academy-production.up.railway.app'+c['image'] for c in group]
 req.append({'index':sheet,'params':{'model':'gpt_image_2_5','variant':'flare','quality':'medium','resolution':'2k','background':'transparent','aspect_ratio':'3:2','count':1,'medias':[{'role':'image','value':u}for u in refs],'prompt':prompt}})
(root/'requests.json').write_text(json.dumps(req,ensure_ascii=False,indent=2)+'\n');(root/'designs.json').write_text(json.dumps(designs,ensure_ascii=False,indent=2)+'\n');(root/'.gitignore').write_text('sources/\n*.log\n')
print('55 requests;275identities')
