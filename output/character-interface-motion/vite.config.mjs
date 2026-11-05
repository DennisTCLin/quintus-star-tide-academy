import react from '@vitejs/plugin-react';
import {readFile} from 'node:fs/promises';
export default {plugins:[react(),{name:'local-only-delayed-portrait',configureServer(server){server.middlewares.use((req,res,next)=>{if(!req.url.startsWith('/fixture-delayed.webp'))return next();setTimeout(async()=>{res.setHeader('Content-Type','image/webp');res.setHeader('Cache-Control','no-store');res.end(await readFile('public/assets/conquest/portraits/hero-elf.webp'));},8000);});}}],server:{host:'127.0.0.1',port:4374,strictPort:true,proxy:{}}};
