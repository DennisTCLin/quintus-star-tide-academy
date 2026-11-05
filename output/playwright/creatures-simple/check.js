async page => {
 await page.goto('http://127.0.0.1:4336/output/playwright/creatures-sixty/harness.html');
 const results=[]; const assert=(v,m)=>{if(!v)throw Error(m);results.push(m)};
 const data=await page.evaluate(async()=>({companions:(await import('/src/companions-wave-three.ts')).WAVE3_COMPANIONS,monsters:(await import('/src/monster-wave-five.ts')).WAVE5_MONSTERS}));
 await page.setViewportSize({width:390,height:844});
 for(const m of data.monsters){
  await page.getByRole('searchbox',{name:'搜尋怪物'}).fill(m.name);
  const card=page.getByRole('button',{name:new RegExp('查看'+m.name)});await card.click();
  const dialog=page.getByRole('dialog');await dialog.waitFor();
  await dialog.locator('img').evaluate(img=>img.decode());
  assert((await dialog.textContent()).includes(m.move),m.id+' detail skill');
  assert(await dialog.locator('.creature-stats').count()===1,m.id+' stats');
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),m.id+' mobile contained');
  if(m.rarity==='S'&&m.element==='金')await page.screenshot({path:'output/playwright/creatures-simple/monster-mobile.png'});
  await dialog.getByRole('button',{name:'關閉怪物詳情'}).click();
 }
 await page.getByRole('button',{name:'新夥伴驗證'}).click();
 for(const [i,c] of data.companions.entries()){
  await page.getByLabel('選擇夥伴').selectOption(String(i));
  await page.locator('.qa-art').evaluate(img=>img.decode());
  assert((await page.locator('.creature-skill').textContent()).includes(c.signatureMove),c.id+' companion skill');
 }
 await page.setViewportSize({width:768,height:1024});
 await page.screenshot({path:'output/playwright/creatures-simple/companion-ipad.png'});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'iPad contained');
 const decoded=await page.evaluate(async data=>{let n=0;for(const c of [...data.companions,...data.monsters])for(const url of [c.image,c.thumbnail]){const img=new Image();img.src=url;await img.decode();if(![320,640].includes(img.naturalWidth))throw Error(url);n++;}return n},data);
 assert(decoded===120,'all 120 full/thumbnail assets decoded in WebKit');
 return {browser:'WebKit',results};
}
