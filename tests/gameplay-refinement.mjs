// Rules, real controller and synthetic animation checks. Not a physical touch test.
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import crypto from 'node:crypto';
import {games as classics,solitaire,solitaireTargets} from '../dist/games/classics.js';
import {games as modern,blocks,blockPlacement,blockOver} from '../dist/games/modern.js';
import {games as logic} from '../dist/games/logic.js';import {clone,button} from '../dist/games/core.js';import {commitDrag,installDragControls} from '../dist/drag.js';
let checks=0;function test(name,run){run();checks++;console.log('PASS',name);}
const source=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8').replace(/^import .*;$/gm,'')+'\nglobalThis.inspect=()=>({saves,current,bestScores,paused,confirmAction});Object.assign(globalThis,{handle,persist,render,animateBlocks});';
function boot({store=new Map(),hash='',reducedMotion=true}={}){
 let html='',time=0,element={dataset:{},focus(){}};const events={},ticks=[];
 const app={get innerHTML(){return html},set innerHTML(x){html=x},addEventListener(){},querySelector(){return element},querySelectorAll(){return[]}};
 const ctx={commitDrag,installDragControls,classics,modern,logic,clone,button,crypto,console,URLSearchParams,navigator:{webdriver:true},location:{hostname:'localhost',search:'?qa=1',hash},history:{pushState(){}},performance:{now:()=>time},localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},matchMedia:()=>({matches:reducedMotion}),document:{querySelector:()=>app,addEventListener(){},activeElement:element,hidden:false,referrer:''},window:{addEventListener:(k,f)=>events[k]=f,scrollTo(){}},setInterval:f=>ticks.push(f)};
 vm.createContext(ctx);vm.runInContext(source,ctx);return {ctx,app,store,events,advance:n=>time+=n,tick:()=>ticks[0]()};
}
const card=(rank,suit,up=true)=>({rank,suit,up});
const sol=()=>({tableau:[[],[],[],[],[],[],[]],foundation:[[],[],[],[]],stock:[],waste:[],selected:null,message:''});
const block=()=>({cells:Array(64).fill(0),pieces:[[[0,0]],[[0,0],[1,0]],[[0,0]]],selected:0,anchor:null,score:0,lines:0,message:''});
const round=t=>t.ctx.inspect().saves.blocks;
function setRound(t,state){t.ctx.handle('open','blocks');const r=round(t);r.state=clone(state);r.initial=clone(state);r.history=[];r.moves=0;r.finished=false;t.ctx.persist();t.ctx.render();return r;}
test('Solitaire target planning is pure but normal selection does not mark answers',()=>{
 const s=sol();s.waste=[card(1,0)];s.tableau[0]=[card(2,1)];s.selected='w';const before=JSON.stringify(s);
 assert.deepEqual(solitaireTargets(s),['f:0','t:0']);assert.equal(JSON.stringify(s),before);assert.equal((solitaire.view(s).match(/legal-destination/g)||[]).length,0);s.hintTarget='f:0';assert.equal((solitaire.view(s).match(/legal-destination/g)||[]).length,1);s.hintTarget=null;
 for(const invalid of ['f:99','f:no','t:99:0','t:0:99','t:0:-1','bad']){s.selected=invalid;assert.deepEqual(solitaireTargets(s),[]);assert.doesNotThrow(()=>solitaire.view(s));}
});
test('Rejected Solitaire targets preserve selected card, legal continuation and explicit cancellation',()=>{
 const s=sol();s.waste=[card(8,0)];s.tableau[0]=[card(9,2)];s.tableau[1]=[card(9,1)];solitaire.action(s,'select','w');
 const board=JSON.stringify([s.tableau,s.waste,s.foundation]);assert.equal(solitaire.action(s,'select','t:0:0'),false);assert.equal(s.selected,'w');assert.match(s.message,/still selected/);assert.equal(JSON.stringify([s.tableau,s.waste,s.foundation]),board);
 solitaire.action(s,'foundation','0');assert.equal(s.selected,'w');assert.match(s.message,/matching suit/);
 assert.equal(solitaire.action(s,'select','t:1:0'),true);assert.equal(s.selected,null);assert.equal(s.tableau[1].at(-1).rank,8);
 solitaire.action(s,'select','t:1:1');solitaire.action(s,'select','t:1:1');assert.equal(s.selected,null);assert.match(s.message,/cleared/);
});
test('Solitaire full sequences cannot enter foundations and same-column selection stays available',()=>{
 const s=sol();s.tableau[0]=[card(8,0),card(7,1)];solitaire.action(s,'select','t:0:0');solitaire.action(s,'foundation',0);assert.match(s.message,/one card/);assert.equal(s.selected,'t:0:0');solitaire.action(s,'select','t:0:1');assert.equal(s.selected,'t:0:1');
});
test('Solitaire stock/recycle messages match card movement and hints clear stale selection',()=>{
 const s=sol();s.stock=[card(4,0,false)];solitaire.action(s,'stock');assert.match(s.message,/Drew 4♠/);solitaire.action(s,'stock');assert.match(s.message,/recycled/);assert.equal(s.waste.length,0);assert.equal(s.stock[0].up,false);s.selected='w';s.hintTarget='f:0';solitaire.action(s,'hint');assert.equal(s.selected,null);assert.equal(s.hintTarget,null);
});
test('Block preview predicts simultaneous line union and exact score without mutation',()=>{
 const s=block();for(let x=1;x<8;x++)s.cells[x]=1;for(let y=1;y<8;y++)s.cells[y*8]=1;s.anchor=0;const before=JSON.stringify(s),p=blockPlacement(s,s.pieces[0],0);
 assert.equal(p.lines,2);assert.equal(p.points,21);assert.equal(p.cleared.length,15);assert.equal(JSON.stringify(s),before);assert.equal((blocks.view(s).match(/will clear/g)||[]).length,15);assert.match(blocks.view(s),/\+21 points · 2 lines/);
 assert(blocks.action(s,'place',0));assert.equal(s.lines,2);assert.equal(s.score,21);assert(s.cells.every(v=>v===0));assert.match(s.message,/2 lines cleared/);
});
test('Invalid block positions and empty commit never wrap into a real placement',()=>{
 const s=block();s.pieces[0]=[[0,0],[1,0]];s.anchor=7;assert.equal(blockPlacement(s,s.pieces[0],7),null);assert.equal((blocks.view(s).match(/ghost-invalid/g)||[]).length,1);
 const before=s.cells.slice();assert.equal(blocks.action(s,'place',''),false);assert.deepEqual(s.cells,before);blocks.action(s,'piece',9);assert.equal(s.selected,0);
});
test('Block tray marks unavailable pieces and automatically chooses a fitting next piece',()=>{
 const s=block();s.cells=s.cells.map((_,i)=>(i%8+Math.floor(i/8))%2);s.pieces=[[[0,0]],[[0,0],[1,0]],[[0,0]]];
 assert.match(blocks.view(s),/no space yet/);blocks.action(s,'place',0);assert.equal(s.selected,2);assert.equal(blockOver(s),false);blocks.action(s,'piece',1);assert.match(s.message,/no space yet/);
});
test('Repeated Place dispatch cannot place the next block after a clear; Undo keeps exact preview',()=>{
 const t=boot(),s=block();s.cells.fill(1,1,8);s.pieces=[[[0,0]],[[0,0]],[[0,0]]];const r=setRound(t,s);t.ctx.handle('preview',0);const before=JSON.stringify(r.state);
 t.ctx.handle('place',0);assert.equal(r.moves,1);assert.equal(r.state.score,11);t.ctx.handle('place',0);assert.equal(r.moves,1);assert.equal(r.state.score,11);assert.equal(r.history.length,1);t.ctx.handle('undo');assert.equal(JSON.stringify(r.state),before);assert.equal(t.ctx.inspect().bestScores.blocks,11);
 assert.equal(t.store.has('pocket-puzzle-v1'),false);const reloaded=boot({store:t.store,hash:'#blocks'});assert.equal(JSON.stringify(round(reloaded).state),before);
});
test('Round end stops board and hints, Undo reopens it, replay restores original board',()=>{
 const t=boot(),s=block();s.cells=s.cells.map((_,i)=>(i%8+Math.floor(i/8))%2);s.pieces=[[[0,0]],[[0,0],[1,0]],[[0,0],[1,0]]];const r=setRound(t,s);t.ctx.handle('preview',0);t.ctx.handle('place',0);
 assert(r.finished);assert(blockOver(r.state));assert.match(t.app.innerHTML,/Play again/);const finished=JSON.stringify(r.state),hints=r.hints,time=r.activeMs;t.advance(9000);t.tick();for(const a of ['hint','piece','preview','place'])t.ctx.handle(a,1);assert.equal(JSON.stringify(r.state),finished);assert.equal(r.hints,hints);assert.equal(r.activeMs,time);
 t.ctx.handle('restart');t.ctx.handle('cancel');assert.equal(JSON.stringify(r.state),finished);t.ctx.handle('undo');assert(!r.finished);assert(!blockOver(r.state));t.ctx.handle('restart');t.ctx.handle('confirm');assert.equal(JSON.stringify(round(t).state),JSON.stringify(s));assert.equal(round(t).moves,0);assert.equal(round(t).history.length,0);
});
test('Pending block previews survive modal cancel, navigation and reload, with input gated',()=>{
 const t=boot(),r=setRound(t,block());t.ctx.handle('preview',18);const state=JSON.stringify(r.state);
 for(const a of ['settings','help','pause']){t.ctx.handle(a);t.ctx.handle('place',18);assert.equal(JSON.stringify(r.state),state);t.ctx.handle(a);}
 t.ctx.handle('new');t.ctx.handle('place',18);t.ctx.handle('cancel');assert.equal(JSON.stringify(r.state),state);t.ctx.handle('home');t.ctx.handle('open','blocks');assert.equal(JSON.stringify(r.state),state);assert.equal(JSON.stringify(round(boot({store:t.store,hash:'#blocks'})).state),state);
});
test('Block effects are visual-only, cancel naturally on rerender and respect reduced motion',()=>{
 const t=boot({reducedMotion:false}),r=setRound(t,block()),animations=[];
 const cells=Array.from({length:64},(_,i)=>({animate:(frames,options)=>animations.push({i,frames,options})}));t.app.querySelectorAll=selector=>selector.includes('block-board')?cells:[];t.app.querySelector=()=>null;
 const plan={placed:[0,1],cleared:[1,2],points:22,lines:2},before=JSON.stringify(r);t.ctx.animateBlocks(plan);assert.equal(animations.length,3);assert.equal(JSON.stringify(r),before);assert(animations.every(x=>!('onfinish' in x.options)&&x.options.duration<=340));
 t.ctx.handle('help');animations.length=0;t.ctx.animateBlocks(plan);assert.equal(animations.length,0);t.ctx.handle('help');t.ctx.handle('open','water');t.ctx.animateBlocks(plan);assert.equal(animations.length,0);
 const u=boot({reducedMotion:true});setRound(u,block());u.app.querySelectorAll=()=>cells;u.ctx.animateBlocks(plan);assert.equal(animations.length,0);
});
test('Drag and tap motion plans agree and never become persistent round properties',()=>{
 const s=block(),before=JSON.stringify(s);const a=blocks.motion(s,'place',9),b=blocks.motion(s,'drag',{piece:0,anchor:9});assert.deepEqual(a,b);assert.equal(JSON.stringify(s),before);
 const t=boot(),r=setRound(t,s);t.ctx.handle('preview',9);t.ctx.handle('place',9);for(const field of ['motion','placed','cleared','plan'])assert.equal(field in r.state,false);
});
test('Current drag preview styles override older tap forecasts',()=>{
 const css=fs.readFileSync(new URL('../dist/style.css',import.meta.url),'utf8');
 assert(css.includes(':not(.drag-cell-invalid):not(.drag-clear-preview)'));
 const valid=css.lastIndexOf('.puzzle-dragging .block-cell.drag-cell-valid{'),clear=css.lastIndexOf('.puzzle-dragging .block-cell.drag-clear-preview{'),invalid=css.lastIndexOf('.puzzle-dragging .block-cell.drag-cell-invalid{');
 assert(valid>css.indexOf('.block-cell.ghost-valid.clear-preview{'));assert(clear>valid);assert(invalid>clear);
});
console.log(`GAMEPLAY REFINEMENT TESTS PASSED (${checks}; VM/rules, not physical-device testing)`);
