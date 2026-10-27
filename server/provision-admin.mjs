// Read the password only from stdin, never command arguments or source defaults.
import pg from 'pg';
import {provisionAdmin} from './admin.mjs';
let pool;
try {
  const args=process.argv.slice(2);
  if(args.length!==2 || args[0]!=='--username' || !process.env.DATABASE_URL) throw Error('使用 --username 帳號，透過 stdin 輸入密碼，並設定 DATABASE_URL');
  let password='';
  for await(const chunk of process.stdin) {password+=chunk.toString();if(password.length>256)throw Error('輸入太長');}
  password=password.replace(/\r?\n$/,'');
  pool=new pg.Pool({connectionString:process.env.DATABASE_URL,max:1});
  console.log(JSON.stringify(await provisionAdmin(pool,{username:args[1],password})));
  password='';
} catch(e) {console.error(e.code ? '管理員建立失敗，請檢查部署連線' : e.message);process.exitCode=1;}
finally {await pool?.end();}
