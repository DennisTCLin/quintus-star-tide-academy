// Run with NODE_PATH pointing to an installed sharp package. No runtime dependency.
const sharp = require('sharp');
const fs = require('node:fs');
const crypto = require('node:crypto');
const root = 'outputs/creatures-simple';
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
(async () => {
  const designs = JSON.parse(fs.readFileSync(`${root}/designs.json`));
  const jobs = JSON.parse(fs.readFileSync(`${root}/results.json`));
  const assets = [], contact = [];
  fs.mkdirSync('public/assets/creatures-sixty', {recursive:true});
  for (const j of jobs) {
    const source = `${root}/sources/sheet-${String(j.index).padStart(2,'0')}.png`;
    const {data,info} = await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    const {width:w,height:h,channels:c} = info;
    const alpha = (x,y) => data[(y*w+x)*c+c-1];
    const valley = (from,to,score) => {
      let best = Math.round((from+to)/2), value=Infinity;
      for(let n=Math.round(from);n<=Math.round(to);n++) {
        const v=score(n)+Math.abs(n-(from+to)/2)*0.0001;
        if(v<value){best=n;value=v;}
      }
      return best;
    };
    const split=valley(h*.43,h*.57,y=>{let n=0;for(let x=0;x<w;x++)if(alpha(x,y)>30)n++;return n;});
    for(const d of designs.filter(d=>d.sheet===j.index)) {
      const top=d.cell<3?0:split,bottom=d.cell<3?split:h;
      const score=x=>{let n=0;for(let y=top;y<bottom;y++)if(alpha(x,y)>30)n++;return n;};
      const cut1=j.index===5?Math.round(w*.36):valley(w*.29,w*.37,score),cut2=valley(w*.62,w*.71,score);
      const col=d.cell%3, left=col===0?0:col===1?cut1:cut2;
      const right=col===0?cut1:(col===1&&d.cell<3)?cut2:w;
      // Separate small bleed-through pieces from adjacent cells before packing.
      // Connected alpha separates cell bleed; a small fringe preserves fine fur.
      const cw=right-left,ch=bottom-top,labels=new Int32Array(cw*ch),parts=[];
      let label=0;
      for(let sy=0;sy<ch;sy++)for(let sx=0;sx<cw;sx++){
        const start=sy*cw+sx;if(labels[start]||alpha(left+sx,top+sy)<30)continue;
        const pixels=[start];labels[start]=++label;let edge=false;
        for(let q=0;q<pixels.length;q++){
          const n=pixels[q],x=n%cw,y=Math.floor(n/cw);if(x===0||x===cw-1||y===0||y===ch-1)edge=true;
          for(const [nx,ny] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]])if(nx>=0&&nx<cw&&ny>=0&&ny<ch){const k=ny*cw+nx;if(!labels[k]&&alpha(left+nx,top+ny)>=30){labels[k]=label;pixels.push(k);}}
        }
        parts.push({label,pixels,edge});
      }
      const largest=Math.max(...parts.map(p=>p.pixels.length)),mask=Buffer.alloc(cw*ch);
      for(const p of parts)if(p.pixels.length>=largest*(p.edge?.08:.001))for(const n of p.pixels)mask[n]=255;
      const fringe=await sharp(mask,{raw:{width:cw,height:ch,channels:1}}).dilate(3).blur(1).toColourspace('b-w').raw().toBuffer();
      const pixels=Buffer.alloc(cw*ch*4);let minX=right,maxX=left,minY=bottom,maxY=top;
      for(let y=0;y<ch;y++)for(let x=0;x<cw;x++){
        const src=((top+y)*w+left+x)*c,dst=(y*cw+x)*4;
        for(let k=0;k<3;k++)pixels[dst+k]=data[src+k];
        const a=Math.round(alpha(left+x,top+y)*fringe[y*cw+x]/255);pixels[dst+3]=a;
        if(a>5){minX=Math.min(minX,left+x);maxX=Math.max(maxX,left+x);minY=Math.min(minY,top+y);maxY=Math.max(maxY,top+y);}
      }
      if(maxX<=minX||maxY<=minY)throw Error(`Empty sprite ${d.id}`);
      const bounds=[minX,minY,maxX,maxY];
      const edgeDistance=Math.min(minX-left,right-1-maxX,minY-top,bottom-1-maxY);
      const crop=await sharp(pixels,{raw:{width:cw,height:ch,channels:4}}).extract({left:minX-left,top:minY-top,width:maxX-minX+1,height:maxY-minY+1}).png().toBuffer();
      const files=[];
      for(const size of [640,320]){
        const suffix=size===640?'':'-320';
        const path=`public/assets/creatures-sixty/${d.id}${suffix}.webp`;
        const pad=size===640?24:12;
        const bytes=await sharp(crop).resize(size-pad*2,size-pad*2,{fit:'contain',background:'#00000000'}).extend({top:pad,bottom:pad,left:pad,right:pad,background:'#00000000'}).webp({quality:size===640?85:80,alphaQuality:100}).toBuffer();
        fs.writeFileSync(path,bytes);files.push({path,bytes:bytes.length,sha256:hash(bytes),size});
      }
      assets.push({id:d.id,sheet:j.index,jobId:j.job_id,sourceSha256:hash(fs.readFileSync(source)),bounds,edgeDistance,files});
      contact.push({input:await sharp(files[0].path).resize(190,190).png().toBuffer(),left:((j.index-1)%6)*200,top:Math.floor((j.index-1)/6)*1000+d.cell*200});
    }
  }
  await sharp({create:{width:1200,height:2000,channels:3,background:'#123248'}}).composite(contact).png().toFile(`${root}/contact.png`);
  fs.writeFileSync(`${root}/assets.json`,JSON.stringify({model:'built-in-imagegen',style:'approved-simplified',count:assets.length,assets},null,2));
  console.log(JSON.stringify({count:assets.length,bytes:assets.flatMap(a=>a.files).reduce((n,f)=>n+f.bytes,0),nearEdges:assets.filter(a=>a.edgeDistance<2).map(a=>({id:a.id,edgeDistance:a.edgeDistance}))}));
})();
