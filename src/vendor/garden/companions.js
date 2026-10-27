// Original island companions. IDs and asset paths are application-owned.
export const COMPANIONS = [
  {id:'maltese', name:'棉花糖', zy:'ㄇㄧㄢˊ ㄏㄨㄚ ㄊㄤˊ', animal:'馬爾濟斯', color:'#e8b683', food:'🥣'},
  {id:'pig', name:'奶茶', zy:'ㄋㄞˇ ㄔㄚˊ', animal:'小豬', color:'#ef9a9f', food:'🍎'},
  {id:'otter', name:'浪花', zy:'ㄌㄤˋ ㄏㄨㄚ', animal:'海獺', color:'#76bdc4', food:'🐟'},
  {id:'fox', name:'芒果', zy:'ㄇㄤˊ ㄍㄨㄛˇ', animal:'狐狸', color:'#eda45c', food:'🥣'},
  {id:'rabbit', name:'月亮', zy:'ㄩㄝˋ ㄌㄧㄤˋ', animal:'兔子', color:'#b3add9', food:'🥕'}
].map(p=>Object.freeze({...p,image:`/assets/companions/${p.id}.webp`,thumb:`/assets/companions/${p.id}-thumb.webp`}));
export const DEFAULT_COMPANION='maltese';
export function companion(s){return COMPANIONS.find(p=>p.id===s.companionId)||COMPANIONS[0];}
export function selectCompanion(s,id){
  const next=COMPANIONS.find(p=>p.id===id);if(!next)return false;
  if(companion(s).id===id)return true;
  s.companionNames??={};s.companionNames[companion(s).id]=s.name;
  s.companionId=id;s.name=s.companionNames[id]||next.name;return true;
}
export function renameCompanion(s,name){
  s.name=(String(name).trim()||companion(s).name).slice(0,12);
  s.companionNames??={};s.companionNames[companion(s).id]=s.name;
}
