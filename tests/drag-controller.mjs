// Controller test verifies the real integration, not a second mutation path.
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import crypto from 'node:crypto';
import {games as classics} from '../dist/games/classics.js';import {games as modern} from '../dist/games/modern.js';import {games as logic} from '../dist/games/logic.js';import {clone,button} from '../dist/games/core.js';import {commitDrag,installDragControls} from '../dist/drag.js';
const source=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8').replace(/^import .*;$/gm,'')+'\nglobalThis.inspect=()=>({saves,current,paused,confirmAction});globalThis.handle=handle;globalThis.persist=persist;';
function boot(store=new Map()){
 let html='',element={focus(){},dataset:{}};const app={get innerHTML(){return html},set innerHTML(x){html=x},addEventListener(){},querySelector(){return element},querySelectorAll(){return[]}};
 const ctx={commitDrag,installDragControls,classics,modern,logic,clone,button,console,crypto,URLSearchParams,matchMedia:()=>({matches:true}),navigator:{webdriver:true},history:{pushState(){}},location:{hash:'',hostname:'localhost',search:'?qa=1'},performance:{now:()=>5000},localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},document:{querySelector:()=>app,addEventListener(){},hidden:false,referrer:'',activeElement:element},window:{addEventListener(){},scrollTo(){}},setInterval(){}};
 vm.createContext(ctx);vm.runInContext(source,ctx);return {ctx,app,store};
}
const get=t=>t.ctx.inspect().saves.blocks;
const gesture=r=>({gameId:'blocks',runId:r.runId,expected:JSON.stringify(r.state),piece:0,anchor:0});
const t=boot();t.ctx.handle('open','blocks');let r=get(t);r.state.pieces=[[[0,0],[1,0]],[[0,0]],[[0,0]]];r.state.selected=2;r.state.anchor=25;t.ctx.persist();
const before=JSON.stringify(r.state),d=gesture(r);t.ctx.handle('drag',d);
assert.equal(r.moves,1);assert.equal(r.history.length,1);assert.equal(JSON.stringify(r.history[0].state),before);assert.equal(r.state.score,2);
assert.equal(JSON.parse(t.store.get('pocket-puzzle-qa-v1')).saves.blocks.moves,1);assert.equal(t.store.has('pocket-puzzle-v1'),false);
t.ctx.handle('drag',d);assert.equal(r.moves,1,'a duplicate/stale dispatch cannot count twice');
t.ctx.handle('undo');assert.equal(r.moves,0);assert.equal(JSON.stringify(r.state),before);
console.log('PASS controller: one legal drop = one move, exact Undo snapshot, persisted QA save, duplicate drop rejected');
for(const reason of ['invalid','paused','dialog','help','settings']){
 r=get(t);const value=gesture(r);if(reason==='invalid')value.anchor=7;if(reason==='paused')t.ctx.handle('pause');if(reason==='dialog')t.ctx.handle('new');if(reason==='help'||reason==='settings')t.ctx.handle(reason);
 const prior=JSON.stringify(r.state),moves=r.moves,history=r.history.length;t.ctx.handle('drag',value);assert.equal(JSON.stringify(r.state),prior,reason);assert.equal(r.moves,moves,reason);assert.equal(r.history.length,history,reason);
 if(reason==='paused')t.ctx.handle('pause');if(reason==='dialog')t.ctx.handle('cancel');if(reason==='help'||reason==='settings')t.ctx.handle(reason);
}
console.log('PASS controller: invalid, paused, help, settings and confirmation-modal drops cannot mutate or add history');
const store=new Map(),a=boot(store),b=boot(store);a.ctx.handle('open','blocks');a.ctx.persist();b.ctx.handle('open','blocks');const stale=gesture(get(b));a.ctx.handle('new');a.ctx.handle('confirm');const next=JSON.stringify(get(a).state),run=get(a).runId;b.ctx.handle('drag',stale);assert.equal(get(b).runId,run);assert.equal(JSON.stringify(get(b).state),next);assert.equal(get(b).moves,0);assert.match(b.app.innerHTML,/another tab/);
console.log('PASS controller: remote replacement is synchronized before drag application and rejects the stale gesture');
console.log('DRAG CONTROLLER TESTS PASSED (VM harness, not browser visual QA)');
