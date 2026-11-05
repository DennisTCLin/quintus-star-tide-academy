from pathlib import Path
import json,hashlib
root=Path('outputs/creatures-hundred')
designs=json.loads((root/'designs.json').read_text())
def image(d,thumb=False):
    path='assets/creatures-hundred/'+d['id']+('-320' if thumb else '')+'.webp'
    f=Path('public')/path
    digest=hashlib.sha256(f.read_bytes()).hexdigest()[:12] if f.exists() else 'pending'
    return '/'+path+'?v='+digest
companions=[];monsters=[]
for d in designs:
    if d['kind']=='c':
        i=len(companions);support=['shield','focus','focus','spark','shield'][i%5]
        companions.append(dict(id=d['id'],name=d['name'],rarity=d['rarity'],element=d['element'],image=image(d),thumbnail=image(d,True),catalogNumber=276+i,nameEn=d['id'][3:],title=d['move']+'的夥伴',unlockAt=1000000,alt=d['name']+'，'+d['feature'],personality='勇敢又友善',story=d['feature'],artBrief=d['feature'],palette='',series='遠境守望者',supportType=support,signatureMove=d['move'],role='防禦' if support=='shield' else '攻擊',motion='stride',encouragement='再想一想，我會陪你找到答案。',tags=['遠境守望者',d['element'],d['rarity']]))
    else:
        i=len(monsters)
        monsters.append(dict(id=d['id'],name=d['name'],rarity=d['rarity'],element=d['element'],image=image(d),thumbnail=image(d,True),number=141+i,family=14+i//10,form='scout' if d['rarity'] in ['E','D','C'] else 'warden',feature=d['feature'],move=d['move']))
for name,typ,const,data in [('companions-wave-four','Character','WAVE4_COMPANIONS',companions),('monster-wave-six','Monster','WAVE6_MONSTERS',monsters)]:
    module='characters' if typ=='Character' else 'monsters'
    Path('src/'+name+'.ts').write_text(f'import type {{ {typ} }} from "./{module}";\n\n/** Append-only original simplified fantasy creatures. */\nexport const {const}: readonly {typ}[] = '+json.dumps(data,ensure_ascii=False,indent=2)+';\n')
print('Wrote 50 companion and 50 monster definitions')
