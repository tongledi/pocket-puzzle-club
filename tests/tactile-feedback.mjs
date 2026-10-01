// Real controller plus deterministic DOM/WAAPI doubles. Live browser motion is
// separately required: these tests establish atomic state and cleanup semantics.
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import crypto from 'node:crypto';
import {games as classics,solitaire,mahjong,freeTile} from '../dist/games/classics.js';
import {games as modern,water,waterPourPlan} from '../dist/games/modern.js';
import {games as logic,arrows,arrowPath,words,sliding} from '../dist/games/logic.js';
import {clone,button} from '../dist/games/core.js';import {commitDrag,installDragControls} from '../dist/drag.js';
let checks=0;function test(name,run){run();checks++;console.log('PASS',name);}
const source=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8').replace(/^import .*;$/gm,'')+'\nglobalThis.inspect=()=>({saves,current,puzzleMotion});Object.assign(globalThis,{handle,persist,render,animatePuzzle,capturePuzzleMotion,cancelPuzzleMotion});';
function boot({reduced=false}={}){
 const animations=[],events={},docEvents={},store=new Map();let html='',elements={};
 class Node{
  constructor(rect={left:0,top:0,width:50,height:140}){this.rect={...rect,right:rect.left+rect.width,bottom:rect.top+rect.height};this.style={};this.attrs={};this.children=[];this.dataset={};this.classList={add(){}};this.parent=null;}
  setAttribute(k,v){this.attrs[k]=v;}removeAttribute(k){delete this.attrs[k];}focus(){}
  getBoundingClientRect(){return this.rect;}querySelectorAll(s){return s==='.drop'?this.children:[];}querySelector(){return this.face;}
  cloneNode(){const n=new Node(this.rect);n.children=this.children.map(c=>c.cloneNode());return n;}
  appendChild(n){this.children.push(n);n.parent=this;return n;}remove(){if(this.parent)this.parent.children=this.parent.children.filter(c=>c!==this);}
  animate(frames,options){const a={el:this,frames,options,canceled:false,cancel(){this.canceled=true;this.oncancel?.();}};animations.push(a);return a;}
 }
 const focus=new Node(),app={get innerHTML(){return html},set innerHTML(v){html=v},addEventListener(){},querySelector:s=>elements[s]||focus,querySelectorAll:()=>[]};
 const ctx={commitDrag,installDragControls,classics,modern,logic,clone,button,crypto,console,URLSearchParams,navigator:{webdriver:true},location:{hostname:'localhost',search:'?qa=1',hash:''},history:{pushState(){}},performance:{now:()=>1000},localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},matchMedia:()=>({matches:reduced}),document:{createElement:()=>new Node(),querySelector:()=>app,addEventListener:(k,f)=>docEvents[k]=f,activeElement:focus,hidden:false,referrer:''},window:{addEventListener:(k,f)=>events[k]=f,scrollTo(){}},setInterval(){}};
 vm.createContext(ctx);vm.runInContext(source,ctx);
 function room(id){ctx.handle('open',id);const r=ctx.inspect().saves[id];elements={};const board=new Node({left:10,top:100,width:360,height:360});elements[id==='water'?'.tubes':'.arrow-board']=board;
 for(let i=0;i<(id==='water'?7:36);i++){const node=new Node({left:20+(i%(id==='water'?4:6))*56,top:110+Math.floor(i/(id==='water'?4:6))*(id==='water'?160:56),width:48,height:id==='water'?140:48});node.children=Array.from({length:4},()=>new Node());node.face=new Node({left:node.rect.left+14,top:node.rect.top+12,width:20,height:24});elements[`[data-action="${id==='water'?'tube':'arrow'}"][data-value="${i}"]${id==='water'?' .tube-glass':''}`]=node;}return r;}
 return {ctx,animations,events,docEvents,room,store,app,get elements(){return elements}};
}
test('Normal puzzle selection leaves decisions to the player; explicit hints still work',()=>{
 const w=water.create();water.action(w,'tube',w.path[0][0]);assert.doesNotMatch(water.view(w),/pour-destination|hint-destination|Pour \d/);water.action(w,'hint');assert.match(water.view(w),/hint-destination/);
 const m=mahjong.create();mahjong.action(m,'tile',m.solution[0][0]);assert.doesNotMatch(mahjong.view(m),/matching-tile|blocking-tile|mahjong-layer|available pairs|\d+ free tiles/);assert.match(mahjong.view(m),/depth-board/);mahjong.action(m,'hint');assert.match(mahjong.view(m),/hinted/);
 const s=solitaire.create();const i=s.tableau.findIndex(t=>t.length);solitaire.action(s,'select',`t:${i}:${s.tableau[i].length-1}`);assert.doesNotMatch(solitaire.view(s),/legal-destination/);assert.doesNotMatch(sliding.view(sliding.create()),/movable|outlined/);
 const word=words.create();const markup=words.view(word);assert(word.list.every(w=>markup.includes(w)));assert.doesNotMatch(markup,/hinted/);
});
test('Water motion describes exact maximal transfer without touching the round',()=>{
 const s={tubes:[[0,1,1],[1],[],[],[],[],[]],selected:0};const before=JSON.stringify(s),p=water.motion(s,'tube',1);assert.equal(p.kind,'water-pour');assert.equal(p.count,2);assert.equal(p.fromLength,3);assert.equal(p.toLength,1);assert.equal(JSON.stringify(s),before);assert.equal(water.motion(s,'tube',0),null);
});
test('Every arrow direction uses first-blocker geometry; failures and exits both animate',()=>{
 for(let d=0;d<4;d++){const s={cells:Array(36).fill(null)};s.cells[14]=d;const p=arrows.motion(s,'arrow',14,s);assert.equal(p.blocker,null);const path=arrowPath(s,14);s.cells[path.cells[0]]=0;const blocked=arrows.motion(s,'arrow',14,s);assert.equal(blocked.blocker,path.cells[0]);assert.equal(Math.abs(blocked.dx)+Math.abs(blocked.dy),1);}
 assert.equal(arrows.motion({cells:Array(36).fill(null)},'arrow',0,{}),null);
});
test('Water commits once before lift/tilt/stream, gates repeated taps and never saves motion',()=>{
 const t=boot(),r=t.room('water'),[a,b]=r.state.path[0];t.ctx.handle('tube',a);const before=JSON.stringify(r.state.tubes);t.ctx.handle('tube',b);assert.equal(r.moves,1);assert.notEqual(JSON.stringify(r.state.tubes),before);assert(t.ctx.inspect().puzzleMotion);const after=JSON.stringify(r.state);t.ctx.handle('tube',a);t.ctx.handle('hint');assert.equal(JSON.stringify(r.state),after);assert.equal(r.moves,1);
 assert.equal(t.animations[0].options.easing,'linear');assert(t.animations.some(a=>a.frames.some(f=>/rotate\(-?65deg\)/.test(f.transform||''))));assert(t.animations.some(a=>a.el.className==='water-stream'));assert(t.animations.filter(a=>a.frames.some(f=>f.transform==='scaleY(0)')).length>=3);
 assert.doesNotMatch(t.store.get('pocket-puzzle-qa-v1'),/water-flying|water-stream|water-pour|puzzleMotion/);t.ctx.cancelPuzzleMotion();assert.equal(t.ctx.inspect().puzzleMotion,null);assert(t.animations.every(a=>a.canceled));assert.equal(JSON.stringify(r.state),after);
});
test('Water Undo during flight restores exact pre-move state and removes all overlays',()=>{
 const t=boot(),r=t.room('water'),[a,b]=r.state.path[0];t.ctx.handle('tube',a);const before=JSON.stringify(r.state);t.ctx.handle('tube',b);const scene=t.ctx.inspect().puzzleMotion;t.ctx.handle('undo');assert.equal(JSON.stringify(r.state),before);assert.equal(r.moves,0);assert.equal(t.ctx.inspect().puzzleMotion,null);assert(scene.nodes.every(n=>!n.parent.children.includes(n)));
});
test('Arrow exit moves in its direction; collision returns and changes no board/history',()=>{
 for(const blocked of [false,true]){const t=boot(),r=t.room('arrows');r.state={cells:Array(36).fill(null),message:''};r.state.cells[12]=1;if(blocked)r.state.cells[15]=0;const before=JSON.stringify(r.state.cells);t.ctx.handle('arrow',12);assert(t.ctx.inspect().puzzleMotion);const main=t.animations.at(-1);assert(main.frames.some(f=>/translate\([1-9]/.test(f.transform)));assert.equal(r.moves,blocked?0:1);assert.equal(r.history.length,blocked?0:1);if(blocked){assert.equal(main.frames[1].transform,'translate(121px,0px)');assert(main.frames.some(f=>/scaleX/.test(f.transform)));assert.equal(main.el.className,'arrow-tile arrow-flying');assert.equal(main.el.disabled,true);assert.equal(JSON.stringify(r.state.cells),before);assert.equal(main.frames.at(-1).transform,'translate(0,0)');}else assert.equal(r.state.cells[12],null);main.onfinish();assert.equal(t.ctx.inspect().puzzleMotion,null);}
});
for(const action of ['help','settings','pause','restart','new','home'])test(`In-flight ${action} cleans motion without a delayed mutation`,()=>{
 const t=boot(),r=t.room('water'),[a,b]=r.state.path[0];t.ctx.handle('tube',a);t.ctx.handle('tube',b);const after=JSON.stringify(r.state.tubes),scene=t.ctx.inspect().puzzleMotion;assert(scene);t.ctx.handle(action);assert.equal(t.ctx.inspect().puzzleMotion,null);assert.equal(JSON.stringify(r.state.tubes),after);scene.finish();assert.equal(JSON.stringify(r.state.tubes),after);
});
test('Blur, resize and hidden document dispose motion; reduced motion uses immediate result',()=>{
 for(const event of ['blur','resize','hidden']){const t=boot(),r=t.room('water'),[a,b]=r.state.path[0];t.ctx.handle('tube',a);t.ctx.handle('tube',b);if(event==='hidden'){t.ctx.document.hidden=true;t.docEvents.visibilitychange();}else t.events[event]();assert.equal(t.ctx.inspect().puzzleMotion,null);assert.equal(r.moves,1);}
 const t=boot({reduced:true}),r=t.room('water'),[a,b]=r.state.path[0];t.ctx.handle('tube',a);t.ctx.handle('tube',b);assert.equal(r.moves,1);assert.equal(t.animations.length,0);assert.equal(t.ctx.inspect().puzzleMotion,null);
});
test('Cancelled animation and visual API failure cannot retain the input lock',()=>{
 const t=boot(),r=t.room('water'),[a,b]=r.state.path[0];t.ctx.handle('tube',a);t.ctx.handle('tube',b);t.animations[0].oncancel();assert.equal(t.ctx.inspect().puzzleMotion,null);assert.equal(r.moves,1);
 const u=boot(),v=u.room('arrows');v.state={cells:Array(36).fill(null)};v.state.cells[12]=1;u.elements['[data-action="arrow"][data-value="12"]'].cloneNode=()=>null;u.ctx.document.createElement=()=>{throw Error('unsupported')};u.ctx.handle('arrow',12);assert.equal(v.moves,1);assert.equal(u.ctx.inspect().puzzleMotion,null);
});
console.log(`TACTILE FEEDBACK TESTS PASSED (${checks}; DOM/WAAPI doubles, not live browser verification)`);
