import fs from 'node:fs';
import * as g from '../../build/game.mjs';
const fixtures={};
for(const [mascot,username,player] of [['dog','olivia','doudou'],['bow','feifei','feifei'],['tideglow','quintus','quintus']]){
 const family=g.newFamily();
 family.profiles[player].learning.school='yongchun';
 fixtures[mascot]={family,questions:{},reviews:{},username,playerId:player,displayName:'合成學伴測試',csrf:'synthetic-only',day:g.taipeiDay(),verified:Object.fromEntries(g.PLAYERS.map(p=>[p.id,0])),legacy:false,canMigrate:false,result:false};
}
fs.writeFileSync(new URL('./fixtures.json',import.meta.url),JSON.stringify(fixtures));
