// LAN-only preview backed exclusively by the existing isolated synthetic QA database.
import {createCloudApi} from '../../server/cloud.mjs';
import {cpSync,copyFileSync,mkdtempSync,constants} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const snapshot=mkdtempSync(join(tmpdir(),'harbor-ipad-frozen-'));
cpSync(resolve('dist'),join(snapshot,'dist'),{recursive:true,mode:constants.COPYFILE_FICLONE});
copyFileSync(resolve('server.mjs'),join(snapshot,'server.mjs'));
const {createAppServer}=await import(pathToFileURL(join(snapshot,'server.mjs')).href);
const api=await createCloudApi({connectionString:'postgres://127.0.0.1:55432/harbor_first_screen_20261026',production:false});
const server=createAppServer({api:(req,res)=>{
 if(req.url?.startsWith('/api/dragon/')){res.writeHead(503,{'Content-Type':'application/json'});res.end('{"error":"測試版本未啟用 AI 對話"}');return;}
 return api(req,res);
}});
await new Promise(r=>server.listen(4374,'0.0.0.0',r));console.log('Synthetic iPad preview ready on LAN port4374');
process.on('SIGTERM',()=>server.close(()=>api.close().then(()=>process.exit(0))));
