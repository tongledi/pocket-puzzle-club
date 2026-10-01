// Focus/keyboard and markup regressions. DOM doubles are not browser evidence.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {games as classics} from '../dist/games/classics.js';
import {games as modern,blocks,blockShapeLabel} from '../dist/games/modern.js';
import {games as logic} from '../dist/games/logic.js';
import {clone,button} from '../dist/games/core.js';
import {commitDrag,installDragControls} from '../dist/drag.js';
const source=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8').replace(/^import .*;$/gm,'')+'\nglobalThis.inspect=()=>({saves,blockFocusCell,paused});Object.assign(globalThis,{handle,render});';
let checks=0;function test(name,fn){fn();checks++;console.log('PASS',name);}
function boot(){
  const events={},store=new Map();let html='',nodes=[],ctx;
  function match(n,s){return [...s.matchAll(/\[data-(action|value)="([^"]*)"\]/g)].every(m=>n.dataset[m[1]]===m[2]);}
  const fallback={dataset:{},focus(){ctx.document.activeElement=this;}};
  const app={get innerHTML(){return html;},set innerHTML(value){html=value;nodes=[...html.matchAll(/<button\b([^>]*)>/g)].map(m=>{const attr=m[1],get=k=>attr.match(new RegExp(k+'="([^"]*)"'))?.[1];return {dataset:{action:get('data-action'),value:get('data-value')},disabled:/\bdisabled\b/.test(attr),tabIndex:Number(get('tabindex')??0),focus(){if(!this.disabled)ctx.document.activeElement=this;}};});},addEventListener(){},querySelectorAll(s){return s==='[data-action]'?nodes:[];},querySelector(s){return s.startsWith('[data-')?nodes.find(n=>match(n,s)):fallback;}};
  ctx={commitDrag,installDragControls,classics,modern,logic,clone,button,crypto,console,URLSearchParams,navigator:{webdriver:true},location:{hostname:'localhost',search:'?qa=1',hash:''},history:{pushState(){}},performance:{now:()=>1000},localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},matchMedia:()=>({matches:true}),document:{querySelector:()=>app,addEventListener:(k,f)=>events[k]=f,activeElement:fallback,hidden:false,referrer:''},window:{addEventListener(){},scrollTo(){}},setInterval(){}};
  vm.createContext(ctx);vm.runInContext(source,ctx);ctx.handle('open','blocks');
  const r=ctx.inspect().saves.blocks;r.state={cells:Array(64).fill(0),pieces:[[[0,0]],[[0,0],[1,0]],[[0,0],[1,0],[0,1],[1,1]]],selected:0,score:0,lines:0,message:''};ctx.render();
  return {ctx,app,r,store,node:(a,v)=>nodes.find(n=>n.dataset.action===a&&(v===undefined||n.dataset.value===String(v))),key(key,repeat=false){let prevented=false;events.keydown({key,repeat,preventDefault(){prevented=true;}});return prevented;},get nodes(){return nodes;}};
}
test('Block board has one Tab stop and shape names describe dimensions and orientation',()=>{
  const t=boot(),cells=t.nodes.filter(n=>n.dataset.action==='preview');assert.equal(cells.length,64);assert.equal(cells.filter(n=>n.tabIndex===0).length,1);assert.equal(cells.find(n=>n.tabIndex===0).dataset.value,'0');
  assert.match(t.app.innerHTML,/role="group" aria-label="Block placement board" aria-describedby="block-instructions"/);
  assert.equal(blockShapeLabel([[0,0]]),'single square');assert.equal(blockShapeLabel([[0,0],[1,0]]),'2-square horizontal line');assert.equal(blockShapeLabel([[0,0],[0,1],[0,2]]),'3-square vertical line');assert.equal(blockShapeLabel([[0,0],[1,0],[0,1],[1,1]]),'2 by 2 square');assert.match(blockShapeLabel([[0,0],[0,1],[1,1]]),/row 1 columns 1; row 2 columns 1, 2/);
});
test('Block arrows preview, clamp at edges, Home/End stay in row, Enter commits once and retains board focus',()=>{
  const t=boot();t.node('preview',0).focus();assert(t.key('ArrowRight'));assert.equal(t.r.state.anchor,1);assert.equal(t.ctx.document.activeElement.dataset.value,'1');assert.equal(t.r.moves,0);
  t.key('ArrowDown');assert.equal(t.r.state.anchor,9);t.key('Home');assert.equal(t.r.state.anchor,8);t.key('End');assert.equal(t.r.state.anchor,15);t.key('ArrowRight');assert.equal(t.r.state.anchor,15);
  t.key('Enter');assert.equal(t.r.moves,1);assert.equal(t.r.state.cells[15],1);assert.equal(t.ctx.document.activeElement.dataset.action,'preview');assert.equal(t.ctx.document.activeElement.dataset.value,'15');assert.equal(t.nodes.filter(n=>n.dataset.action==='preview'&&n.tabIndex===0).length,1);
  t.key('Enter',true);assert.equal(t.r.moves,1);t.key('ArrowRight');assert.equal(t.r.state.anchor,15);t.key('Enter');assert.equal(t.r.moves,1,'invalid footprint must not commit');
  assert(!JSON.stringify([...t.store.values()]).includes('focusCell'),'roving focus is UI state, not save schema');
});
test('Place button returns focus to the last board cell instead of Settings',()=>{
  const t=boot();t.ctx.handle('preview',18);t.node('place',18).focus();t.ctx.handle('place',18);assert.equal(t.r.moves,1);assert.equal(t.ctx.document.activeElement.dataset.action,'preview');assert.equal(t.ctx.document.activeElement.dataset.value,'18');
  t.ctx.handle('undo');assert.equal(t.r.moves,0);assert.equal(t.r.state.cells[18],0);
});
test('Block keyboard respects pause/modal boundaries and never steals arrow keys from piece controls',()=>{
  const t=boot();t.node('piece',1).focus();assert(!t.key('ArrowRight'));assert.equal(t.r.state.anchor,undefined);
  t.node('preview',0).focus();t.ctx.handle('pause');const before=JSON.stringify(t.r.state);assert(!t.key('ArrowRight'));assert.equal(JSON.stringify(t.r.state),before);t.ctx.handle('pause');t.ctx.handle('help');assert(!t.key('ArrowRight'));assert.equal(JSON.stringify(t.r.state),before);
});
console.log(`ADVERSARIAL INPUT TESTS PASSED (${checks}; DOM/keyboard doubles, not real assistive technology)`);
