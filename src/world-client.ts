import{request,CloudError}from'./cloud';
import{WORLD_AVATARS,WORLD_PHRASES,WORLD_STATUS}from'./world-catalog';
import{petById,type PlayerId}from'./game-view';
export type WorldPerson={key:string;name:string;avatar:typeof WORLD_AVATARS[number];pet:string|null;friend:boolean;self:boolean;status:keyof typeof WORLD_STATUS};
export type WorldView={serverNow:number;self:{key:string;name:string;avatar:typeof WORLD_AVATARS[number];receiveInvites:boolean};roster:WorldPerson[];requests:{id:string;incoming:boolean;key:string;name:string;expiresAt:number}[];greetings:{id:string;key:string;name:string;phrase:keyof typeof WORLD_PHRASES;expiresAt:number}[];mutes:{key:string;name:string}[]};
const obj=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const uuid=(v:unknown)=>typeof v==='string'&&/^[a-f0-9-]{36}$/i.test(v);
const named=(v:unknown)=>typeof v==='string'&&/^(星光|晨光|海風|月光|微光|晴空)(海豚|海獺|飛魚|海龜|星鯨|小龍)\d{4}$/.test(v);
const need=(v:unknown)=>{if(!v)throw new CloudError('世界資料尚未確認，請重新連線。',503);};
const keys=(v:Record<string,unknown>,allowed:string[])=>Object.keys(v).every(k=>allowed.includes(k));
export function parseWorld(value:unknown):WorldView{
 need(obj(value));const v=value as Record<string,unknown>;need(keys(v,['serverNow','self','roster','requests','greetings','mutes','replayed'])&&Number.isFinite(v.serverNow));
 need(obj(v.self)&&keys(v.self,['key','name','avatar','receiveInvites'])&&uuid(v.self.key)&&named(v.self.name)&&WORLD_AVATARS.includes(v.self.avatar as typeof WORLD_AVATARS[number])&&typeof v.self.receiveInvites==='boolean');
 for(const[k,max,fields]of[['roster',60,['key','name','avatar','pet','friend','self','status']],['requests',30,['id','incoming','key','name','expiresAt']],['greetings',12,['id','key','name','phrase','expiresAt']],['mutes',60,['key','name']]]as const){const list=v[k];need(Array.isArray(list)&&list.length<=max&&list.every(p=>obj(p)&&keys(p,[...fields])&&uuid(p.key)&&named(p.name)));}
 need((v.roster as WorldPerson[]).every(p=>WORLD_AVATARS.includes(p.avatar)&&typeof p.friend==='boolean'&&typeof p.self==='boolean'&&Object.prototype.hasOwnProperty.call(WORLD_STATUS,p.status)&&(p.pet===null||petById(p.pet))));
 need((v.requests as WorldView['requests']).every(r=>uuid(r.id)&&typeof r.incoming==='boolean'&&Number.isFinite(r.expiresAt)));
 need((v.greetings as WorldView['greetings']).every(g=>uuid(g.id)&&Object.prototype.hasOwnProperty.call(WORLD_PHRASES,g.phrase)&&Number.isFinite(g.expiresAt)));
 return value as WorldView;
}
// Mounted only while the drawer is open: one narrow read/15 s; none in background.
export function trackWorld(player:PlayerId,receive:(s:WorldView)=>void,onError:(e:Error)=>void){
 let stopped=false,foreground=document.visibilityState==='visible',controller:AbortController|null=null,generation=0;
 const stopRead=()=>{generation++;controller?.abort();controller=null;};
 const read=async()=>{if(stopped||!foreground||document.visibilityState!=='visible'||!navigator.onLine||controller)return;const issued=++generation;controller=new AbortController();try{const view=parseWorld(await request(`world?player=${player}`,undefined,undefined,false,controller.signal));if(!stopped&&issued===generation&&document.visibilityState==='visible')receive(view);}catch(e){if(!stopped&&issued===generation)onError(e as Error);}finally{if(issued===generation)controller=null;}};
 const visibility=()=>{foreground=document.visibilityState==='visible';stopRead();if(foreground)void read();};const offline=()=>{foreground=false;stopRead();};
 document.addEventListener('visibilitychange',visibility);window.addEventListener('online',visibility);window.addEventListener('offline',offline);window.addEventListener('pagehide',offline);window.addEventListener('pageshow',visibility);
 const timer=setInterval(()=>void read(),15000);void read();
 return{refresh:()=>{stopRead();void read();},stop:()=>{stopped=true;stopRead();clearInterval(timer);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('online',visibility);window.removeEventListener('offline',offline);window.removeEventListener('pagehide',offline);window.removeEventListener('pageshow',visibility);}};
}
