const jobs=load("wave4videoJobs"),old=load("wave4videoStatus"),terminal=new Set(["completed","failed","nsfw","canceled","ip_detected"]);
const pending=jobs.filter(j=>!old.some(s=>s.job_id===j.job_id&&terminal.has(s.status)));
if(!pending.length){text({completed:old.filter(s=>s.status==="completed").length,allSubmittedTerminal:true});return true;}
const r=(await tools.mcp__codex_apps__higgsfield_jobs_wait({jobs:pending.map(({index,job_id})=>({index,job_id})),timeout_seconds:15})).structuredContent;
const results=[...new Map([...old,...r.jobs].map(j=>[j.index,j])).values()];store("wave4videoStatus",results);
const quote=s=>"'"+s.replaceAll("'","'\\''")+"'";
await tools.exec_command({cmd:"python3 -c 'import pathlib,sys;p=pathlib.Path(sys.argv[1]);t=p.with_suffix(\".tmp\");t.write_text(sys.argv[2]);t.replace(p)' outputs/monster-wave4/video-jobs.json "+quote(JSON.stringify({jobs,results},null,2)),max_output_tokens:100});
text({...r.summary,totalCompleted:results.filter(s=>s.status==="completed").length});return r.all_terminal;