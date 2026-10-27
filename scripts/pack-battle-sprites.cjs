// Usage: NODE_PATH=<sharp directory> node scripts/pack-battle-sprites.cjs <pet>
// Input: outputs/battle-performance/<pet>-{idle,attack}.mp4
// Keyed frames share one union crop and anchor: no per-frame recentering/jitter.
const fs=require('node:fs');const path=require('node:path');const {execFileSync}=require('node:child_process');const sharp=require('sharp');
// Generated motion can leave detached particles or compression patches in the
// key color. Keep the connected character, then preserve its antialiased edge.
function characterMask(data,width,height){
 const count=width*height,seen=new Uint8Array(count),queue=new Int32Array(count);let largest=new Int32Array(0),discarded=0;
 for(let seed=0;seed<count;seed++){
  if(seen[seed]||data[seed*4+3]<=64)continue;
  let head=0,tail=1;queue[0]=seed;seen[seed]=1;
  while(head<tail){const at=queue[head++],x=at%width,y=Math.floor(at/width);
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=width||ny>=height)continue;
    const next=ny*width+nx;if(!seen[next]&&data[next*4+3]>64){seen[next]=1;queue[tail++]=next;}
   }
  }
  if(tail>largest.length){discarded+=largest.length;largest=queue.slice(0,tail);}else discarded+=tail;
 }
 if(largest.length<count*.01)throw Error('No complete character found');
 const keep=new Uint8Array(count);
 for(const at of largest){const x=at%width,y=Math.floor(at/width);for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const nx=x+dx,ny=y+dy;if(nx>=0&&ny>=0&&nx<width&&ny<height)keep[ny*width+nx]=1;}}
 for(let i=0;i<count;i++)if(!keep[i])data[i*4+3]=0;
 return discarded;
}
(async()=>{
 const pet=process.argv[2];if(!/^[a-z]+$/.test(pet||''))throw Error('Expected companion id');
 const root='outputs/battle-performance',output='public/assets/battle';const clips=[];
 let left=Infinity,top=Infinity,right=0,bottom=0;let boundaryPixels=0,detachedPixelsRemoved=0;
 for(const kind of ['idle','attack']){
  const dir=path.join(root,`${pet}-${kind}-frames`);fs.mkdirSync(dir,{recursive:true});
  for(const filename of fs.readdirSync(dir))if(/^(clean-)?\d{4}\.png$/.test(filename))fs.unlinkSync(path.join(dir,filename));
  execFileSync('ffmpeg',['-v','error','-y','-i',path.join(root,`${pet}-${kind}.mp4`),'-vf','format=rgba,colorkey=0xff00ff:0.3:0.12','-fps_mode','passthrough',path.join(dir,'%04d.png')]);
  const all=fs.readdirSync(dir).filter(f=>/^\d{4}\.png$/.test(f)).sort();
  const selected=Array.from({length:24},(_,i)=>all[Math.round(i*(all.length-1)/23)]);const frames=[];
  for(const filename of selected){
   const file=path.join(dir,filename);const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
   detachedPixelsRemoved+=characterMask(data,info.width,info.height);
   // This clip includes a hand glow outside the complete character silhouette.
   // Feather only its last 80px (visually checked: paws end before this band).
   if(pet==='pebblefin'&&kind==='attack')for(let y=0;y<info.height;y++)for(let x=info.width-80;x<info.width;x++){
    const fade=Math.max(0,(info.width-3-x)/77);data[(y*info.width+x)*4+3]*=fade*fade;
   }
   const clean=path.join(dir,`clean-${filename}`);await sharp(data,{raw:info}).png().toFile(clean);
   let count=0;
   for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>8){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x+1);bottom=Math.max(bottom,y+1);count++;if(data[(y*info.width+x)*4+3]>128&&(x<2||y<2||x>=info.width-2||y>=info.height-2))boundaryPixels++;}
   if(!count)throw Error(`Blank frame ${file}`);
   frames.push({file:clean,width:info.width,height:info.height});
  }
  clips.push({kind,frames});
 }
 if(boundaryPixels>0)throw Error(`${pet}: subject clips canvas (${boundaryPixels} edge pixels); reject source`);
 const size=Math.ceil(Math.max(right-left,bottom-top)*1.09);
 const cx=(left+right)/2,cy=(top+bottom)/2;
 const crop={left:Math.max(0,Math.floor(cx-size/2)),top:Math.max(0,Math.floor(cy-size/2)),width:size,height:size};
 const result={pet,boundaryPixels,detachedPixelsRemoved,effectEdgeFadePixels:pet==='pebblefin'?{attackRight:80}:null,crop,clips:[]};
 for(const {kind,frames}of clips){
  const cells=[];
  for(let i=0;i<frames.length;i++){
   const frame=frames[i];const padded=await sharp(frame.file).extend({top:0,left:0,right:Math.max(0,crop.left+size-frame.width),bottom:Math.max(0,crop.top+size-frame.height),background:{r:0,g:0,b:0,alpha:0}}).toBuffer();
   cells.push({input:await sharp(padded).extract(crop).resize(320,320).png().toBuffer(),left:(i%6)*320,top:Math.floor(i/6)*320});
  }
  const file=`${pet}-${kind}.webp`;await sharp({create:{width:1920,height:1280,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(cells).webp({quality:88,alphaQuality:100}).toFile(path.join(output,file));
  result.clips.push({kind,src:`/assets/battle/${file}`,columns:6,rows:4,frames:24,bytes:fs.statSync(path.join(output,file)).size});
  await sharp(cells[0].input).flatten({background:'#12344a'}).toFile(path.join(root,`${pet}-${kind}-first.png`));
  await sharp({create:{width:960,height:640,channels:4,background:'#12344a'}}).composite([0,4,8,12,18,23].map((n,i)=>({input:cells[n].input,left:(i%3)*320,top:Math.floor(i/3)*320}))).png().toFile(path.join(root,`${pet}-${kind}-contact.png`));
 }
 fs.writeFileSync(path.join(root,`${pet}-atlas.json`),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
