import {pathToFileURL} from 'node:url';
const root=process.cwd();const {createCloudApi}=await import(pathToFileURL(root+'/server/cloud.mjs'));const {createAppServer}=await import(pathToFileURL(root+'/server.mjs'));const {provisionAdmin}=await import(pathToFileURL(root+'/server/admin.mjs'));const {provisionChildAccount}=await import(pathToFileURL(root+'/server/child-account.mjs'));const {passwordHash}=await import(pathToFileURL(root+'/server/credentials.mjs'));const {randomUUID}=await import('node:crypto');
const api=await createCloudApi({connectionString:'postgresql://127.0.0.1:55432/star_tide_admin_trial_ui_20261027',production:false});await provisionAdmin(api.pool,{username:'trial_super_qa',password:'Synthetic-admin-trial-2026'});
await provisionChildAccount(api.pool,{username:'trial_g6',password:'0047',displayName:'六年級試用',grade:6});
await api.pool.query("INSERT INTO admin_users(id,username,display_name,password_hash,role,enabled,student_scope,can_grant,must_change_password) VALUES($1,'trial_staff_qa','Synthetic Staff',$2,'staff',true,'all',true,false) ON CONFLICT(username) DO NOTHING",[randomUUID(),await passwordHash('Synthetic-admin-trial-2026',undefined,10)]);
await api.pool.query('DELETE FROM request_limits');
const server=createAppServer({api});await new Promise(r=>server.listen(47888,'127.0.0.1',r));console.log('READY local synthetic trial admin UI');
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,async()=>{await new Promise(r=>server.close(r));await api.close();process.exit()});
