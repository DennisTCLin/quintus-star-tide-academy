// Pack generated five-cell sheets; no recolors or duplicated species.
const sharp = require('sharp');
const fs = require('node:fs');
const crypto = require('node:crypto');
(async () => {
  const root = 'outputs/monster-expansion';
  const sheets = JSON.parse(fs.readFileSync(`${root}/generations.json`));
  const elements = ['metal','wood','water','fire','earth'];
  const assets = [], contact = [];
  for (const [row, sheet] of sheets.entries()) {
    const source = `${root}/sources/${sheet.family}-${sheet.form}.png`;
    const meta = await sharp(source).metadata();
    if (!meta.hasAlpha) throw Error(`Missing alpha: ${source}`);
    for (const [i, element] of elements.entries()) {
      const id = `${sheet.family}-${sheet.form}-${element}`;
      let left = Math.round(i % 3 * meta.width / 3), top = Math.round(Math.floor(i / 3) * meta.height / 2);
      let width = Math.round((i % 3 + 1) * meta.width / 3) - left;
      // Inspected sheet boundaries: the rock tail occupies part of the empty cell;
      // the mushroom sage's broad cap starts left of the nominal grid boundary.
      if (sheet.family === 'pangolin' && sheet.form === 'warden' && i === 4) width = 850;
      if (sheet.family === 'sprite' && sheet.form === 'warden' && i < 3) {
        left = [0,600,1380][i]; width = [600,780,668][i];
      }
      const height = Math.round((Math.floor(i / 3) + 1) * meta.height / 2) - top;
      const file = `public/assets/monsters/${id}.webp`;
      const thumbnail = `public/assets/monsters/${id}-320.webp`;
      await sharp(await sharp(source).extract({left,top,width,height}).png().toBuffer()).trim().resize(600,600,{fit:'contain',background:'#00000000'}).extend({top:20,bottom:20,left:20,right:20,background:'#00000000'}).webp({quality:85,alphaQuality:100}).toFile(file);
      await sharp(file).resize(320,320).webp({quality:80,alphaQuality:100}).toFile(thumbnail);
      if ((await sharp(file).stats()).isOpaque) throw Error(`Opaque sprite: ${id}`);
      assets.push({ id, number:31+row*5+i, job:sheet.job_id, bytes:fs.statSync(file).size, thumbnailBytes:fs.statSync(thumbnail).size, thumbnailSha256:crypto.createHash('sha256').update(fs.readFileSync(thumbnail)).digest('hex'), sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') });
      contact.push({input:await sharp(file).resize(200,200).png().toBuffer(),left:i*200,top:row*200});
    }
  }
  await sharp({create:{width:1000,height:2000,channels:3,background:'#123248'}}).composite(contact).png().toFile(`${root}/asset-contact.png`);
  fs.writeFileSync('docs/monster-expansion-provenance.json',JSON.stringify({model:'gpt_image_2_5',quotedCredits:10,count:assets.length,thumbnailBytes:assets.reduce((n,a)=>n+a.thumbnailBytes,0),bytes:assets.reduce((n,a)=>n+a.bytes,0),assets},null,2));
  console.log({count:assets.length,thumbnailBytes:assets.reduce((n,a)=>n+a.thumbnailBytes,0),bytes:assets.reduce((n,a)=>n+a.bytes,0)});
})();
