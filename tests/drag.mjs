// Pure rules and synthetic Pointer Event lifecycle tests. No browser claims.
import assert from 'node:assert/strict';
import { commitDrag, validSolitaireSource, canDropSolitaire, blockAnchorAt, movementPassed, installDragControls } from '../dist/drag.js';
import { solitaire } from '../dist/games/classics.js';
import { blocks } from '../dist/games/modern.js';
let checks = 0;
function test(name, fn) { fn(); checks++; console.log('PASS', name); }
const card = (rank, suit, up = true) => ({ rank, suit, up });
const sol = () => ({ tableau: Array.from({ length: 7 }, () => []), foundation: Array.from({ length: 4 }, () => []), stock: [], waste: [], selected: null, message: '' });
const block = () => ({ cells: Array(64).fill(0), pieces: [[[0,0],[1,0],[1,1]], [[0,0]], [[0,0],[1,0]]], selected: 1, anchor: 50, score: 0, lines: 0, message: 'Original selection' });
const round = state => ({ state, runId: 'test-run' });
const drop = (game, r, extra) => ({ gameId: game.id, runId: r.runId, expected: JSON.stringify(r.state), ...extra });
test('Solitaire preserves a dragged legal tail and reveals the card beneath it', () => {
  const r = round(sol()); r.state.tableau[0] = [card(3,0,false),card(8,0),card(7,1),card(6,2)]; r.state.tableau[1] = [card(9,1)]; r.state.selected = 't:0:1';
  const before = structuredClone(r.state); assert(canDropSolitaire(r.state,'t:0:1','t:1')); assert.deepEqual(r.state,before);
  assert(commitDrag(solitaire,r,drop(solitaire,r,{from:'t:0:1',to:'t:1'})));
  assert.deepEqual(r.state.tableau[1].map(c=>c.rank),[9,8,7,6]); assert(r.state.tableau[0][0].up); assert.equal(r.state.selected,null);
});
test('Solitaire waste and foundation moves use the same suit/rank rules', () => {
  const r=round(sol());r.state.waste=[card(1,0)];assert(commitDrag(solitaire,r,drop(solitaire,r,{from:'w',to:'f:0'})));
  r.state.tableau[0]=[card(2,1)];assert(commitDrag(solitaire,r,drop(solitaire,r,{from:'f:0',to:'t:0'})));assert.equal(r.state.foundation[0].length,0);
});
test('Solitaire rejects face-down, broken sequence, same pile, wrong suit and empty non-King without mutation', () => {
  for (const setup of [
    s=>{s.tableau[0]=[card(8,0,false)];s.tableau[1]=[card(9,1)];},
    s=>{s.tableau[0]=[card(8,0),card(7,2)];s.tableau[1]=[card(9,1)];},
    s=>{s.tableau[0]=[card(8,0)];s.tableau[1]=[card(9,2)];},
    s=>{s.tableau[0]=[card(8,0)];}
  ]) { const r=round(sol());setup(r.state);r.state.selected='w';const before=JSON.stringify(r.state);assert.equal(commitDrag(solitaire,r,drop(solitaire,r,{from:'t:0:0',to:'t:1'})),false);assert.equal(JSON.stringify(r.state),before); }
  const r=round(sol());r.state.tableau[0]=[card(13,0)];assert.equal(commitDrag(solitaire,r,drop(solitaire,r,{from:'t:0:0',to:'t:0'})),false);
  assert.equal(validSolitaireSource(r.state,'t:99:0'),false);assert.equal(validSolitaireSource(r.state,null),false);
});
test('Block drag chooses the grabbed piece and commits immediately through place rules', () => {
  const r=round(block());assert(commitDrag(blocks,r,drop(blocks,r,{piece:0,anchor:9})));assert.deepEqual(r.state.cells.map((v,i)=>v?i:null).filter(i=>i!==null),[9,10,18]);assert.equal(r.state.score,3);assert.equal(r.state.pieces[0],null);
});
test('Block invalid/out-of-bounds/used-piece drops preserve board, selection, anchor and score', () => {
  for(const extra of [{piece:0,anchor:7},{piece:0,anchor:63},{piece:0,anchor:null},{piece:3,anchor:0},{piece:-1,anchor:0},{piece:2,anchor:0}]){
    const r=round(block());r.state.cells[0]=1;r.state.pieces[2]=null;const before=JSON.stringify(r.state);assert.equal(commitDrag(blocks,r,drop(blocks,r,extra)),false);assert.equal(JSON.stringify(r.state),before);
  }
});
test('Block row clears and score still come from the game rules', () => {
  const r=round(block());r.state.cells.fill(1,0,7);assert(commitDrag(blocks,r,drop(blocks,r,{piece:1,anchor:7})));assert.equal(r.state.lines,1);assert.equal(r.state.score,11);assert(r.state.cells.slice(0,8).every(v=>v===0));
});
test('Run/state/game tokens reject a stale drop without touching state', () => {
  for(const which of ['runId','expected','gameId']){const r=round(block()),d=drop(blocks,r,{piece:0,anchor:0});d[which]='stale';const before=JSON.stringify(r.state);assert.equal(commitDrag(blocks,r,d),false);assert.equal(JSON.stringify(r.state),before);}
});
test('Grabbed-square offset and negative edge anchors do not wrap to another row', () => {
  assert.equal(blockAnchorAt(3,4,1,1),19);assert.equal(blockAnchorAt(0,0,1,0),null);assert.equal(blockAnchorAt(0,4,0,1),null);assert.equal(blockAnchorAt(7,7),63);
  assert.equal(movementPassed(0,0,5,0,'mouse'),false);assert.equal(movementPassed(0,0,6,0,'mouse'),true);assert.equal(movementPassed(0,0,9,0,'touch'),false);assert.equal(movementPassed(0,0,10,0,'touch'),true);
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
function ui(gameId='blocks') {
  const root=new Node(),doc=new Node(),win=new Node(),body=new Node(),surface=new Node('play-surface'),feedback=new Node('game-feedback');win.PointerEvent=class{};doc.defaultView=win;root.ownerDocument=doc;doc.body=body;doc.createElement=()=>new Node();body.append(root);root.append(surface,feedback);
  const r=round(gameId==='blocks'?block():sol());let blocked=false,point=null;doc.elementFromPoint=()=>point;
  let source,board,cells=[];
  if(gameId==='blocks'){
    board=new Node('block-board');surface.append(board);for(let i=0;i<64;i++){const c=new Node('block-cell',{action:'preview',value:String(i)});const x=(i%8)*44,y=200+(i/8|0)*44;c.rect={left:x,top:y,width:40,height:40,right:x+40,bottom:y+40};board.append(c);cells.push(c);}
    root.queries['.block-board [data-action="preview"]']=cells;
    source=new Node('block-piece',{action:'piece',value:'0'});const grid=new Node('piece-grid');source.append(grid);surface.append(source);r.state.pieces[0].forEach(([x,y])=>{const i=new Node();i.rect={left:x*20,top:y*20,width:18,height:18,right:x*20+18,bottom:y*20+18};grid.append(i);});source.queries['.piece-grid i']=grid.children;
  }else{
    r.state.tableau[0]=[card(8,0),card(7,1)];r.state.tableau[1]=[card(9,1)];board=new Node('solitaire-board');surface.append(board);const tableau=new Node('tableau');board.append(tableau);for(let c=0;c<2;c++){const column=new Node('card-column');tableau.append(column);column.append(new Node('card-slot',{action:'column',value:String(c)}));for(let i=0;i<r.state.tableau[c].length;i++){const el=new Node('playing-card',{action:'select',value:`t:${c}:${i}`});column.append(el);if(c===0&&i===0)source=el;}}
    root.queries['.tableau .playing-card']=tableau.querySelectorAll('.playing-card');cells=tableau.children;
  }
  const sent=[];const controls=installDragControls({root,getContext:()=>({gameId,runId:r.runId,state:r.state,blocked}),dispatch:(...args)=>sent.push(args)});
  const down=(extra={})=>root.fire('pointerdown',{target:source,...extra});
  const move=(x,y,extra={})=>doc.fire('pointermove',{target:root,clientX:x,clientY:y,...extra});
  const up=(x,y,extra={})=>doc.fire('pointerup',{target:root,clientX:x,clientY:y,...extra});
  return {root,doc,win,body,source,board,cells,r,sent,controls,down,move,up,feedback,setPoint:x=>point=x,setBlocked:x=>blocked=x};
}
test('A click-sized motion never dispatches, captures or suppresses its click',()=>{
  const u=ui();const before=JSON.stringify(u.r.state);u.down();u.move(13,12);u.up(13,12);assert.equal(u.sent.length,0);assert.equal(u.root.capture,undefined);assert.equal(u.root.fire('click').prevented,undefined);assert.equal(JSON.stringify(u.r.state),before);
});
test('Valid Block pointer drag captures, previews, releases once and suppresses only its synthetic click',()=>{
  const u=ui();u.down({clientX:29,clientY:29});u.setPoint(u.cells[27]);u.move(152,352);assert.equal(u.root.capture,1);assert(u.cells[18].classes.has('drag-cell-valid'));assert.equal(u.body.children.length,2);assert.equal(u.body.children[1].style.transform,'translate(88px, 288px)');
  u.up(152,352);assert.equal(u.sent.length,1);assert.equal(u.sent[0][1].anchor,18);assert.equal(u.sent[0][1].piece,0);assert.equal(u.root.capture,null);assert.equal(u.body.children.length,1);assert(u.cells.every(c=>!c.classes.has('drag-cell-valid')));assert(u.root.fire('click').prevented);assert.equal(u.root.fire('click',{detail:0}).prevented,undefined);
  u.down();u.up(10,10);assert.equal(u.root.fire('click').prevented,undefined);
});
test('Outside and invalid Block releases leave every state field untouched',()=>{
  for(const outside of [true,false]){const u=ui();u.r.state.cells[0]=1;const before=JSON.stringify(u.r.state);u.down();u.setPoint(outside?null:u.cells[0]);u.move(20,220);if(!outside)assert(u.cells[0].classes.has('drag-cell-invalid'));u.up(20,220);assert.equal(u.sent.length,0);assert.equal(JSON.stringify(u.r.state),before);assert.match(u.feedback.textContent,/unchanged/);}
});
test('Pointercancel, capture loss, blur, visibility, scroll and Escape remove all transient UI',()=>{
  for(const cause of ['pointercancel','lostpointercapture','blur','visibilitychange','scroll','Escape']){const u=ui();const before=JSON.stringify(u.r.state);u.down();u.setPoint(u.cells[0]);u.move(20,220);
    if(cause==='lostpointercapture')u.root.fire(cause);else if(cause==='blur')u.win.fire(cause);else if(cause==='Escape'){const e=u.doc.fire('keydown',{key:'Escape'});assert(e.stopped);}else{if(cause==='visibilitychange')u.doc.hidden=true;u.doc.fire(cause);}
    u.up(20,220);assert.equal(u.sent.length,0,cause);assert.equal(u.body.children.length,1,cause);assert.equal(u.root.capture,null,cause);assert.equal(JSON.stringify(u.r.state),before,cause);
  }
});
test('Touch threshold, nonprimary presses, mismatched pointer IDs and multi-touch are safe',()=>{
  const u=ui();u.down({isPrimary:false});u.move(20,220);assert.equal(u.body.children.length,1);
  u.down({pointerType:'touch'});u.move(19,10,{pointerType:'touch'});assert.equal(u.body.children.length,1);u.move(20,220,{pointerType:'touch',pointerId:2});assert.equal(u.body.children.length,1);
  u.setPoint(u.cells[0]);u.move(20,220,{pointerType:'touch'});assert.equal(u.body.children.length,2);u.down({isPrimary:false,pointerId:2});u.up(20,220);assert.equal(u.sent.length,0);assert.equal(u.body.children.length,1);
});
test('State changes, game gating, DOM replacement and explicit render cancel reject an in-flight gesture',()=>{
  for(const cause of ['state','run','blocked','detached','render']){const u=ui();u.down();u.setPoint(u.cells[0]);u.move(20,220);if(cause==='state')u.r.state.selected=2;if(cause==='run')u.r.runId='other';if(cause==='blocked')u.setBlocked(true);if(cause==='detached')u.source.isConnected=false;if(cause==='render')u.controls.cancel();u.up(20,220);assert.equal(u.sent.length,0,cause);assert.equal(u.body.children.length,1,cause);}
});
test('Solitaire dragging marks the full source tail and validates the destination',()=>{
  const u=ui('solitaire');u.down();u.setPoint(u.cells[1]);u.move(80,150);assert(u.source.classes.has('drag-source'));assert.equal(u.root.querySelectorAll('.tableau .playing-card').filter(n=>n.classes.has('drag-source')).length,2);assert(u.cells[1].classes.has('drag-destination-valid'));u.up(80,150);assert.equal(u.sent[0][1].from,'t:0:0');assert.equal(u.sent[0][1].to,'t:1');assert(!u.source.classes.has('drag-source'));
});
test('Destroy removes listeners and no-PointerEvent environments retain ordinary controls',()=>{
  const u=ui();u.controls.destroy();u.down();u.move(20,220);assert.equal(u.body.children.length,1);const no=installDragControls({root:{ownerDocument:{defaultView:{}}},getContext(){},dispatch(){}});no.cancel();no.destroy();
});
console.log(`DRAG TESTS PASSED (${checks}; synthetic DOM/pointer events, not browser QA)`);
