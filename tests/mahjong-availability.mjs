// Rule-derived visual availability, including real controller Undo/reload.
// Browser screenshots separately establish the actual appearance.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {mahjong,mahjongBlockReason,freeTile} from '../dist/games/classics.js';
import {clone} from '../dist/games/core.js';
import {boot} from './progression.mjs';
let checks=0;
function test(name,fn){fn();checks++;console.log('PASS '+name);}
function verify(s,html=mahjong.view(s)){
 const rendered=[...html.matchAll(/<button class="([^"]*mahjong-tile[^"]*)" data-action="tile" data-value="(\d+)"([^>]*)>/g)];
 assert.equal(rendered.length,s.tiles.filter(t=>!t.gone).length);
 for(const [,classes,id,attrs] of rendered){const reason=mahjongBlockReason(s,+id);assert(classes.split(/\s+/).includes(reason));assert.equal(reason==='free',freeTile(s,+id));assert(attrs.includes(reason==='free'?', free':reason==='covered'?'covered by an upper tile':'both side exits blocked'));}
 return rendered;
}
test('Every live tile derives its visible availability from exact Mahjong selection rules',()=>{
 for(let n=0;n<50;n++){const s=mahjong.create();verify(s);assert(s.tiles.some((_,i)=>mahjongBlockReason(s,i)==='covered'));assert(s.tiles.some((_,i)=>mahjongBlockReason(s,i)==='side-blocked'));}
});
test('Both blocked reasons reject selection and preserve all tiles',()=>{
 const s=mahjong.create();for(const reason of ['covered','side-blocked']){const i=s.tiles.findIndex((_,i)=>mahjongBlockReason(s,i)===reason),before=JSON.stringify(s.tiles);assert.equal(mahjong.action(s,'tile',i),false);assert.equal(s.selected,null);assert.equal(JSON.stringify(s.tiles),before);verify(s);}
});
test('Complete legal removals restore newly freed tiles without hinting matching partners',()=>{
 let newlyFree=0;
 for(let n=0;n<20;n++){const s=mahjong.create(),route=clone(s.solution);for(const [a,b] of route){const before=s.tiles.map((_,i)=>freeTile(s,i));mahjong.action(s,'tile',a);assert.doesNotMatch(mahjong.view(s),/matching-tile|blocking-tile/);assert.equal(mahjong.action(s,'tile',b),true);newlyFree+=s.tiles.filter((t,i)=>!t.gone&&!before[i]&&freeTile(s,i)).length;verify(s);}assert(mahjong.won(s));}assert(newlyFree>0);
});
test('Controller removal, Undo and reload recompute identical visual availability',()=>{
 const t=boot({hash:'#mahjong'});t.ctx.handle('new');t.ctx.handle('confirm');let r=t.ctx.inspect().saves.mahjong;const before=clone(r.state),[a,b]=r.state.solution[0];verify(r.state,t.app.innerHTML);t.ctx.handle('tile',a);t.ctx.handle('tile',b);r=t.ctx.inspect().saves.mahjong;assert.equal(r.moves,1);verify(r.state,t.app.innerHTML);const after=JSON.stringify(r.state.tiles);let u=boot({store:t.store,hash:'#mahjong'});assert.equal(JSON.stringify(u.ctx.inspect().saves.mahjong.state.tiles),after);verify(u.ctx.inspect().saves.mahjong.state,u.app.innerHTML);u.ctx.handle('undo');assert.equal(JSON.stringify(u.ctx.inspect().saves.mahjong.state.tiles),JSON.stringify(before.tiles));verify(u.ctx.inspect().saves.mahjong.state,u.app.innerHTML);const v=boot({store:u.store,hash:'#mahjong'});verify(v.ctx.inspect().saves.mahjong.state,v.app.innerHTML);
});
test('Grey styling targets unavailable tiles only and keeps faces and depth intact',()=>{
 const css=fs.readFileSync(new URL('../dist/style.css',import.meta.url),'utf8');assert.match(css,/\.club-room \.depth-board \.mahjong-tile:is\(\.covered,\.side-blocked\)\{[^}]*filter:grayscale\(1\)/);assert.match(css,/\.depth-board \.mahjong-tile\{[^}]*background:linear-gradient/);assert.match(css,/\.club-room \.tube\.selected\{outline-color:var\(--room-accent\)!important\}/);assert.doesNotMatch(css.slice(css.indexOf('/* 1.12.2:')),/display:none|opacity:\.\d|pointer-events:none/);
});
console.log(`MAHJONG AVAILABILITY TESTS PASSED (${checks})`);
