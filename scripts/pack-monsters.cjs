// Slice the six generated 3x2 sheets into five independent transparent assets.
// No redraw, hue swapping or invented variants: every cell is generated art.
// NODE_PATH=<bundled runtime>/node_modules node scripts/pack-monsters.cjs
const sharp = require('sharp');
const fs = require('node:fs');
const { createHash } = require('node:crypto');
const groups = ['cloud-scout', 'cloud-warden', 'crab-scout', 'crab-warden', 'golem-scout', 'golem-warden'];
const elements = ['metal', 'wood', 'water', 'fire', 'earth'];
(async () => {
  const results = [], contact = [];
  for (const [groupIndex, group] of groups.entries()) {
    const source = `outputs/monster-bestiary/sources/${group}.png`;
    const meta = await sharp(source).metadata();
    if (!meta.hasAlpha || meta.width !== 2048 || meta.height !== 1360) throw Error(`Unexpected sheet: ${source}`);
    for (const [i, element] of elements.entries()) {
      const left = Math.round((i % 3) * meta.width / 3) + 3;
      const top = Math.floor(i / 3) * 680 + 3;
      const width = Math.round(((i % 3) + 1) * meta.width / 3) - left - 3;
      const output = `public/assets/monsters/${group}-${element}.webp`;
      await sharp(source).extract({ left, top, width, height:674 })
        .resize(640,640,{fit:'contain',background:{r:0,g:0,b:0,alpha:0}})
        .webp({quality:88,alphaQuality:100}).toFile(output);
      const stats = await sharp(output).stats();
      if (stats.isOpaque) throw Error(`Missing transparency: ${output}`);
      results.push({id:`${group}-${element}`,file:output,bytes:fs.statSync(output).size,width:640,height:640});
      contact.push({input:await sharp(output).resize(200,200).png().toBuffer(),left:i*200,top:groupIndex*200});
    }
  }
  await sharp({create:{width:1000,height:1200,channels:3,background:'#08263a'}}).composite(contact).png().toFile('outputs/monster-bestiary/asset-contact.png');
  const hash = createHash('sha256');
  for (const asset of [...results].sort((a,b)=>a.file.localeCompare(b.file))) hash.update(fs.readFileSync(asset.file));
  fs.writeFileSync('outputs/monster-bestiary/assets.json',JSON.stringify({version:hash.digest('hex').slice(0,12),count:results.length,totalBytes:results.reduce((n,a)=>n+a.bytes,0),assets:results},null,2));
  console.log(JSON.stringify({count:results.length,totalBytes:results.reduce((n,a)=>n+a.bytes,0)}));
})().catch(error=>{console.error(error);process.exitCode=1;});
