import{exerciseById}from'./catalog';
export function normalizeAnswer(value:string){return value.normalize('NFKC').toLowerCase().replace(/[‘’]/g,"'").replace(/[.,!?;:]/g,'').trim().replace(/\s+/g,' ');}
export function isCorrect(id:string,answer:string){const q=exerciseById(id);return !!q&&[q.answer,...(q.accepted??[])].some(a=>normalizeAnswer(a)===normalizeAnswer(answer));}
