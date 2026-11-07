import {CloudError}from'./cloud';
import {petById}from'./game-view';
const valid=(v:unknown)=>{if(!v)throw new CloudError('連線中斷，尚未確認這次操作。連線恢復後請按「確認同步」。',0);};
const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
const uuid=(v:unknown)=>typeof v==='string'&&/^[a-f0-9-]{36}$/i.test(v);
const named=(v:unknown)=>typeof v==='string'&&v.length>0&&v.length<=80;
const date=(v:unknown)=>typeof v==='string'&&Number.isFinite(Date.parse(v));
export function parseCrewView<T>(value:T):T{
 valid(object(value));const v=value as Record<string,unknown>;
 valid(Array.isArray(v.requests)&&v.requests.length<=30&&v.requests.every(r=>object(r)&&uuid(r.id)&&typeof r.incoming==='boolean'&&['pending','accepted','declined'].includes(String(r.status))&&named(r.name)&&date(r.expiresAt)));
 valid(v.code===undefined||typeof v.code==='string'&&/^[A-F0-9]{16}$/.test(v.code));return value;
}
export function parseTradeView<T>(value:T):T{
 valid(object(value));const v=value as Record<string,unknown>;
 valid(Array.isArray(v.offers)&&v.offers.length<=30&&v.offers.every(o=>object(o)&&uuid(o.id)&&uuid(o.friend)&&typeof o.incoming==='boolean'&&named(o.name)&&petById(String(o.give))&&petById(String(o.receive))&&['pending','accepted','declined','cancelled','expired'].includes(String(o.status))&&date(o.expiresAt)));
 if(v.friend!==undefined){valid(uuid(v.friend)&&named(v.name));for(const key of['mine','theirs'])valid(Array.isArray(v[key])&&(v[key]as unknown[]).every(c=>object(c)&&petById(String(c.id))&&Number.isSafeInteger(c.copies)&&Number(c.copies)>0));}
 return value;
}
