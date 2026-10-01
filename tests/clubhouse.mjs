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
const source=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8').replace(/^import .*;$/gm,'')+`\nglobalThis.inspect=()=>({saves,recent,current,paused,confirmAction,notice,storageOK,favorites,lobbyView,lobbyFilter,lobbyScroll});globalThis.handle=handle;globalThis.persist=persist;globalThis.validState=validState;globalThis.home=home;`;
function boot({store=new Map(),hash='',search='',denyBackup=false}={}){
  let html='',time=0,focused=true,canAccessStorage=true;
  const docEvents={},winEvents={},intervals=[],element={focus(){},dataset:{}};
  const app={get innerHTML(){return html},set innerHTML(x){html=x},addEventListener(){},querySelector:()=>element,querySelectorAll:()=>[]};
  const ctx={commitDrag,installDragControls,classics,modern,logic,clone,button,console,crypto,URLSearchParams,matchMedia:()=>({matches:true}),navigator:{webdriver:true},history:{pushState(...args){ctx.location.hash=args[2];}},location:{hash,hostname:'localhost',search},performance:{now:()=>time},localStorage:{getItem:k=>{if(!canAccessStorage)throw Error('Storage unavailable');return store.get(k);},setItem:(k,v)=>{if(!canAccessStorage)throw Error('Storage unavailable');if(denyBackup&&k.includes('-recovery-'))throw Error('Simulated quota');store.set(k,v);}},document:{querySelector:()=>app,addEventListener:(k,f)=>docEvents[k]=f,hasFocus:()=>focused,hidden:false,referrer:'',activeElement:element},window:{addEventListener:(k,f)=>winEvents[k]=f,scrollTo(){}},setInterval:f=>intervals.push(f)};
  vm.createContext(ctx);vm.runInContext(source,ctx);
  return {ctx,app,store,docEvents,winEvents,advance:n=>time+=n,tick:()=>intervals[0](),focus:x=>focused=x,access:x=>canAccessStorage=x};
}
const run=(name,fn)=>{fn();console.log('PASS '+name)};
const ids=['solitaire','mahjong','water','blocks','sliding','arrows','sudoku','words'];
const tiles=t=>[...t.app.innerHTML.matchAll(/data-game="([^"]+)"/g)].map(x=>x[1]);
run('lobby renders all eight original covers without generating or saving rounds',()=>{
 const t=boot();assert.deepEqual(tiles(t),ids);assert.equal(Object.keys(t.ctx.inspect().saves).length,0);
 assert.equal(t.store.has(KEY),false);assert(!/<button\b[^>]*>(?:(?!<\/button>)[\s\S])*<button\b/.test(t.app.innerHTML));
 for(const id of ids)assert(t.app.innerHTML.includes('./art/'+id+'.svg'));
 assert.match(t.app.innerHTML,/A good place to begin/);assert.doesNotMatch(t.app.innerHTML,/In progress/);
});
run('category filters include the right games and never affect round data',()=>{
 const t=boot();t.ctx.handle('filter','classics');assert.deepEqual(tiles(t),['solitaire','mahjong','sliding']);
 t.ctx.handle('filter','relaxing');assert.deepEqual(tiles(t),['water','blocks','words']);
 t.ctx.handle('filter','logic');assert.deepEqual(tiles(t),['arrows','sudoku']);
 t.ctx.handle('filter','all');assert.deepEqual(tiles(t),ids);assert.equal(Object.keys(t.ctx.inspect().saves).length,0);
});
run('favourites are real, reloadable, removable, and separate from schema-1 rounds',()=>{
 const t=boot();t.ctx.handle('favorite','water');t.ctx.handle('favorite','words');
 assert.deepEqual(JSON.parse(t.store.get(KEY+'-favorites')),['water','words']);assert.equal(t.store.has(KEY),false);
 t.ctx.handle('lobby','favorites');assert.deepEqual(tiles(t),['water','words']);assert.equal(t.ctx.location.hash,'#favorites');
 const loaded=boot({store:t.store,hash:'#favorites'});assert.deepEqual(tiles(loaded),['water','words']);
 loaded.ctx.handle('favorite','water');assert.deepEqual(tiles(loaded),['words']);loaded.ctx.handle('favorite','words');
 assert.deepEqual(tiles(loaded),[]);assert.match(loaded.app.innerHTML,/Keep the games you love close/);
});
run('favourite edits reconcile other tabs, filter invalid IDs, and remain QA-isolated',()=>{
 const store=new Map([[KEY+'-favorites','["water","water","fake"]']]);const a=boot({store}),b=boot({store});
 a.ctx.handle('favorite','words');b.ctx.handle('favorite','blocks');assert.deepEqual(JSON.parse(store.get(KEY+'-favorites')),['water','words','blocks']);
 a.winEvents.storage({key:KEY+'-favorites'});assert.equal(a.ctx.inspect().favorites.length,3);
 const qa=boot({store,search:'?qa=1'});qa.ctx.handle('favorite','sudoku');assert.deepEqual(JSON.parse(store.get('pocket-puzzle-qa-v1-favorites')),['sudoku']);
 assert.deepEqual(JSON.parse(store.get(KEY+'-favorites')),['water','words','blocks']);
});
run('all game entry/back flows preserve exact rounds and selected lobby context',()=>{
 const t=boot();t.ctx.handle('filter','classics');
 for(const id of ids){t.ctx.handle('open',id);const before=JSON.stringify(t.ctx.inspect().saves[id]);
 assert(t.app.innerHTML.includes('aria-label="'+games.find(g=>g.id===id).title+' game"'));
 t.ctx.handle('home');assert.equal(t.ctx.inspect().current,null);assert.equal(t.ctx.inspect().lobbyFilter,'classics');
 assert.equal(JSON.stringify(t.ctx.inspect().saves[id]),before);assert.equal(JSON.parse(t.store.get(KEY)).schema,1);}
 t.ctx.handle('favorite','solitaire');t.ctx.handle('lobby','favorites');t.ctx.handle('open','solitaire');t.ctx.handle('stock');
 const before=JSON.stringify(t.ctx.inspect().saves.solitaire.state);t.ctx.handle('home');assert.deepEqual(tiles(t),['solitaire']);
 assert.equal(t.ctx.location.hash,'#favorites');t.ctx.handle('open','solitaire');assert.equal(JSON.stringify(t.ctx.inspect().saves.solitaire.state),before);
});
run('recent games expose actual moves and completed rounds never claim in progress',()=>{
 const t=boot();t.ctx.handle('open','solitaire');t.ctx.handle('stock');t.ctx.handle('home');assert.match(t.app.innerHTML,/1 move · 0:00/);assert.match(t.app.innerHTML,/Continue Solitaire/);
 t.ctx.inspect().saves.solitaire.finished=true;t.ctx.home();assert.match(t.ctx.home(),/Round complete/);assert.doesNotMatch(t.ctx.home(),/Continue Solitaire/);
});
run('storage failures explain unsaved favourites without replacing saved game data',()=>{
 const t=boot();t.ctx.handle('open','water');t.ctx.handle('home');const before=t.store.get(KEY);t.access(false);
 t.ctx.handle('favorite','water');assert.match(t.app.innerHTML,/Favourites cannot be saved/);assert.equal(t.store.get(KEY),before);assert.equal(t.ctx.inspect().favorites.length,0);t.ctx.handle('favorite','words');assert.equal(t.ctx.inspect().favorites.length,0);
});
run('browser history restores favourites and keeps game route semantics',()=>{
 const t=boot();t.ctx.handle('favorite','words');t.ctx.handle('open','words');t.ctx.location.hash='#favorites';t.winEvents.popstate();
 assert.equal(t.ctx.inspect().current,null);assert.equal(t.ctx.inspect().lobbyView,'favorites');assert.deepEqual(tiles(t),['words']);
 t.ctx.location.hash='#water';t.winEvents.popstate();assert.equal(t.ctx.inspect().current,'water');
});
run('room favourite failures stay transactional and explicit Explore resets the collection',()=>{
 const t=boot();t.ctx.handle('favorite','water');t.ctx.handle('lobby','favorites');t.ctx.handle('open','water');
 assert.match(t.app.innerHTML,/aria-label="Back to Favourites"/);assert.match(t.app.innerHTML,/data-action="lobby" data-value="all"[^>]*>Explore all 8 games/);
 t.access(false);t.ctx.handle('favorite','water');assert.equal(t.ctx.inspect().favorites.length,1);assert.match(t.app.innerHTML,/Favourites cannot be saved/);
 t.ctx.handle('favorite','water');assert.equal(t.ctx.inspect().favorites.length,1);t.access(true);t.ctx.handle('favorite','water');assert.equal(t.ctx.inspect().favorites.length,0);assert.doesNotMatch(t.app.innerHTML,/Favourites cannot be saved/);
 t.ctx.handle('lobby','all');assert.deepEqual(tiles(t),ids);assert.equal(t.ctx.inspect().lobbyFilter,'all');
});
console.log('PASS 9 clubhouse navigation, state and cover suites');
