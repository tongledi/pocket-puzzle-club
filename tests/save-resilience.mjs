import { commitDrag, installDragControls } from '../dist/drag.js';
// Controller/localStorage regression tests. No browser or user storage is touched.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {games as classics} from '../dist/games/classics.js';
import {games as modern} from '../dist/games/modern.js';
import {games as logic} from '../dist/games/logic.js';
import {clone,button} from '../dist/games/core.js';
const KEY='pocket-puzzle-v1',games=[...classics,...modern,...logic];
const source=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8').replace(/^import .*;$/gm,'')+`\nglobalThis.inspect=()=>({saves,recent,current,paused,confirmAction,notice,storageOK});globalThis.handle=handle;globalThis.persist=persist;globalThis.validState=validState;`;
function boot({store=new Map(),hash='',search='',denyBackup=false}={}){
  let html='',time=0,focused=true,canAccessStorage=true;
  const docEvents={},winEvents={},intervals=[],element={focus(){},dataset:{}};
  const app={get innerHTML(){return html},set innerHTML(x){html=x},addEventListener(){},querySelector:()=>element,querySelectorAll:()=>[]};
  const ctx={commitDrag,installDragControls,classics,modern,logic,clone,button,console,crypto,URLSearchParams,matchMedia:()=>({matches:true}),navigator:{webdriver:true},history:{pushState(...args){ctx.location.hash=args[2];}},location:{hash,hostname:'localhost',search},performance:{now:()=>time},localStorage:{getItem:k=>{if(!canAccessStorage)throw Error('Storage unavailable');return store.get(k);},setItem:(k,v)=>{if(!canAccessStorage)throw Error('Storage unavailable');if(denyBackup&&k.includes('-recovery-'))throw Error('Simulated quota');store.set(k,v);}},document:{querySelector:()=>app,addEventListener:(k,f)=>docEvents[k]=f,hasFocus:()=>focused,hidden:false,referrer:'',activeElement:element},window:{addEventListener:(k,f)=>winEvents[k]=f,scrollTo(){}},setInterval:f=>intervals.push(f)};
  vm.createContext(ctx);vm.runInContext(source,ctx);
  return {ctx,app,store,docEvents,winEvents,advance:n=>time+=n,tick:()=>intervals[0](),focus:x=>focused=x,access:x=>canAccessStorage=x};
}
const saved=t=>JSON.parse(t.store.get(KEY));
const backups=store=>[...store.entries()].filter(([k])=>k.startsWith(KEY+'-recovery-')).map(([,v])=>JSON.parse(v));
const open=(t,id)=>t.ctx.handle('open',id);
const firstMove=(t,id)=>{
  const r=t.ctx.inspect().saves[id];
  if(id==='solitaire')t.ctx.handle('stock');
  if(id==='mahjong'){for(const i of r.state.solution[0])t.ctx.handle('tile',i);}
  if(id==='water'){for(const i of r.state.path[0])t.ctx.handle('tube',i);}
  if(id==='blocks'){t.ctx.handle('preview',0);t.ctx.handle('place',0);}
  if(id==='arrows'){t.ctx.handle('hint');t.ctx.handle('arrow',r.state.hint);}
  if(id==='sliding')t.ctx.handle('tile',r.state.trail.at(-1));
  if(id==='sudoku'){const i=r.state.given.findIndex(x=>!x);t.ctx.handle('cell',i);t.ctx.handle('number',r.state.answer[i]);}
  if(id==='words'){t.ctx.handle('letter',r.state.paths[0][0]);t.ctx.handle('letter',r.state.paths[0].at(-1));}
};
{
  const store=new Map(),a=boot({store}),idle=boot({store});
  open(a,'solitaire');firstMove(a,'solitaire');const expected=saved(a).saves.solitaire;
  a.winEvents.pagehide();idle.advance(1000);idle.tick();
  assert.equal(JSON.stringify(saved(idle).saves.solitaire.state),JSON.stringify(expected.state));
  assert.equal(saved(idle).saves.solitaire.moves,1);
  console.log('PASS idle Home tab cannot erase another tab’s round after it closes');
}
{
  const store=new Map(),a=boot({store}),b=boot({store});open(a,'solitaire');firstMove(a,'solitaire');
  open(b,'water');firstMove(b,'water');a.advance(1000);a.tick();
  assert.equal(saved(a).saves.solitaire.moves,1);assert.equal(saved(a).saves.water.moves,1);
  b.winEvents.storage({key:KEY});assert.equal(b.ctx.inspect().saves.solitaire.moves,1);
  console.log('PASS changes to different games are retained across interleaved saves and storage events');
}
{
  const store=new Map(),a=boot({store});open(a,'sliding');const b=boot({store,hash:'#sliding'});
  const staleIndex=b.ctx.inspect().saves.sliding.state.trail.at(-1),oldRun=b.ctx.inspect().saves.sliding.runId;
  a.ctx.handle('new');a.ctx.handle('confirm');const expected=saved(a).saves.sliding;
  assert.notEqual(expected.runId,oldRun);
  b.ctx.handle('tile',staleIndex);
  assert.equal(JSON.stringify(b.ctx.inspect().saves.sliding.state),JSON.stringify(expected.state));
  assert.equal(b.ctx.inspect().saves.sliding.moves,0);assert.match(b.app.innerHTML,/changed in another tab/);
  firstMove(b,'sliding');assert.equal(b.ctx.inspect().saves.sliding.moves,1);
  a.advance(1000);a.tick();assert.equal(saved(a).saves.sliding.moves,1);
  console.log('PASS same-game replacement rejects a stale cell click; a fresh click works; stale timer cannot roll it back');
}
{
  const store=new Map(),a=boot({store});open(a,'solitaire');const b=boot({store,hash:'#solitaire'});
  b.ctx.handle('pause');a.advance(1000);a.tick();b.winEvents.storage({key:KEY});
  assert.equal(b.ctx.inspect().paused,true);assert.equal(b.ctx.inspect().saves.solitaire.activeMs,1000);
  b.ctx.handle('new');a.advance(1000);a.tick();b.winEvents.storage({key:KEY});
  assert.equal(b.ctx.inspect().confirmAction,'new');assert.equal(b.ctx.inspect().paused,true);
  console.log('PASS timer-only synchronization preserves pause and confirmation dialogs');
}
{
  const store=new Map(),a=boot({store});open(a,'solitaire');const b=boot({store,hash:'#solitaire'});
  // Simulate a local board mutation pending persistence when another tab replaces the round.
  const local=b.ctx.inspect().saves.solitaire;classics[0].action(local.state,'stock');local.moves++;
  a.ctx.handle('new');a.ctx.handle('confirm');const expected=saved(a).saves.solitaire;
  b.ctx.persist();assert.equal(b.ctx.inspect().saves.solitaire.runId,expected.runId);
  const copy=backups(store).find(x=>x.reason==='conflicting local progress');assert.ok(copy);
  assert.equal(JSON.parse(copy.original).saves.solitaire.moves,1);
  console.log('PASS genuinely divergent local progress is backed up before adopting the remote round');
}
{
  const sourceTab=boot();open(sourceTab,'solitaire');firstMove(sourceTab,'solitaire');
  const payload=saved(sourceTab),healthy=JSON.stringify(payload.saves.solitaire.state);
  payload.saves.sudoku={state:{},initial:{},history:[],moves:0,activeMs:0};
  const original=JSON.stringify(payload),store=new Map([[KEY,original]]),t=boot({store});
  assert.match(t.app.innerHTML,/What feels good today/);assert.match(t.app.innerHTML,/damaged and backed up/);
  assert.equal(JSON.stringify(t.ctx.inspect().saves.solitaire.state),healthy);
  assert.equal(t.ctx.inspect().saves.sudoku,undefined);assert.equal(backups(store)[0].original,original);
  open(t,'solitaire');t.ctx.handle('undo');assert.equal(t.ctx.inspect().saves.solitaire.moves,0);
  console.log('PASS malformed game state cannot blank Home or healthy rounds; raw source is backed up');
}
{
  const t=boot();open(t,'sliding');firstMove(t,'sliding');const payload=saved(t);
  payload.saves.sliding.history.push(null,{state:{cells:[]},moves:1});
  const state=JSON.stringify(payload.saves.sliding.state),store=new Map([[KEY,JSON.stringify(payload)]]),restored=boot({store,hash:'#sliding'});
  assert.equal(JSON.stringify(restored.ctx.inspect().saves.sliding.state),state);
  assert.equal(restored.ctx.inspect().saves.sliding.history.length,1);
  restored.ctx.handle('undo');assert.equal(restored.ctx.inspect().saves.sliding.moves,0);assert.equal(backups(store).length,1);
  console.log('PASS invalid Undo entries are quarantined while valid state and earlier Undo survive');
}
{
  const t=boot();open(t,'sudoku');firstMove(t,'sudoku');const payload=saved(t);payload.saves.sudoku.initial={};
  const current=JSON.stringify(payload.saves.sudoku.state),store=new Map([[KEY,JSON.stringify(payload)]]),restored=boot({store,hash:'#sudoku'});
  assert.equal(JSON.stringify(restored.ctx.inspect().saves.sudoku.state),current);
  assert.equal(JSON.stringify(restored.ctx.inspect().saves.sudoku.initial),current);assert.equal(backups(store).length,1);
  console.log('PASS damaged starting snapshot retains the current playable board and an original backup');
}
{
  const raw='{broken JSON',store=new Map([[KEY,raw]]),t=boot({store});assert.match(t.app.innerHTML,/What feels good today/);
  t.tick();assert.equal(backups(store)[0].original,raw);
  const future=JSON.stringify({schema:2,saves:{preserve:'future format'}}),newerStore=new Map([[KEY,future]]),newer=boot({store:newerStore});
  open(newer,'water');firstMove(newer,'water');newer.tick();assert.equal(newerStore.get(KEY),future);assert.match(newer.app.innerHTML,/unrecognized format/);
  console.log('PASS malformed JSON is backed up; unknown future schemas are never overwritten');
}
{
  const raw='{broken JSON',store=new Map([[KEY,raw]]),t=boot({store,denyBackup:true});open(t,'solitaire');firstMove(t,'solitaire');t.tick();
  assert.equal(store.get(KEY),raw);assert.equal(t.ctx.inspect().saves.solitaire.moves,1);assert.match(t.app.innerHTML,/could not be backed up/);
  console.log('PASS backup failure preserves original disk data and new in-memory play');
}
{
  const t=boot();open(t,'sudoku');const payload=saved(t),run=payload.saves.sudoku;
  delete payload.schema;payload.version='1.0.0';delete run.state.notes;delete run.state.notesMode;delete run.state.generatorVersion;delete run.initial.notes;delete run.initial.notesMode;delete run.initial.generatorVersion;
  const legacyTiles=Array.from({length:28},(_,i)=>({x:i%7,y:i/7|0,z:0,type:i%14,gone:false}));
  payload.saves.mahjong={runId:'legacy-mahjong',state:{tiles:legacyTiles,selected:null,message:''},initial:{tiles:clone(legacyTiles),selected:null,message:''},history:[],moves:0,activeMs:0,first:false,finished:false,hints:0};
  const store=new Map([[KEY,JSON.stringify(payload)]]),restored=boot({store});
  assert.equal(backups(store).length,0);open(restored,'sudoku');firstMove(restored,'sudoku');restored.ctx.handle('undo');restored.ctx.handle('hint');
  open(restored,'mahjong');assert.equal(restored.ctx.inspect().saves.mahjong.state.tiles.length,28);restored.ctx.handle('hint');assert.match(restored.app.innerHTML,/saved 28-tile/);
  console.log('PASS valid v1.0 Sudoku without pencil fields and legacy 28-tile Mahjong remain playable');
}
{
  const t=boot();open(t,'solitaire');firstMove(t,'solitaire');const disk=t.store.get(KEY);
  t.access(false);t.advance(1000);t.tick();t.ctx.handle('stock');
  assert.equal(t.ctx.inspect().saves.solitaire.moves,2);assert.equal(t.store.get(KEY),disk);
  assert.match(t.app.innerHTML,/Not saved/);t.access(true);t.tick();
  assert.equal(saved(t).saves.solitaire.moves,2);assert.equal(t.ctx.inspect().storageOK,true);
  console.log('PASS storage access loss never clears the in-memory round; restored access retains pending moves');
}
for(const g of games){
  const t=boot();open(t,g.id);firstMove(t,g.id);const state=JSON.stringify(t.ctx.inspect().saves[g.id].state),before=JSON.stringify(t.ctx.inspect().saves[g.id].history.at(-1).state);
  const restored=boot({store:t.store,hash:'#'+g.id});assert.equal(JSON.stringify(restored.ctx.inspect().saves[g.id].state),state);restored.ctx.handle('undo');
  assert.equal(JSON.stringify(restored.ctx.inspect().saves[g.id].state),before);assert.equal(backups(t.store).length,0);
}
console.log('PASS all eight normal round saves reload and Undo exactly without false corruption warnings');
{
  const normal=boot();open(normal,'solitaire');firstMove(normal,'solitaire');
  normal.store.set('pocket-local-events',JSON.stringify([{event:'normal-data-must-survive'}]));
  normal.store.set(KEY+'-recovery-existing',JSON.stringify({original:'untouched normal backup'}));
  const originals=new Map(normal.store),qa=boot({store:normal.store,search:'?qa=1'});
  assert.match(qa.app.innerHTML,/QA test session/);assert.equal(Object.keys(qa.ctx.inspect().saves).length,0);
  for(const g of games){open(qa,g.id);firstMove(qa,g.id);qa.ctx.handle('restart');qa.ctx.handle('confirm');qa.ctx.handle('new');qa.ctx.handle('confirm');}
  qa.winEvents.pagehide();qa.tick();
  assert.equal(Object.keys(JSON.parse(qa.store.get('pocket-puzzle-qa-v1')).saves).length,8);
  for(const [key,value] of originals)assert.equal(qa.store.get(key),value,'QA must not change '+key);
  qa.store.set('pocket-puzzle-qa-v1','{damaged QA save');
  const damagedQa=boot({store:qa.store,search:'?qa=1'});damagedQa.tick();
  assert.ok([...qa.store.keys()].some(key=>key.startsWith('pocket-puzzle-qa-v1-recovery-')));
  for(const [key,value] of originals)assert.equal(qa.store.get(key),value,'QA recovery must not change '+key);
  console.log('PASS ?qa=1 isolates all eight rounds, restart/new, backup recovery and logs from normal storage');
}
{
  const invalidIds=['constructor','toString','__proto__','valueOf','hasOwnProperty','missing-game',''];
  for(const id of invalidIds){
    const t=boot({hash:'#'+id});assert.equal(t.ctx.inspect().current,null,id+' startup stays Home');assert.match(t.app.innerHTML,/What feels good today/);
    t.ctx.handle('open',id);assert.equal(t.ctx.inspect().current,null,id+' open is ignored on Home');
    open(t,'solitaire');firstMove(t,'solitaire');const state=JSON.stringify(t.ctx.inspect().saves.solitaire.state);
    t.ctx.handle('open',id);assert.equal(t.ctx.inspect().current,'solitaire');assert.equal(JSON.stringify(t.ctx.inspect().saves.solitaire.state),state);
    t.ctx.handle('new');t.ctx.location.hash='#'+id;t.winEvents.popstate();
    assert.equal(t.ctx.inspect().current,null,id+' history returns Home');assert.equal(t.ctx.inspect().confirmAction,null);
    assert.equal(JSON.stringify(t.ctx.inspect().saves.solitaire.state),state,id+' never damages valid progress');assert.match(t.app.innerHTML,/What feels good today/);
  }
  console.log('PASS invalid and inherited-key routes cannot enter a game, crash startup/history, or damage valid progress');
}
console.log('SAVE RESILIENCE TESTS PASSED (isolated VM/localStorage harness, not browser evidence)');
