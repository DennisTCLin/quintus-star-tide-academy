// Static production server only. Browser routes provide synthetic API responses.
import {createAppServer} from '../../server.mjs';
const server=createAppServer();server.listen(4334,'127.0.0.1');
process.on('SIGTERM',()=>server.close(()=>process.exit(0)));
