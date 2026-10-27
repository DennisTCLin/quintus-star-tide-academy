import { describe,it,expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import PlayerAvatar, { AccountAvatarProvider } from '../PlayerAvatar';
import { otherFriends, type Friend } from '../presence';
describe('friend identity and explicit portraits',()=>{
 it('renders Alston’s explicit friend portrait while keeping unknown grade-six accounts anonymous',()=>{
  const render=(avatarKey:string)=>renderToStaticMarkup(createElement(AccountAvatarProvider,{value:{username:'alan',playerId:'quintus'}},createElement(PlayerAvatar,{id:'alston',avatarKey})));
  expect(render('alston')).toContain('/players/alston.jpg?v=1');
  expect(render('unknown')).not.toContain('<img');
 });
 it('uses Brownie’s supplied portrait for the account and friends without borrowing another child photo',()=>{
  const render=(id:'quintus'|'feifei',avatarKey?:string)=>renderToStaticMarkup(createElement(AccountAvatarProvider,{value:{username:'Brownie',playerId:'quintus'}},createElement(PlayerAvatar,{id,avatarKey})));
  expect(render('quintus')).toContain('account-avatar-brownie');
  expect(render('quintus')).toContain('/players/brownie.jpg?v=1');
  expect(render('quintus','brownie')).toContain('/players/brownie.jpg?v=1');
  expect(render('quintus','brownie')).not.toContain('/players/quintus.jpg');
  expect(render('quintus','quintus')).toContain('/players/quintus.jpg');
  expect(render('feifei')).toContain('/players/feifei.jpg');
 });
 it('retains same-slot friends while excluding only the active account player',()=>{
  const rows:Friend[]=[{id:'quintus',key:'a',sameAccount:true,name:'A',lastSeenAt:null,onlineUntil:null},{id:'quintus',key:'b',sameAccount:false,name:'B',lastSeenAt:null,onlineUntil:null},{id:'feifei',key:'c',sameAccount:true,name:'C',lastSeenAt:null,onlineUntil:null}];
  expect(otherFriends(rows,'quintus').map(f=>f.key)).toEqual(['b','c']);
 });
 it('uses the target friend portrait instead of the viewer portrait',()=>{
  const render=(avatarKey?:string|null)=>renderToStaticMarkup(createElement(AccountAvatarProvider,{value:{username:'alan',playerId:'quintus'}},createElement(PlayerAvatar,{id:'quintus',avatarKey})));
  expect(render()).toContain('/players/alan.jpg');
  expect(render('quintus')).toContain('/players/quintus.jpg');
  expect(render(null)).toContain('/players/quintus.jpg');
  expect(render('alan')).toContain('account-avatar-alan');
  expect(render('jimmy')).not.toContain('/players/jimmy.jpg');
 });
});

it('uses Jasper own photo for login and friend contexts, preserving Sunny',()=>{
 const render=(key?:string)=>renderToStaticMarkup(createElement(AccountAvatarProvider,{value:{username:'Jasper',playerId:'qingqing'}},createElement(PlayerAvatar,{id:'qingqing',avatarKey:key})));
 expect(render()).toContain('/players/jasper.jpg?v=1');
 expect(render('jasper')).toContain('/players/jasper.jpg?v=1');
 expect(render('qingqing')).toContain('/players/qingqing.jpg?v=1');
 expect(render('unknown')).not.toContain('<img');
});
