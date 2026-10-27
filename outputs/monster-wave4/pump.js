const controlResult=await tools.exec_command({cmd:"cat outputs/monster-wave4/production-control.json",max_output_tokens:1000});const originalVideoLimit=JSON.parse(controlResult.output).originalVideoLimit;
const blocked=await tools.exec_command({cmd:"test -f outputs/monster-wave4/credit-block.json",max_output_tokens:20});if(blocked.exit_code===0){text("Credit blocker exists; polling-only until user resolves balance.");return "blocked";}

const terminal=new Set(["completed","failed","nsfw","canceled","ip_detected"]);
const quote=s=>"'"+s.replaceAll("'","'\\''")+"'";
for(const kind of ["video","redo"]){
 const jobs=load("wave4"+kind+"Jobs"),old=load("wave4"+kind+"Status");
 const pending=jobs.filter(j=>!old.some(s=>s.job_id===j.job_id&&terminal.has(s.status)));
 let updates=[];
 for(let i=0;i<pending.length;i+=8){const r=(await tools.mcp__codex_apps__higgsfield_jobs_wait({jobs:pending.slice(i,i+8).map(({index,job_id})=>({index,job_id})),timeout_seconds:0})).structuredContent;updates.push(...r.jobs);}
 const results=[...new Map([...old,...updates].map(j=>[j.index,j])).values()];store("wave4"+kind+"Status",results);
}
let active=0;for(const kind of ["video","redo"])active+=load("wave4"+kind+"Jobs").filter(j=>!load("wave4"+kind+"Status").some(s=>s.job_id===j.job_id&&terminal.has(s.status))).length;
const capacity=Math.max(0,6-active);
const pendingRedo=load("wave4redoIndices").filter(i=>!load("wave4redoJobs").some(j=>j.index===i));
const kind=pendingRedo.length?"redo":"video";
const missing=(kind==="redo"?pendingRedo:Array.from({length:originalVideoLimit},(_,i)=>i+1).filter(i=>!load("wave4videoJobs").some(j=>j.index===i))).slice(0,capacity);
if(missing.length){
 const p=load("wave4plan"),a=load("wave4actions");
 const requests=missing.map(index=>{
  const imageIndex=Math.floor((index-1)/5)+1;
  const ref=kind==="redo"?load("wave4reframeRefs").find(j=>j.index===imageIndex).media_id:load("wave4paddedRefs").find(j=>j.index===imageIndex)?.media_id??load("wave4imageJobs").find(j=>j.index===imageIndex).job_id;
  return {index,params:{...p.videoModelProposal,count:1,use_unlim:false,medias:[{role:"image",value:ref}],prompt:"Animate exactly the single creature in reference, preserve identity/materials/colors/anatomy. "+a[(index-1)%5][1]+" Fixed stationary full-body game camera, three-quarter facing left. "+(kind==="redo"?"Keep the reference's wide framing and generous empty margins. Entire creature including fully spread wings, tail tips, horns and weapons MUST remain inside the central 70 percent of frame at every moment. No approaching camera, no zoom, no crop. ":"Camera pulled back so complete creature occupies at most 70 percent of frame in every pose, generous margins; no cropping or zoom. ")+"Completely uniform pure bright magenta #FF00FF chromakey background throughout entire video, no ground, shadows, scenery, gradients, lettering or other characters. Magenta only background. Same design throughout. Smooth deliberate weighty motion."}};
 });
 const r=(await tools.mcp__codex_apps__higgsfield_generate_video_batch({context:"User capped the original animation batch at 150 clips (30 creatures). Seven previously approved reframing replacements have an additional 196-credit allowance; no further paid retries authorized.",requests})).structuredContent;
 if(r.failed_count){text({submissionErrors:r});await tools.exec_command({cmd:"python3 -c 'import pathlib,sys;p=pathlib.Path(sys.argv[1]);p.open(\"a\").write(sys.argv[2]+\"\\n\")' outputs/monster-wave4/submission-errors.jsonl "+quote(JSON.stringify(r)),max_output_tokens:200});}
 if(r.jobs.some(j=>(j.error??"").includes("Out of credits"))){await tools.exec_command({cmd:"python3 -c 'import pathlib;pathlib.Path(\"outputs/monster-wave4/credit-block.json\").write_text(\"{\\\"reason\\\":\\\"Higgsfield out of credits\\\"}\")'",max_output_tokens:100});}
 const jobs=load("wave4"+kind+"Jobs");jobs.push(...r.jobs.filter(j=>j.job_id));store("wave4"+kind+"Jobs",jobs);text({kind,submitted:r.submitted_count,rejected:r.failed_count});
}
for(const kind of ["video","redo"]){
 const jobs=load("wave4"+kind+"Jobs"),results=load("wave4"+kind+"Status");
 const file=kind==="redo"?"redo-video-jobs.json":"video-jobs.json";
 await tools.exec_command({cmd:"python3 -c 'import sys,pathlib;p=pathlib.Path(sys.argv[1]);t=p.with_suffix(\".tmp\");t.write_text(sys.argv[2]);t.replace(p)' outputs/monster-wave4/"+file+" "+quote(JSON.stringify({jobs,results},null,2)),max_output_tokens:500});
 text({kind,totalSubmitted:jobs.length,completed:results.filter(s=>s.status==="completed").length,failed:results.filter(s=>terminal.has(s.status)&&s.status!=="completed").length});
}
