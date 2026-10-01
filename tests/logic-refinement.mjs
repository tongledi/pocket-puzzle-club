// Pure rules, real controller and synthetic gesture checks; not physical-touch QA.
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import crypto from 'node:crypto';
import {games as classics} from '../dist/games/classics.js';import {games as modern} from '../dist/games/modern.js';
import {games as logic,sliding,sudoku,sudokuConflict,sudokuNextCell,words,wordLine} from '../dist/games/logic.js';import {clone,button} from '../dist/games/core.js';import {commitDrag,installDragControls} from '../dist/drag.js';
let checks=0;function test(name,run){run();checks++;console.log('PASS',name);}
const source=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8').replace(/^import .*;$/gm,'')+'\nglobalThis.inspect=()=>({saves,current,paused,confirmAction});Object.assign(globalThis,{handle,persist,render,animatePuzzle});';
function boot({store=new Map(),hash='',reducedMotion=true}={}){
 let html='',time=0,element={dataset:{},focus(){}};const events={},keys=[],ticks=[];
 const app={get innerHTML(){return html},set innerHTML(x){html=x},addEventListener(){},querySelector(){return element},querySelectorAll(){return[]}};
 const ctx={commitDrag,installDragControls,classics,modern,logic,clone,button,crypto,console,URLSearchParams,navigator:{webdriver:true},location:{hostname:'localhost',search:'?qa=1',hash},history:{pushState(){}},performance:{now:()=>time},localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},matchMedia:()=>({matches:reducedMotion}),document:{querySelector:()=>app,addEventListener:(k,f)=>{if(k==='keydown')keys.push(f)},activeElement:element,hidden:false,referrer:''},window:{addEventListener:(k,f)=>events[k]=f,scrollTo(){}},setInterval:f=>ticks.push(f)};
 vm.createContext(ctx);vm.runInContext(source,ctx);return {ctx,app,store,events,advance:n=>time+=n,tick:()=>ticks[0](),key:(key,extra={})=>keys.forEach(f=>f({key,preventDefault(){},...extra}))};
}
function setRound(t,id,state){t.ctx.handle('open',id);const r=t.ctx.inspect().saves[id];r.state=clone(state);r.initial=clone(state);r.history=[];r.moves=0;r.finished=false;t.ctx.persist();t.ctx.render();return r;}
const near=(i,j)=>Math.abs(i%4-j%4)+Math.abs((i/4|0)-(j/4|0))===1;
const drop=(r,extra)=>({gameId:'words',runId:r.runId,expected:JSON.stringify(r.state),...extra});
test('Sliding legal outlines, one-step feedback, path repair and motion use actual adjacent cells',()=>{
 for(let n=0;n<80;n++){const s=sliding.create(),z=s.cells.indexOf(0),legal=s.cells.map((v,i)=>v&&near(i,z)?i:-1).filter(i=>i>=0),html=sliding.view(s);assert.equal((html.match(/movable/g)||[]).length,legal.length);const i=legal[0],tile=s.cells[i],before=clone(s);assert(sliding.action(s,'tile',i));assert.equal(s.cells[z],tile);assert.match(s.message,new RegExp(`Tile ${tile} moved`));const motion=sliding.motion(before,'tile',i,s);assert(motion.targets[0].selector.includes(`"${z}"`));assert(motion.targets[0].fromSelector.includes(`"${i}"`));assert(sliding.action(s,'tile',z));assert.deepEqual(s.cells,before.cells);assert.deepEqual(s.trail,before.trail);}
});
test('Sliding rejects edge wrap, distant and malformed taps without changing board or path',()=>{
 const s=sliding.create(),z=s.cells.indexOf(0),before=clone(s);for(const i of [-1,16,NaN,'',null,2.3,...s.cells.map((n,i)=>!near(i,z)?i:-1)]){sliding.action(s,'tile',i);assert.deepEqual(s.cells,before.cells);assert.deepEqual(s.trail,before.trail);}
});
test('Word line geometry supports both orders in all eight directions and rejects wrapping',()=>{
 const dirs=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]];
 for(const [dx,dy] of dirs){const s={cells:Array(100).fill('X'),list:['WORD'],found:[]},p=[0,1,2,3].map(k=>44+k*dx+k*dy*10);p.forEach((i,k)=>s.cells[i]='WORD'[k]);assert.equal(wordLine(s,p[0],p[3]).index,0);assert.equal(wordLine(s,p[3],p[0]).index,0);assert.equal(wordLine(s,p[0],p[3]).path.length,4);}
 const s=words.create();for(const [a,b] of [[-1,0],[0,100],[0,12],[0,2.3],[null,0],[undefined,0]])assert.equal(wordLine(s,a,b),null);
});
test('Word endpoint taps and atomic drag produce identical matches, one history entry, exact Undo and reload',()=>{
 const state=words.create(),p=state.paths[0],a=clone(state),b=clone(state);words.action(a,'letter',p[0]);assert(words.action(a,'letter',p.at(-1)));assert(words.action(b,'line',{start:p[0],end:p.at(-1)}));assert.deepEqual(a,b);
 const t=boot(),r=setRound(t,'words',state),prior=JSON.stringify(r.state),d=drop(r,{start:p[0],end:p.at(-1)});t.ctx.handle('drag',d);assert.equal(r.moves,1);assert.equal(r.history.length,1);assert.deepEqual(r.state.found,[0]);t.ctx.handle('drag',d);assert.equal(r.moves,1);const u=boot({store:t.store,hash:'#words'});assert.equal(JSON.stringify(u.ctx.inspect().saves.words.state),JSON.stringify(r.state));t.ctx.handle('undo');assert.equal(JSON.stringify(r.state),prior);assert.equal(r.moves,0);
});
test('Word invalid, duplicate, stale and changed-game drops preserve every saved field',()=>{
 const state=words.create(),r={state,runId:'word-run'},p=state.paths[0];for(const change of [{start:-1,end:p.at(-1)},{start:p[0],end:100},{start:0,end:12},{runId:'old',start:p[0],end:p.at(-1)},{gameId:'blocks',start:p[0],end:p.at(-1)},{expected:'old',start:p[0],end:p.at(-1)}]){const before=JSON.stringify(state);assert.equal(commitDrag(words,r,{...drop(r,{start:p[0],end:p.at(-1)}),...change}),false);assert.equal(JSON.stringify(state),before);}
 assert(commitDrag(words,r,drop(r,{start:p[0],end:p.at(-1)})));const before=JSON.stringify(state);assert.equal(commitDrag(words,r,drop(r,{start:p[0],end:p.at(-1)})),false);assert.equal(JSON.stringify(state),before);
});
test('Word same-start tap cancels, hint clears selection, invalid endpoints do not corrupt saved state',()=>{
 const s=words.create();words.action(s,'letter',s.paths[0][0]);words.action(s,'letter',s.paths[0][0]);assert.equal(s.selected,null);assert.match(s.message,/cleared/);words.action(s,'letter',4);words.action(s,'hint');assert.equal(s.selected,null);assert.equal(s.hint,s.paths[0][0]);for(const v of [-1,100,'',NaN,1.2]){const old=JSON.stringify(s);words.action(s,'letter',v);assert.equal(JSON.stringify(s),old);}
});
test('Word generated boards complete using mixed endpoint and atomic line moves without rule changes',()=>{
 for(let n=0;n<120;n++){const s=words.create();for(let i=0;i<s.list.length;i++){const p=[...s.paths[i]];if(i%2){words.action(s,'letter',p.at(-1));assert(words.action(s,'letter',p[0]));}else assert(words.action(s,'line',{start:p[0],end:p.at(-1)}));}assert(words.won(s));assert.equal(s.found.length,6);assert.match(words.view(s),/6 of 6/);}
});
test('Sudoku navigation stays within rows and columns; note mode, erase and peer cleanup preserve clues',()=>{
 assert.equal(sudokuNextCell(8,'ArrowRight'),8);assert.equal(sudokuNextCell(9,'ArrowLeft'),9);assert.equal(sudokuNextCell(0,'ArrowUp'),0);assert.equal(sudokuNextCell(80,'ArrowDown'),80);
 const s=sudoku.create(),i=s.given.findIndex(v=>!v),given=clone(s.given),answer=clone(s.answer);sudoku.action(s,'cell',i);sudoku.action(s,'notes');assert(sudoku.action(s,'number',s.answer[i]));assert.equal(s.cells[i],0);assert(s.notes[i]&(1<<s.answer[i]));assert.match(sudoku.view(s),/note-active/);sudoku.action(s,'notes');assert(sudoku.action(s,'number',s.answer[i]));assert.equal(s.notes[i],0);assert(sudoku.action(s,'number',0));assert.equal(s.cells[i],0);assert.deepEqual(s.given,given);assert.deepEqual(s.answer,answer);
});
test('Sudoku exposes fixed/editable mode, readable notes and only actual duplicate conflicts',()=>{
 const s=sudoku.create(),i=s.given.findIndex(v=>!v),peer=s.cells.findIndex((n,j)=>n&&j!==i&&((i/9|0)===(j/9|0)||i%9===j%9));sudoku.action(s,'cell',i);sudoku.action(s,'number',s.cells[peer]);assert(sudokuConflict(s,i));assert.match(sudoku.view(s),/aria-invalid="true"/);assert.match(s.message,/Duplicate/);sudoku.action(s,'number',0);assert(!sudokuConflict(s,i));sudoku.action(s,'number',s.answer[i]);assert.equal(s.message,`Entered ${s.answer[i]}.`);const j=s.given.findIndex(Boolean);sudoku.action(s,'cell',j);assert.match(sudoku.view(s),/Fixed clue/);assert.match(sudoku.view(s),/aria-label="1, .*?disabled/);
});
test('Sudoku keyboard navigation, digits, notes repeat and browser shortcut guards',()=>{
 const t=boot(),r=setRound(t,'sudoku',sudoku.create()),i=r.state.given.findIndex(v=>!v);t.ctx.handle('cell',i);t.key('n');assert(r.state.notesMode);t.key('n',{repeat:true});assert(r.state.notesMode);t.key('1',{ctrlKey:true});assert.equal(r.state.notes[i],0);t.key('1');assert(r.state.notes[i]&(1<<1));assert.equal(r.moves,1);t.key('Delete');assert.equal(r.state.notes[i],0);t.key('ArrowRight');assert.equal(r.state.selected,sudokuNextCell(i,'ArrowRight'));const selected=r.state.selected;t.key('ArrowLeft',{metaKey:true});assert.equal(r.state.selected,selected);
});
for(const g of [sliding,words,sudoku])test(`${g.title}: pause/help/settings/restart-cancel, navigation/reload and schema-1 guards`,()=>{
 const t=boot(),r=setRound(t,g.id,g.create()),first=clone(r.state);const act=()=>{if(g.id==='words'){const i=r.state.list.findIndex((_,i)=>!r.state.found.includes(i)),p=r.state.paths[i];t.ctx.handle('drag',drop(r,{start:p[0],end:p.at(-1)}));}else if(g.id==='sliding')t.ctx.handle('tile',r.state.cells.findIndex((v,i)=>v&&near(i,r.state.cells.indexOf(0))));else {const i=r.state.cells.findIndex((n,i)=>!n&&!r.state.given[i]);t.ctx.handle('cell',i);t.ctx.handle('number',r.state.answer[i]);}};
 for(const overlay of ['pause','help','settings','restart']){t.ctx.handle(overlay);const old=JSON.stringify(r.state),moves=r.moves;act();assert.equal(JSON.stringify(r.state),old);assert.equal(r.moves,moves);t.ctx.handle(overlay==='restart'?'cancel':overlay);}
 act();const moved=JSON.stringify(r.state);t.ctx.handle('home');t.ctx.handle('open',g.id);assert.equal(JSON.stringify(r.state),moved);const u=boot({store:t.store,hash:'#'+g.id});assert.equal(JSON.stringify(u.ctx.inspect().saves[g.id].state),moved);t.ctx.handle('undo');assert.equal(r.moves,0);assert.deepEqual(r.state.cells,first.cells);t.ctx.handle('restart');t.ctx.handle('confirm');const next=t.ctx.inspect().saves[g.id];assert.deepEqual(next.state,first);assert.equal(JSON.parse(t.store.get('pocket-puzzle-qa-v1')).schema,1);assert(!t.store.has('pocket-puzzle-v1'));
});
test('Sudoku hint and final entry complete honestly and Undo restores notes and incomplete round',()=>{
 const t=boot(),r=setRound(t,'sudoku',sudoku.create());for(let i=0;i<81;i++)if(!r.state.given[i]){t.ctx.handle('cell',i);t.ctx.handle('number',r.state.answer[i]);}assert(sudoku.won(r.state));assert(r.finished);const moves=r.moves;t.ctx.handle('number',1);assert.equal(r.moves,moves);t.ctx.handle('undo');assert(!r.finished);assert(!sudoku.won(r.state));t.ctx.handle('hint');assert(sudoku.won(r.state));assert.equal(r.hints,1);assert.equal(r.moves,moves-1);
});
test('Sliding motion uses measured endpoints and reduced-motion/modal guards without saved fields',()=>{
 const t=boot({reducedMotion:false}),r=setRound(t,'sliding',sliding.create()),before=clone(r.state),i=r.state.cells.findIndex((v,i)=>v&&near(i,r.state.cells.indexOf(0)));sliding.action(r.state,'tile',i);const plan=sliding.motion(before,'tile',i,r.state),effects=[];t.app.querySelector=s=>({focus(){},getBoundingClientRect:()=>({left:s===plan.targets[0].fromSelector?80:0,top:30}),animate:(...args)=>effects.push(args)});t.ctx.animatePuzzle(plan);assert.equal(effects.length,1);assert.equal(effects[0][0][0].transform,'translate(80px,0px)');t.ctx.handle('help');effects.length=0;t.ctx.animatePuzzle(plan);assert.equal(effects.length,0);const u=boot();setRound(u,'sliding',before);u.app.querySelector=t.app.querySelector;u.ctx.animatePuzzle(plan);assert.equal(effects.length,0);assert(!('motion'in r.state));
});

class Node {
  constructor(classes='',dataset={}){this.classes=new Set(classes.split(' ').filter(Boolean));this.classList={add:(...x)=>x.forEach(c=>this.classes.add(c)),remove:(...x)=>x.forEach(c=>this.classes.delete(c)),contains:x=>this.classes.has(x)};this.dataset=dataset;this.style={};this.listeners={};this.children=[];this.attrs={};this.rect={left:0,top:0,width:40,height:40,right:40,bottom:40};this.isConnected=true;this.queries={};}
  matches(s){if(s==='[data-action]')return !!this.dataset.action;const attr=/^\[data-action="(.+)"\]$/.exec(s);if(attr)return this.dataset.action===attr[1];return s.startsWith('.')&&this.classes.has(s.slice(1));}
  closest(s){return this.matches(s)?this:this.parent?.closest(s)||null;}
  contains(el){return el===this||this.children.some(child=>child.contains(el));}
  querySelector(s){return this.queries[s]||this.children.find(c=>c.matches(s))||this.children.map(c=>c.querySelector(s)).find(Boolean)||null;}
  querySelectorAll(s){if(this.queries[s])return Array.isArray(this.queries[s])?this.queries[s]:[this.queries[s]];return this.children.flatMap(c=>[...(c.matches(s)?[c]:[]),...c.querySelectorAll(s)]);}
  append(...children){for(const child of children){child.parent=this;this.children.push(child);}}
  remove(){this.parent.children=this.parent.children.filter(c=>c!==this);this.parent=null;this.isConnected=false;}
  setAttribute(k,v){this.attrs[k]=v;}removeAttribute(k){delete this.attrs[k];}
  getBoundingClientRect(){return this.rect;}
  cloneNode(){const n=new Node([...this.classes].join(' '),{...this.dataset});n.rect={...this.rect};for(const c of this.children)n.append(c.cloneNode());return n;}
  addEventListener(k,f){(this.listeners[k] ||= []).push(f);}removeEventListener(k,f){this.listeners[k]=(this.listeners[k]||[]).filter(x=>x!==f);}
  fire(k,extra={}){const e={target:this,pointerId:1,pointerType:'mouse',isPrimary:true,button:0,clientX:10,clientY:10,detail:1,preventDefault(){this.prevented=true;},stopImmediatePropagation(){this.stopped=true;},...extra};for(const fn of this.listeners[k]||[]){fn(e);if(e.stopped)break;}return e;}
  setPointerCapture(id){this.capture=id;}hasPointerCapture(id){return this.capture===id;}releasePointerCapture(){this.capture=null;}
}
function wordUI(){
 const root=new Node(),doc=new Node(),win=new Node(),body=new Node(),surface=new Node('play-surface'),feedback=new Node('game-feedback'),label=new Node('word-selection'),board=new Node('word-board');win.PointerEvent=class{};doc.defaultView=win;root.ownerDocument=doc;doc.body=body;doc.createElement=()=>new Node();body.append(root);root.append(surface,feedback);surface.append(board,label);
 const state={cells:Array(100).fill('X'),list:['WORD'],paths:[[22,23,24,25]],found:[],selected:null,message:''};state.paths[0].forEach((i,k)=>state.cells[i]='WORD'[k]);const r={state,runId:'word-run'},cells=[];for(let i=0;i<100;i++){const c=new Node('letter',{action:'letter',value:String(i)}),x=i%10*32,y=(i/10|0)*32;c.rect={left:x,top:y,width:30,height:30,right:x+30,bottom:y+30};board.append(c);cells.push(c);}
 let blocked=false,point=null;doc.elementFromPoint=()=>point;const sent=[],controls=installDragControls({root,getContext:()=>({gameId:'words',runId:r.runId,state:r.state,blocked}),dispatch:(...args)=>sent.push(args)});
 const pos=i=>({clientX:cells[i].rect.left+15,clientY:cells[i].rect.top+15});const down=(i=22,extra={})=>root.fire('pointerdown',{target:cells[i],...pos(i),...extra});const move=(i=25,extra={})=>{point=cells[i];return doc.fire('pointermove',{...pos(i),...extra});};const up=(i=25,extra={})=>{point=cells[i];return doc.fire('pointerup',{...pos(i),...extra});};return{root,doc,win,body,feedback,label,board,cells,r,sent,controls,down,move,up,setBlocked:v=>blocked=v};
}
test('Word pointer line is transient until release; no floating ghost, one dispatch and no ghost click',()=>{
 const u=wordUI(),before=JSON.stringify(u.r.state);u.down();u.move();assert.equal(JSON.stringify(u.r.state),before);assert.equal(u.sent.length,0);assert.equal(u.body.children.length,1);assert.equal(u.label.textContent,'WORD');for(const i of [22,23,24,25])assert(u.cells[i].classes.has('word-trace'));u.up();assert.equal(u.sent.length,1);assert.equal(u.sent[0][1].start,22);assert.equal(u.sent[0][1].end,25);assert(u.cells.every(c=>!c.classes.has('word-trace')));assert(u.root.fire('click').prevented);assert.equal(u.root.fire('click',{detail:0}).prevented,undefined);u.down();u.up(22);assert.equal(u.sent.length,1);assert.equal(u.root.fire('click').prevented,undefined);
});
test('Word reverse drag, touch threshold and endpoint tap fallback retain the intended input',()=>{
 const u=wordUI();u.down(25,{pointerType:'touch'});u.move(25,{clientX:u.cells[25].rect.left+20,pointerType:'touch'});u.up(25,{pointerType:'touch'});assert.equal(u.sent.length,0);assert.equal(u.root.fire('click').prevented,undefined);u.down(25,{pointerType:'touch'});u.move(22,{pointerType:'touch'});u.up(22,{pointerType:'touch'});assert.equal(u.sent.length,1);assert.equal(u.sent[0][1].start,25);assert.equal(u.sent[0][1].end,22);
});
test('Word invalid, outside, cancel, blur, scroll, multitouch, overlays and state replacement never commit',()=>{
 for(const why of ['invalid','outside','pointercancel','lostpointercapture','blur','visibilitychange','scroll','Escape','state','run','blocked','render','detached','multitouch']){const u=wordUI(),before=JSON.stringify(u.r.state);u.down();u.move();if(why==='invalid'){u.move(35);u.up(35);}else if(why==='outside'){u.up(25,{clientX:500});}else {if(why==='blur')u.win.fire('blur');else if(why==='lostpointercapture')u.root.fire(why);else if(why==='Escape')assert(u.doc.fire('keydown',{key:'Escape'}).stopped);else if(why==='state')u.r.state.selected=3;else if(why==='run')u.r.runId='new';else if(why==='blocked')u.setBlocked(true);else if(why==='render')u.controls.cancel();else if(why==='detached')u.cells[22].isConnected=false;else if(why==='multitouch')u.down(22,{pointerId:2,isPrimary:false});else {if(why==='visibilitychange')u.doc.hidden=true;u.doc.fire(why);}u.up();}assert.equal(u.sent.length,0,why);assert(u.cells.every(c=>!c.classes.has('word-trace')),why);if(why!=='state')assert.equal(JSON.stringify(u.r.state),before,why);}
});
test('Word drag respects controller overlays and replacement-round remote conflicts',()=>{
 for(const overlay of ['pause','help','settings','new']){const t=boot(),r=setRound(t,'words',words.create()),p=r.state.paths[0],d=drop(r,{start:p[0],end:p.at(-1)}),before=JSON.stringify(r.state);t.ctx.handle(overlay);t.ctx.handle('drag',d);assert.equal(JSON.stringify(r.state),before);assert.equal(r.moves,0);}
 const store=new Map(),a=boot({store}),b=boot({store});a.ctx.handle('open','words');a.ctx.persist();b.ctx.handle('open','words');const ra=a.ctx.inspect().saves.words,rb=b.ctx.inspect().saves.words,p=rb.state.paths[0],old=drop(rb,{start:p[0],end:p.at(-1)});a.ctx.handle('new');a.ctx.handle('confirm');b.ctx.handle('drag',old);assert.equal(b.ctx.inspect().saves.words.runId,a.ctx.inspect().saves.words.runId);assert.equal(b.ctx.inspect().saves.words.moves,0);
});
console.log(`LOGIC REFINEMENT TESTS PASSED (${checks}; VM/synthetic pointer tests, not physical-device QA)`);
