import type{Session}from'./engine';
import type{Profile}from'../adventure';
// A course started before game enrollment keeps its original completion rules.
export function adultSessionStatus(session:Session|null|undefined,adventure:Profile['adultAdventure']){
 const meta=session&&adventure?.sessionId===session.id?adventure:undefined;
 const legacy=!meta||meta.legacy===true;
 const failed=!!meta&&!legacy&&(meta.outcome==='failed'||(session?.results.filter(r=>!r.correct).length??0)>=3);
 return{meta,legacy,failed,complete:!!session&&(session.complete||failed)};
}
