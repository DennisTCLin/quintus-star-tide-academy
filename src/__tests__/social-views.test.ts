import{describe,it,expect}from'vitest';
import{parseCrewView,parseTradeView}from'../social-views';
const id='00000000-0000-4000-8000-000000000000',date='2026-11-06T12:00:00Z';
describe('complete social acknowledgements',()=>{
 it('accepts empty complete views, but rejects missing collections before a pending operation can be cleared',()=>{expect(parseCrewView({requests:[]})).toEqual({requests:[]});expect(parseTradeView({offers:[]})).toEqual({offers:[]});for(const raw of[null,{},[],{offers:null},{offers:[{}]}])expect(()=>parseTradeView(raw)).toThrow();for(const raw of[null,{},[],{requests:[{}]}])expect(()=>parseCrewView(raw)).toThrow();});
 it('keeps malformed success replies uncertain and validates request ownership fields',()=>{try{parseTradeView({offers:[] ,friend:id,name:'family',mine:null,theirs:[]});}catch(e){expect(e).toMatchObject({status:0});}const good={requests:[{id,incoming:true,status:'pending',name:'family',expiresAt:date}]};expect(parseCrewView(good)).toBe(good);expect(()=>parseCrewView({...good,code:'partial'})).toThrow();expect(()=>parseCrewView({requests:[{...good.requests[0],status:'unknown'}]})).toThrow();});
});
