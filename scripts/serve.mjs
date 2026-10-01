import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(fileURLToPath(new URL('../dist/',import.meta.url))),port=Number(process.env.PORT||4173);
const parts=(process.argv.find(x=>x.startsWith('--base='))?.slice(7)||'/').split('/').filter(Boolean),base='/'+parts.join('/')+(parts.length?'/':'');
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
http.createServer(async(req,res)=>{if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}try{const p=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(base!=='/'&&p===base.slice(0,-1)){res.writeHead(302,{Location:base}).end();return;}if(!p.startsWith(base)){res.writeHead(404).end();return;}const file=resolve(root,p.slice(base.length)||'index.html');if(file!==root&&!file.startsWith(root+sep)){res.writeHead(403).end();return;}if(!(await stat(file)).isFile()){res.writeHead(404).end();return;}const bytes=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-store'}).end(req.method==='HEAD'?undefined:bytes);}catch{res.writeHead(404).end('Not found');}}).listen(port,'127.0.0.1',()=>console.log(`Pocket Puzzle Club: http://localhost:${port}${base}`));
