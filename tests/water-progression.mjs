import assert from 'node:assert/strict';
import fs from 'node:fs';
import {boot} from './progression.mjs';
import {games as modern,water} from '../dist/games/modern.js';
const starter=JSON.parse(fs.readFileSync(new URL('./starter-pack-proofs.json',import.meta.url))).water;
const extra=JSON.parse(fs.readFileSync(new URL('./water-expansion-proofs.json',import.meta.url)));
const proofs=[...starter,...extra],slot='pocket-puzzle-qa-v1-starter-round-v1:water',mode='pocket-puzzle-qa-v1-play-mode:water';
const legacy=fs.readFileSync(new URL('./legacy-app-1.11.3.txt',import.meta.url),'utf8').replace(/^import .*;$/gm,'')+'\nglobalThis.inspect=()=>({saves,protectedPacks,completedLevels,current});Object.assign(globalThis,{handle,persist});';
const oldModern=modern.map(g=>g.id==='water'?{...g,levels:g.levels.slice(0,3)}:g);
let count=0;const test=(name,fn)=>{fn();console.log('PASS',name);count++;};
function finish(t,n){const r=t.ctx.inspect().saves.water;assert.equal(r.levelId,'water-'+n);for(const [a,b]of proofs[n-1].proof){t.ctx.handle('tube',a);t.ctx.handle('tube',b);}assert(r.finished);assert(water.won(r.state));return r;}
function advance(t,n){const r=t.ctx.inspect().saves.water;t.ctx.handle('next-level',t.ctx.nextToken(water,r,water.levels[n-1]));assert.equal(t.ctx.inspect().saves.water.levelId,'water-'+n);}
function through(t,n){for(let l=1;l<=n;l++){finish(t,l);if(l<n)advance(t,l+1);}}
const credits=store=>[...store].filter(([k])=>k.startsWith('pocket-puzzle-qa-v1-completed:starter-v1:water:'));
test('A shipped 3/3 finish becomes earned 3/9 with Level 4 ready and no old layout changes',()=>{
 const old=boot({hash:'#water',code:legacy,modernGames:oldModern});
 for(let n=1;n<=3;n++){finish(old,n);if(n<3){const r=old.ctx.inspect().saves.water;old.ctx.handle('next-level',`levels|starter-v1|${r.runId}|water-${n+1}`);}}
 assert.match(old.app.innerHTML,/Starter pack complete/);const raw=old.store.get(slot),earned=credits(old.store);
 const t=boot({store:old.store,hash:'#water'});assert.deepEqual(JSON.parse(t.store.get(slot)).saves,JSON.parse(raw).saves);assert.deepEqual(credits(t.store),earned);assert.equal(t.ctx.inspect().completedLevels.size,3);assert.match(t.app.innerHTML,/3 of 9 levels complete/);assert.doesNotMatch(t.app.innerHTML,/pack complete!/);assert.match(t.app.innerHTML,/Next level/);advance(t,4);assert.deepEqual(JSON.parse(JSON.stringify(t.ctx.inspect().saves.water.state)),water.levels[3].state);
});
test('Shipped 1.11.3 writer cannot erase an unknown new level attempt or its completion',()=>{
 const store=new Map(),old=boot({store,hash:'#water',code:legacy,modernGames:oldModern}),t=boot({store,hash:'#water'});through(t,4);advance(t,5);t.ctx.handle('tube',extra[1].proof[0][0]);t.ctx.handle('tube',extra[1].proof[0][1]);
 const expected=store.get(slot),earned=credits(store),active=store.get(mode);old.ctx.handle('tube',0);old.ctx.persist();old.ctx.handle('tube',1);old.ctx.handle('home');old.ctx.handle('open','water');old.ctx.persist();
 assert.equal(store.get(slot),expected);assert.deepEqual(credits(store),earned);assert.equal(store.get(mode),active);assert(old.ctx.inspect().protectedPacks.has('water'));
 const resumed=boot({store,hash:'#water'});assert.equal(resumed.ctx.inspect().saves.water.levelId,'water-5');assert.equal(resumed.ctx.inspect().saves.water.moves,1);
});
test('Fresh old tab protects unknown Water level even when recovery backup writes fail',()=>{
 const t=boot({hash:'#water'});through(t,3);advance(t,4);const raw=t.store.get(slot),earned=credits(t.store);
 const old=boot({store:t.store,hash:'#water',code:legacy,modernGames:oldModern,deny:k=>k.includes('-recovery-')});old.ctx.handle('tube',0);old.ctx.handle('tube',4);old.ctx.persist();assert.equal(t.store.get(slot),raw);assert.deepEqual(credits(t.store),earned);assert(old.ctx.inspect().protectedPacks.has('water'));
});
test('All nine rounds preserve separate free play, per-level replay, reload and honest 9/9 end',()=>{
 let t=boot({hash:'#water'});t.ctx.handle('new');t.ctx.handle('confirm');const free=JSON.stringify(t.ctx.inspect().saves.water);t.ctx.handle('levels');t.ctx.handle('choose-deal','water-1');t.ctx.handle('confirm');
 for(let n=1;n<=9;n++){
  const start=JSON.stringify(t.ctx.inspect().saves.water.state);t.ctx.handle('levels');assert.match(t.app.innerHTML,/9 fixed levels/);assert.match(t.app.innerHTML,/Three warm-ups, then six layered puzzles/);t.ctx.handle('choose-deal','water-'+n);t.ctx.handle('cancel');t.ctx.handle('settings');assert.equal(JSON.stringify(t.ctx.inspect().saves.water.state),start);
  finish(t,n);t=boot({store:t.store,hash:'#water'});assert.equal(t.ctx.inspect().saves.water.levelId,'water-'+n);assert(t.ctx.inspect().saves.water.finished);assert.equal(t.ctx.inspect().completedLevels.size,n);assert.equal(JSON.stringify(t.ctx.inspect().freeSaves.water),free);if(n<9)advance(t,n+1);
 }
 assert.match(t.app.innerHTML,/Water pack complete!/);assert.match(t.app.innerHTML,/9 of 9 levels complete/);assert.doesNotMatch(t.app.innerHTML,/data-action="next-level"/);t.ctx.handle('levels');t.ctx.handle('choose-deal','water-4');t.ctx.handle('confirm');finish(t,4);assert.equal(credits(t.store).length,9);assert.equal(t.ctx.inspect().saves.water.hints,0);t.ctx.handle('levels');t.ctx.handle('choose-deal','free');t.ctx.handle('confirm');assert.equal(JSON.stringify(t.ctx.inspect().saves.water),free);
});
test('Expanded-level Hint, undo, restart and storage failure keep their existing meanings',()=>{
 const t=boot({hash:'#water'});through(t,3);advance(t,4);const initial=JSON.stringify(t.ctx.inspect().saves.water.state);t.ctx.handle('hint');assert.equal(t.ctx.inspect().saves.water.hints,1);const [a,b]=extra[0].proof[0];t.ctx.handle('tube',b);assert.equal(t.ctx.inspect().saves.water.moves,1);t.ctx.handle('undo');assert.equal(t.ctx.inspect().saves.water.moves,0);t.ctx.handle('restart');t.ctx.handle('confirm');assert.equal(JSON.stringify(t.ctx.inspect().saves.water.state),initial);
 const fail=boot({store:t.store,hash:'#water',deny:true});finish(fail,4);assert(!fail.ctx.inspect().storageOK);assert(fail.ctx.inspect().unsavedCompletions.size);assert.match(fail.ctx.inspect().notice,/not saved/);
});
console.log(`WATER PROGRESSION TESTS PASSED (${count})`);
