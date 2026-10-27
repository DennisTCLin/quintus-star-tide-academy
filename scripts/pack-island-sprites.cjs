// Video encoding pipeline. Sources: outputs/island-animation/<pet>-<idle|walk|play>.mp4.
// One shared crop preserves source ground anchors across all frames and states.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process'),sharp=require('sharp');
const root='outputs/island-animation',out='public/assets/island-motion',cell=160,columns=6;
function clean(data,width,height) {
 // Chroma shadows vary in luminance, so RGB distance alone can leave a purple
 // puddle beneath the feet. Remove the magenta hue before component cleanup.
 for(let i=0;i<data.length;i+=4){const r=data[i],g=data[i+1],b=data[i+2];if(r>g*1.5+12&&b>g*1.5+12&&r>b*.65&&b>r*.65)data[i+3]=0;}
 const count=width*height,seen=new Uint8Array(count),queue=new Int32Array(count);let largest=[];
 for(let seed=0;seed<count;seed++) {
  if(seen[seed]||data[seed*4+3]<=64)continue;
  let head=0,tail=1;queue[0]=seed;seen[seed]=1;
  while(head<tail){const at=queue[head++],x=at%width,y=Math.floor(at/width);
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
    const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=width||ny>=height)continue;
    const n=ny*width+nx;if(!seen[n]&&data[n*4+3]>64){seen[n]=1;queue[tail++]=n;}
   }
  }
  if(tail>largest.length)largest=queue.slice(0,tail);
 }
 if(largest.length<count*.01)throw Error('Blank or incomplete subject');
 const keep=new Uint8Array(count);
 for(const at of largest){const x=at%width,y=Math.floor(at/width);for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const nx=x+dx,ny=y+dy;if(nx>=0&&ny>=0&&nx<width&&ny<height)keep[ny*width+nx]=1;}}
 let left=width,top=height,right=0,bottom=0,edge=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const at=(y*width+x)*4;if(!keep[y*width+x])data[at+3]=0;
  if(data[at+3]>16){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x+1);bottom=Math.max(bottom,y+1);if(x<2||y<2||x>=width-2||y>=height-2)edge++;}
 }
 if(edge)throw Error(`Clipped subject: ${edge} boundary pixels`);
 return {left,top,right,bottom};
}
(async()=>{
 const pet=process.argv[2];if(!/^[a-z]+$/.test(pet||''))throw Error('Expected companion id');
 fs.mkdirSync(out,{recursive:true});const clips=[];let left=Infinity,top=Infinity,right=0,bottom=0;
 for(const kind of ['idle','walk','play']) {
  const dir=path.join(root,`${pet}-${kind}-frames`);fs.mkdirSync(dir,{recursive:true});
  for(const name of fs.readdirSync(dir))if(/^\d{4}\.png$/.test(name))fs.unlinkSync(path.join(dir,name));
  execFileSync('ffmpeg',['-v','error','-y','-i',path.join(root,`${pet}-${kind}.mp4`),'-t','4','-vf','fps=12,format=rgba,colorkey=0xff00ff:0.3:0.12',path.join(dir,'%04d.png')]);
  const frames=[];
  for(const name of fs.readdirSync(dir).filter(n=>/^\d{4}\.png$/.test(n)).sort()) {
   const {data,info}=await sharp(path.join(dir,name)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
   const bounds=clean(data,info.width,info.height);
   left=Math.min(left,bounds.left);top=Math.min(top,bounds.top);right=Math.max(right,bounds.right);bottom=Math.max(bottom,bounds.bottom);
   frames.push({data,info,bounds});
  }
  if(frames.length!==48)throw Error(`${kind}: expected 48 frames, got ${frames.length}`);
  // Reviewed matching foot poses: trim the generated start/stop to a real loop.
  const window=pet==='tideglow'?[11,29]:pet==='cometcrane'?[7,30]:null;
  clips.push({kind,frames:kind==='walk'&&window?frames.slice(...window):frames});
 }
 const size=Math.ceil(Math.max(right-left,bottom-top)*1.08);
 // Feet align near 96% of the cell. No per-frame recentering or pose scaling.
 const crop={left:Math.max(0,Math.round((left+right-size)/2)),top:Math.max(0,Math.round(bottom-size*.96)),width:size,height:size};
 const metadata={pet,crop,cell,clips:{}};
 for(const {kind,frames}of clips) {
  const cells=[];
  for(let i=0;i<frames.length;i++){
   const {data,info}=frames[i];const input=await sharp(data,{raw:info}).extend({top:0,left:0,right:Math.max(0,crop.left+size-info.width),bottom:Math.max(0,crop.top+size-info.height),background:{r:0,g:0,b:0,alpha:0}}).extract(crop).resize(cell,cell).png().toBuffer();
   cells.push({input,left:i%columns*cell,top:Math.floor(i/columns)*cell});
  }
  const rows=Math.ceil(frames.length/columns),file=`${pet}-${kind}.webp`,dest=path.join(out,file);
  await sharp({create:{width:columns*cell,height:rows*cell,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite(cells).webp({quality:88,alphaQuality:100}).toFile(dest);
  const hash=crypto.createHash('sha256').update(fs.readFileSync(dest)).digest('hex');
  metadata.clips[kind]={src:`/assets/island-motion/${file}?v=${hash.slice(0,12)}`,columns,rows,frames:frames.length,cell,seconds:frames.length/12};
  await sharp({create:{width:cell*6,height:cell*2,channels:4,background:'#78965b'}}).composite(Array.from({length:12},(_,i)=>({input:cells[Math.round(i*(cells.length-1)/11)].input,left:i%6*cell,top:Math.floor(i/6)*cell}))).png().toFile(path.join(root,`${pet}-${kind}-keyed-contact.png`));
 }
 fs.writeFileSync(path.join(root,`${pet}-atlas.json`),JSON.stringify(metadata,null,2));console.log(JSON.stringify(metadata));
})().catch(e=>{console.error(e);process.exitCode=1;});
