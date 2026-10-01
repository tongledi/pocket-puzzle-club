// Rules, real controller and synthetic animation checks. Not a physical touch test.
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import crypto from 'node:crypto';
import {games as classics,mahjong,freeTile,mahjongBlockers,mahjongMatches} from '../dist/games/classics.js';
import {games as modern,water,pour,waterPourPlan,waterSolve} from '../dist/games/modern.js';
import {games as logic,arrows,arrowFree,arrowPath} from '../dist/games/logic.js';import {clone,button} from '../dist/games/core.js';import {commitDrag,installDragControls} from '../dist/drag.js';
let checks=0;function test(name,run){run();checks++;console.log('PASS',name);}
const source=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8').replace(/^import .*;$/gm,'')+'\nglobalThis.inspect=()=>({saves,current,bestScores,paused,confirmAction});Object.assign(globalThis,{handle,persist,render,animatePuzzle});';
function boot({store=new Map(),hash='',reducedMotion=true}={}){
 let html='',time=0,element={dataset:{},focus(){}};const events={},ticks=[];
 const app={get innerHTML(){return html},set innerHTML(x){html=x},addEventListener(){},querySelector(){return element},querySelectorAll(){return[]}};
 const ctx={commitDrag,installDragControls,classics,modern,logic,clone,button,crypto,console,URLSearchParams,navigator:{webdriver:true},location:{hostname:'localhost',search:'?qa=1',hash},history:{pushState(){}},performance:{now:()=>time},localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},matchMedia:()=>({matches:reducedMotion}),document:{querySelector:()=>app,addEventListener(){},activeElement:element,hidden:false,referrer:''},window:{addEventListener:(k,f)=>events[k]=f,scrollTo(){}},setInterval:f=>ticks.push(f)};
 vm.createContext(ctx);vm.runInContext(source,ctx);return {ctx,app,store,events,advance:n=>time+=n,tick:()=>ticks[0]()};
}
function setRound(t,id,state){t.ctx.handle('open',id);const r=t.ctx.inspect().saves[id];r.state=clone(state);r.initial=clone(state);r.history=[];r.moves=0;r.finished=false;t.ctx.persist();t.ctx.render();return r;}
const originalRandom=Math.random;
function seed(n){let x=n|0;Math.random=()=>{x|=0;x=x+0x6D2B79F5|0;let t=Math.imul(x^x>>>15,1|x);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const mass=s=>s.tubes.flat().sort((a,b)=>a-b);
test('Mahjong markings preserve upper-cover plus at-least-one-side-free rules',()=>{
 const s=mahjong.create();for(let i=0;i<s.tiles.length;i++){
   const before=JSON.stringify(s.tiles),blockers=mahjongBlockers(s,i);assert.equal(!!blockers.length,!freeTile(s,i));assert(blockers.length<=2);mahjong.action(s,'tile',i);assert.equal(JSON.stringify(s.tiles),before);if(blockers.length)assert.deepEqual(s.blocked,blockers);s.selected=null;
 }
 const [a,b]=s.solution[0];mahjong.action(s,'tile',a);assert(mahjongMatches(s).includes(b));assert.match(mahjong.view(s),/matching-tile/);assert.match(mahjong.view(s),/matches selected tile/);assert(mahjong.action(s,'tile',b));assert(s.tiles[a].gone&&s.tiles[b].gone);assert.equal(s.selected,null);
});
test('Mahjong cancellation, mismatches and removed/invalid cells do not clear tiles',()=>{
 const s=mahjong.create(),a=s.solution[0][0],b=s.tiles.findIndex((t,i)=>freeTile(s,i)&&t.type!==s.tiles[a].type);mahjong.action(s,'tile',a);mahjong.action(s,'tile',a);assert.equal(s.selected,null);assert.match(s.message,/cleared/);mahjong.action(s,'tile',a);if(b>=0){mahjong.action(s,'tile',b);assert.equal(s.selected,b);assert.match(s.message,/instead/);}assert(s.tiles.every(t=>!t.gone));
 for(const i of ['',-1,99,'bad'])assert.equal(mahjong.action(s,'tile',i),false);
});
test('Mahjong blocked boards offer Undo without pretending any arbitrary route is proven',()=>{
 const s={tiles:[{x:0,y:0,z:0,type:0,gone:false},{x:1,y:0,z:0,type:1,gone:false}],selected:null};mahjong.action(s,'hint');assert.equal(s.hint,null);assert.match(s.message,/Undo/);assert(!mahjong.won(s));
});
test('Water pure plan equals full-run pour and every highlighted destination is legal',()=>{
 const s={tubes:[[0,1,1],[1,1,1],[2],[],[3,3,3,3],[4,4,4,4],[]],selected:0};const before=JSON.stringify(s),p=waterPourPlan(s,0,1);assert.deepEqual(p,{from:0,to:1,color:1,count:1});assert.equal(JSON.stringify(s),before);assert.match(water.view(s),/pour 1 Blue drops here/);
 const markup=water.view(s);for(let i=0;i<7;i++){const tag=markup.match(new RegExp(`<button[^>]*data-value="${i}"[^>]*>`))[0];assert.equal(tag.includes('pour-destination'),!!waterPourPlan(s,0,i));}assert.equal(water.action(s,'tube',1),true);assert.match(s.message,/1 Blue drop/);assert.match(s.message,/colour sorted/);assert.deepEqual(s.tubes[0],[0,1]);
});
test('Water rejects full/mismatched destinations, retains source and supports explicit cancellation',()=>{
 const s={tubes:[[0],[1],[2,2,2,2],[],[],[],[]],selected:null};water.action(s,'tube',0);const before=JSON.stringify(s.tubes);water.action(s,'tube',1);assert.equal(s.selected,0);assert.match(s.message,/do not match/);water.action(s,'tube',2);assert.equal(s.selected,0);assert.match(s.message,/is full/);assert.equal(JSON.stringify(s.tubes),before);water.action(s,'tube',0);assert.equal(s.selected,null);water.action(s,'tube',3);assert.match(s.message,/water first/);
 for(const i of ['',-1,99,'bad'])assert.equal(water.action(s,'tube',i),false);
});
test('Water route search is pure, bounded, honest, and replays exact legal pours after detours',()=>{
 let solved=0,limited=0,blocked=0;
 for(let n=1;n<=100;n++){seed(n);const s=water.create();for(let k=0;k<7;k++){let opts=[];for(let a=0;a<7;a++)for(let b=0;b<7;b++)if(waterPourPlan(s,a,b))opts.push([a,b]);if(!opts.length)break;const [a,b]=opts[Math.random()*opts.length|0];s.selected=a;water.action(s,'tube',b);}
   const before=JSON.stringify(s),result=waterSolve(s,{maxNodes:20000,maxMs:1000});assert.equal(JSON.stringify(s),before);if(result.status==='solved'){const copy=clone(s),original=mass(copy);for(const pair of result.path){assert(pour(copy,...pair));assert.deepEqual(mass(copy),original);}assert(water.won(copy));solved++;}else if(result.status==='limit')limited++;else blocked++;
 }
 console.log(`  Detours: ${solved} solved / ${blocked} proven blocked / ${limited} bounded inconclusive`);
 const s=water.create();assert.equal(waterSolve(s,{maxNodes:0}).status,'limit');assert.equal(waterSolve(s,{maxDepth:0}).status,'limit');
 const stuck={tubes:[[0,2,3,0],[0,3,4,0],[1,2,4,1],[1,3,4,1],[2,2],[3],[4]],selected:null,path:[[0,1]]};assert.equal(waterSolve(stuck).status,'blocked');water.action(stuck,'hint');assert.equal(stuck.selected,null);assert.equal(stuck.hintTarget,null);assert.match(stuck.message,/no complete solution/);
});
test('Water validates a complete saved route before claiming verification and repairs stale hints',()=>{
 seed(57);const s=water.create();s.path=[[0,0]];s.selected=6;s.hintTarget=5;const before=JSON.stringify(s.tubes);water.action(s,'hint');assert.equal(JSON.stringify(s.tubes),before);if(s.selected!=null){assert(waterPourPlan(s,s.selected,s.hintTarget));if(/verified/.test(s.message)){const copy=clone(s);for(const p of s.path)assert(pour(copy,...p));assert(water.won(copy));}}
 const won={tubes:[[0,0,0,0],[1,1,1,1],[2,2,2,2],[3,3,3,3],[4,4,4,4],[],[]],selected:0,hintTarget:1,path:[]};water.action(won,'hint');assert.equal(won.selected,null);assert.equal(won.hintTarget,null);assert.match(won.message,/sorted/);
});
test('Arrow paths trace only to the first blocker and only appear after an explicit inspection',()=>{
 const s={cells:Array(36).fill(null)};s.cells[6]=1;s.cells[9]=0;s.cells[11]=0;assert.deepEqual(arrowPath(s,6),{cells:[7,8,9],blocker:9});assert.doesNotMatch(arrows.view(s),/exit-path/);assert.equal(arrows.action(s,'arrow',6),false);assert.deepEqual(s.blocked,[6,9]);let html=arrows.view(s);assert.equal((html.match(/exit-path/g)||[]).length,3);assert.match(html,/blocks the selected exit/);assert.match(s.message,/×/);assert.equal(arrows.action(s,'arrow',9),true);assert.deepEqual(s.blocked,[]);assert.equal(s.hint,null);assert.equal(arrowPath(s,6).blocker,11);
});
test('Arrow hints distinguish a truly cleared board from an impossible legacy loop',()=>{
 const s={cells:Array(36).fill(null)};s.cells[0]=1;s.cells[1]=3;arrows.action(s,'hint');assert.match(s.message,/No clear exits/);assert(!arrows.won(s));s.cells.fill(null);arrows.action(s,'hint');assert.equal(s.message,'Board cleared.');
 for(const i of ['',-1,99,'bad'])assert.equal(arrows.action(s,'arrow',i),false);
});
for(const game of [mahjong,water,arrows])test(`${game.title}: legal/rapid moves, exact Undo, dialogs, restart, reload and entry/back`,()=>{
 seed(91);const t=boot(),s=game.create(),r=setRound(t,game.id,s);let action,value;
 if(game.id==='mahjong'){const [a,b]=s.solution[0];t.ctx.handle('tile',a);action='tile';value=b;}
 if(game.id==='water'){const [a,b]=s.path[0];t.ctx.handle('tube',a);action='tube';value=b;}
 if(game.id==='arrows'){action='arrow';value=s.cells.findIndex((d,i)=>d!=null&&arrowFree(s,i));}
 const before=JSON.stringify(r.state);t.ctx.handle(action,value);assert.equal(r.moves,1);const moved=JSON.stringify(r.state);t.ctx.handle(action,value);assert.equal(r.moves,1); // Repeat may select a water source, never pour it.
 t.ctx.handle('undo');assert.equal(JSON.stringify(r.state),before);assert.equal(r.moves,0);
 for(const dialog of ['settings','help','pause']){t.ctx.handle(dialog);t.ctx.handle(action,value);assert.equal(JSON.stringify(r.state),before);t.ctx.handle(dialog);}
 t.ctx.handle('restart');t.ctx.handle(action,value);t.ctx.handle('cancel');assert.equal(JSON.stringify(r.state),before);t.ctx.handle('home');t.ctx.handle('open',game.id);assert.equal(JSON.stringify(r.state),before);
 const again=boot({store:t.store,hash:'#'+game.id});assert.equal(JSON.stringify(again.ctx.inspect().saves[game.id].state),before);assert.equal(t.store.has('pocket-puzzle-v1'),false);
 t.ctx.handle('restart');t.ctx.handle('confirm');const reset=t.ctx.inspect().saves[game.id];assert.equal(JSON.stringify(reset.state),JSON.stringify(s));assert.equal(reset.history.length,0);assert.equal(reset.moves,0);
});
test('Matching feedback has no delayed commit, respects reduced motion and stops under overlays',()=>{
 const t=boot({reducedMotion:false});setRound(t,'water',water.create());let effects=[];t.app.querySelector=()=>({focus(){},animate:(frames,options)=>effects.push({frames,options})});const plan={game:'water',targets:[{selector:'anything',kind:'pour'}]},before=JSON.stringify(t.ctx.inspect().saves);t.ctx.animatePuzzle(plan);assert.equal(effects.length,1);assert.equal(JSON.stringify(t.ctx.inspect().saves),before);assert(effects.every(e=>e.options.duration<=280&&!e.options.onfinish));
 t.ctx.handle('help');effects=[];t.ctx.animatePuzzle(plan);assert.equal(effects.length,0);t.ctx.handle('help');t.ctx.animatePuzzle({...plan,game:'arrows'});assert.equal(effects.length,0);
 const u=boot({reducedMotion:true});setRound(u,'water',water.create());u.app.querySelector=t.app.querySelector;u.ctx.animatePuzzle(plan);assert.equal(effects.length,0);
});
test('Water label reset overrides legacy selected and hinted pseudo-content',()=>{
 const css=fs.readFileSync(new URL('../dist/style.css',import.meta.url),'utf8');const old=css.indexOf('.tube.hint-destination .tube-label:after'),reset=css.lastIndexOf('.water .tube .tube-label:after{content:none}');assert(reset>old);assert.match(water.view(water.create()),/tube-label/);
});
Math.random=originalRandom;
console.log(`MATCHING REFINEMENT TESTS PASSED (${checks}; rule/controller simulation, not physical-device testing)`);
