import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../dist/',import.meta.url)),html=fs.readFileSync(path.join(root,'index.html'),'utf8'),app=fs.readFileSync(path.join(root,'app.js'),'utf8');
for(const base of ['https://preview.invalid/dist/','https://preview.invalid/pocket-puzzle-club/dist/']){for(const ref of [...html.matchAll(/(?:src|href)="([^"#][^"]*)"/g),...app.matchAll(/src="([^"#][^"]*)"/g)].map(x=>x[1]).filter(x=>!x.includes('${'))){assert(!ref.startsWith('/'));const url=new URL(ref,base);assert(url.href.startsWith(base));assert(fs.existsSync(path.join(root,decodeURIComponent(url.pathname.slice(new URL(base).pathname.length)))));}for(const file of ['app.js','drag.js',...fs.readdirSync(path.join(root,'games')).map(x=>'games/'+x)]){for(const [,ref] of fs.readFileSync(path.join(root,file),'utf8').matchAll(/from\s+['"]([^'"]+)['"]/g)){const url=new URL(ref,new URL(file,base));assert(url.href.startsWith(base));assert(fs.existsSync(path.join(root,decodeURIComponent(url.pathname.slice(new URL(base).pathname.length)))));}}}
assert(fs.readFileSync(new URL('../index.html',import.meta.url),'utf8').includes("new URL('./dist/',location.href)"));assert(fs.existsSync(new URL('../.nojekyll',import.meta.url)));assert(!fs.existsSync(new URL('../.openai',import.meta.url)));console.log('PASS root redirect, .nojekyll and subpath-relative assets/modules');

assert(html.includes('./app.js?v=1.4.0')&&html.includes('./style.css?v=1.4.0'));
console.log('PASS versioned app and CSS entries preserve relative asset resolution');

for (const id of ['solitaire','mahjong','water','blocks','arrows','sliding','words','sudoku']) {
 const art=fs.readFileSync(path.join(root,'art',id+'.svg'),'utf8');
 assert(art.includes('viewBox="0 0 720 480"'));
 assert(!/https?:\/\//.test(art.replace('http://www.w3.org/2000/svg','')),'cover must be self-contained');
}
console.log('PASS eight original self-contained game covers');
