// Isolated UI verification: all /api requests use disposable in-memory fixtures.
const {chromium}=require('playwright');const fs=require('node:fs');const path=require('node:path');
const assert=(v,m)=>{if(!v)throw Error(m)};
const out='outputs/battle-performance';fs.mkdirSync(out,{recursive:true});
(async()=>{
 const game=await import('../build/game.mjs');
 const browser=await chromium.launch({channel:'chrome',headless:true});const checks=[],errors=[];
 async function setup({width=1280,player='quintus',reduce=false,blockSheets=false,malformedSheets=false}={}){
  const ctx=await browser.newContext({viewport:{width,height:960},reducedMotion:reduce?'reduce':'no-preference'});
  const page=await ctx.newPage();page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
  const family=game.newFamily();for(const p of Object.values(family.profiles)){for(const c of game.ROSTER)p.owned[c.id]=1;}
  const state={family,questions:{},username:'battle-qa',playerId:player,displayName:player,csrf:'disposable-ui-fixture',day:game.taipeiDay(),verified:{quintus:0,feifei:0,qingqing:0,doudou:0},legacy:false,canMigrate:false};
  await page.route('**/api/**',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(state)}));
  if(blockSheets)await page.route(url=>url.pathname.startsWith('/assets/battle/'),route=>route.abort());
  if(malformedSheets)await page.route(url=>/\/assets\/battle\/.*-(idle|attack)\.webp$/.test(url.pathname),route=>route.fulfill({contentType:'image/png',body:fs.readFileSync('public/assets/tideglow-companion.png')}));
  await page.goto('http://localhost:4198',{waitUntil:'networkidle'});
  await page.locator('.family-nav button').nth(5).click();
  return {ctx,page};
 }
 async function start(page,count=1){for(let i=0;i<count;i++)await page.locator('.pet-picker').first().locator('button').nth(i).click();await page.locator('main .f-primary').click();await page.locator('.duel-stage').waitFor();}
 try{
  const {ctx,page}=await setup();await start(page,3);await page.screenshot({path:`${out}/battle-desktop.png`,fullPage:true});
  const hp=()=>page.locator('.duel-health.side-1 [role=meter]').getAttribute('aria-valuenow');
  const attack=page.locator('.battle-controls button').first();await attack.dblclick({delay:30});
  assert(await hp()==='100','HP updated before impact');
  assert(await page.locator('.battle-controls button:enabled').count()===0,'inputs enabled while animating');
  await page.waitForFunction(()=>document.querySelector('.duel-stage').dataset.phase==='flight');
  await page.screenshot({path:`${out}/battle-flight.png`,fullPage:true});
  await page.waitForFunction(()=>document.querySelector('.duel-stage').dataset.phase==='impact');
  assert(Number(await hp())<100,'HP not updated at impact');
  await page.screenshot({path:`${out}/battle-impact.png`,fullPage:true});
  await page.waitForFunction(()=>document.querySelector('.duel-stage').dataset.round==='3'&&document.querySelector('.duel-stage').dataset.phase==='idle');
  checks.push('One player move on double-click; HP at impact; controls lock; exactly one CPU reply');
  // End through the real leave confirmation and start a new session.
  await page.getByRole('button',{name:'⏹ 結束對戰',exact:true}).click();await page.locator('dialog').getByRole('button',{name:'⏹ 結束',exact:true}).click();await page.locator('.pet-picker').first().waitFor();
  await ctx.close();
  for(const width of [320,390,768,1440]){
   for(const player of ['quintus','feifei']){
    const {ctx,page}=await setup({width,player,reduce:true});await start(page,3);
    const metrics=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,stage:document.querySelector('.duel-stage').getBoundingClientRect().width,buttons:[...document.querySelectorAll('.battle-controls button')].map(e=>({width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height}))}));
    assert(metrics.scroll<=width+1,`overflow ${player}/${width}: ${JSON.stringify(metrics)}`);
    assert(metrics.buttons.every(x=>x.width>=44&&x.height>=44),'small battle targets');
    assert(await page.locator('[data-sprite=animated]').count()===0,'motion preference ignored');
    await page.locator('.battle-controls button').first().click();
    await page.waitForFunction(()=>document.querySelector('.duel-stage').dataset.round==='3'&&document.querySelector('.duel-stage').dataset.phase==='idle');
    if(width===390||width===320)await page.screenshot({path:`${out}/battle-${player}-${width}.png`,fullPage:true});
    checks.push(`${player}/${width}: layout, targets, reduced-motion player/CPU sequence`);await ctx.close();
   }
  }
  for(const pet of ['tideglow','pebblefin','foamferret']){
   const {ctx,page}=await setup();const art=game.ROSTER.find(p=>p.id===pet);
   await page.locator('.pet-picker').first().locator('button').filter({has:page.locator(`img[src="${art.image}"]`)}).click();
   await page.locator('main .f-primary').click();
   const sheet=page.locator('.duel-combatant.side-0 .duel-spritesheet');await sheet.waitFor();
   assert((await sheet.getAttribute('style')).includes(`${pet}-idle.webp`),`${pet} idle missing`);
   const initial=await sheet.evaluate(e=>e.style.backgroundPosition);
   await page.waitForFunction(({pet,initial})=>{const e=document.querySelector('.duel-combatant.side-0 .duel-spritesheet');return e?.style.backgroundImage.includes(pet)&&e.style.backgroundPosition!==initial;},{pet,initial});
   const size=await sheet.boundingBox();assert(Math.abs(size.width-size.height)<1,`${pet} sprite distortion`);
   await page.locator('.battle-controls button').first().click();
   await page.waitForFunction(pet=>document.querySelector('.duel-combatant.side-0 .duel-spritesheet')?.style.backgroundImage.includes(`${pet}-attack.webp`),pet);
   await page.waitForFunction(()=>document.querySelector('.duel-stage').dataset.round==='3'&&document.querySelector('.duel-stage').dataset.phase==='idle');
   assert((await sheet.getAttribute('style')).includes(`${pet}-idle.webp`),`${pet} idle did not resume`);
   checks.push(`${pet}: idle frames advance, attack sheet plays, square geometry, idle resumes`);await ctx.close();
  }
  {
   const {ctx,page}=await setup({width:320,player:'feifei'});const longest=game.ROSTER.reduce((a,b)=>a.name.length>=b.name.length?a:b);
   await page.locator('.pet-picker').first().locator('button').filter({has:page.locator(`img[src="${longest.image}"]`)}).click();await page.locator('main .f-primary').click();
   const hud=await page.locator('.duel-hud').boundingBox(),title=await page.locator('.duel-stage-title').boundingBox();
   assert(title.y>=hud.y+hud.height+8,'long name HUD overlaps title');
   assert(await page.locator('.duel-health.side-0 rt').count()>=longest.name.length,'long name missing ruby');
   await page.locator('.duel-stage').screenshot({path:`${out}/stage-long-name-320.png`});
   checks.push(`320px grade2 longest name ${longest.name}: ruby and HUD/title separation`);await ctx.close();
  }
  for(const failure of ['blockSheets','malformedSheets']){
   const {ctx,page}=await setup({[failure]:true});await start(page);await page.waitForLoadState('networkidle');
   assert(await page.locator('.duel-combatant.side-0 [data-sprite=still] img').count()===1,'static fallback missing');
   await page.locator('.battle-controls button').first().click();
   await page.waitForFunction(()=>document.querySelector('.duel-stage').dataset.round==='3'&&document.querySelector('.duel-stage').dataset.phase==='idle');
   checks.push(`${failure}: static companion and complete player/CPU turn remain usable`);await ctx.close();
  }
  assert(errors.length===0,errors.join('\n'));
 }finally{await browser.close();fs.writeFileSync(`${out}/ui-results.json`,JSON.stringify({checks,errors},null,2));}
 console.log(JSON.stringify({checks,errors},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
