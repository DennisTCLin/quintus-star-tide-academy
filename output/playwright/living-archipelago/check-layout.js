async (page) => {
 const checks=[];
 for(const grade of [1,2,4]) for(const width of [320,390,768,1440]) {
  await page.setViewportSize({width,height:1000});
  await page.goto(`http://127.0.0.1:4388/output/playwright/living-archipelago/fixture.html?grade=${grade}`);
  await page.locator('.archipelago-atmosphere').waitFor();
  const before=await page.locator('.archipelago-streams').evaluate(el=>getComputedStyle(el).transform);
  await page.waitForTimeout(150);
  const motion=before!==await page.locator('.archipelago-streams').evaluate(el=>getComputedStyle(el).transform);
  const geometry=await page.locator('.archipelago-scene').evaluate(el=>{
   const r=el.getBoundingClientRect(), b=[...el.querySelectorAll('button')].map(x=>x.getBoundingClientRect());
   return {targets:b.every(x=>x.width>=48&&x.height>=48),bounds:b.every(x=>x.left>=r.left&&x.right<=r.right&&x.top>=r.top&&x.bottom<=r.bottom),overlap:b.some((x,i)=>b.some((y,j)=>i<j&&x.left<y.right&&x.right>y.left&&x.top<y.bottom&&x.bottom>y.top)),overflow:document.documentElement.scrollWidth>innerWidth,source:el.querySelector('img').currentSrc};
  });
  if(width===320) await page.locator('.archipelago-scene').screenshot({path:`output/playwright/living-archipelago/webkit-${grade}-320.png`});
  await page.locator('.archipelago-stop').nth(2).tap();
  checks.push({grade,width,motion,...geometry,navigated:!!await page.locator('#chosen').textContent()});
 }
 return checks;
}
