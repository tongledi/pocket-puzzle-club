import {games as classics} from './games/classics.js';
import {games as modern} from './games/modern.js';
import {games as logic} from './games/logic.js';
import {clone,button} from './games/core.js';
const games=[...classics,...modern,...logic],byId=Object.fromEntries(games.map(g=>[g.id,g]));
const app=document.querySelector('#app'),VERSION='1.1.0',qaMode=new URLSearchParams(location.search).get('qa')==='1',KEY=qaMode?'pocket-puzzle-qa-v1':'pocket-puzzle-v1',EVENT_KEY=qaMode?'pocket-qa-local-events':'pocket-local-events';
let storageOK=true,saves={},recent=[],bestScores={},current=null,paused=false,confirmAction=null,notice='',rulesState={},lastTick=performance.now();
const sessionId=crypto.randomUUID();
const testMode=qaMode||navigator.webdriver||location.hostname==='localhost'||location.hostname==='127.0.0.1'||new URLSearchParams(location.search).get('test')==='1';
function read(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{storageOK=false;return fallback;}}
// Schema-1 rounds stay whole during cross-tab reconciliation. Never merge boards.
const isRecord=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const integer=(x,min,max)=>Number.isInteger(x)&&x>=min&&x<=max;
const vector=(x,n,test)=>Array.isArray(x)&&x.length===n&&x.every(test);
const indexOrEmpty=(x,n)=>x==null||integer(x,0,n-1);
const pairs=(x,n)=>x==null||Array.isArray(x)&&x.every(p=>vector(p,2,i=>integer(i,0,n-1)));
function validState(id,s){
  if(!isRecord(s)||s.message!=null&&typeof s.message!=='string')return false;
  if(id==='solitaire'){
    const validCard=c=>isRecord(c)&&integer(c.rank,1,13)&&integer(c.suit,0,3)&&typeof c.up==='boolean';
    if(!vector(s.tableau,7,p=>Array.isArray(p)&&p.every(validCard))||!vector(s.foundation,4,p=>Array.isArray(p)&&p.every(validCard))||!Array.isArray(s.stock)||!s.stock.every(validCard)||!Array.isArray(s.waste)||!s.waste.every(validCard))return false;
    const deck=[...s.tableau.flat(),...s.foundation.flat(),...s.stock,...s.waste];
    return deck.length===52&&new Set(deck.map(c=>c.suit+':'+c.rank)).size===52&&(s.selected==null||typeof s.selected==='string')&&(s.hintTarget==null||typeof s.hintTarget==='string')&&(s.lastMove==null||isRecord(s.lastMove)&&typeof s.lastMove.from==='string'&&typeof s.lastMove.to==='string');
  }
  if(id==='mahjong')return Array.isArray(s.tiles)&&[28,72].includes(s.tiles.length)&&s.tiles.every(t=>isRecord(t)&&integer(t.x,0,7)&&integer(t.y,0,5)&&integer(t.z,0,2)&&integer(t.type,0,s.symbolsVersion===2?17:13)&&typeof t.gone==='boolean')&&new Set(s.tiles.map(t=>[t.x,t.y,t.z].join(':'))).size===s.tiles.length&&indexOrEmpty(s.selected,s.tiles.length)&&(s.hint==null||vector(s.hint,2,i=>integer(i,0,s.tiles.length-1)))&&pairs(s.solution,s.tiles.length);
  if(id==='water'){
    if(!vector(s.tubes,7,t=>Array.isArray(t)&&t.length<=4&&t.every(c=>integer(c,0,4))))return false;
    const drops=s.tubes.flat();return drops.length===20&&[0,1,2,3,4].every(c=>drops.filter(n=>n===c).length===4)&&indexOrEmpty(s.selected,7)&&indexOrEmpty(s.hintTarget,7)&&pairs(s.path,7);
  }
  if(id==='blocks')return vector(s.cells,64,n=>n===0||n===1)&&vector(s.pieces,3,p=>p===null||Array.isArray(p)&&p.length>0&&p.length<=8&&p.every(c=>vector(c,2,n=>integer(n,0,7)))&&new Set(p.map(c=>c.join(':'))).size===p.length)&&integer(s.selected,-1,2)&&indexOrEmpty(s.anchor,64)&&Number.isFinite(s.score)&&s.score>=0&&Number.isFinite(s.lines)&&s.lines>=0;
  if(id==='arrows')return vector(s.cells,36,n=>n===null||integer(n,0,3))&&(s.hint==null||integer(s.hint,-1,35))&&(s.blocked==null||Array.isArray(s.blocked)&&s.blocked.every(i=>integer(i,0,35)));
  if(id==='sliding'){
    if(!vector(s.cells,16,n=>integer(n,0,15))||new Set(s.cells).size!==16||!Array.isArray(s.trail)||!s.trail.every(i=>integer(i,0,15)))return false;
    const cells=[...s.cells];let z=cells.indexOf(0);
    for(let k=s.trail.length-1;k>=0;k--){const i=s.trail[k];if(Math.abs(i%4-z%4)+Math.abs((i/4|0)-(z/4|0))!==1)return false;[cells[z],cells[i]]=[cells[i],cells[z]];z=i;}
    return cells.every((n,i)=>n===(i+1)%16);
  }
  if(id==='sudoku'){
    if(!vector(s.cells,81,n=>integer(n,0,9))||!vector(s.answer,81,n=>integer(n,1,9))||!vector(s.given,81,n=>typeof n==='boolean')||!integer(s.selected,-1,80)||s.notes!=null&&!vector(s.notes,81,n=>integer(n,0,1022)&&!(n&~0x3fe)))return false;
    if(s.given.some((fixed,i)=>fixed&&s.cells[i]!==s.answer[i]))return false;
    for(let j=0;j<9;j++){const row=[],col=[],box=[];for(let k=0;k<9;k++){row.push(s.answer[j*9+k]);col.push(s.answer[k*9+j]);box.push(s.answer[(j/3|0)*27+j%3*3+(k/3|0)*9+k%3]);}if([row,col,box].some(a=>new Set(a).size!==9))return false;}
    return true;
  }
  if(id==='words')return vector(s.cells,100,c=>typeof c==='string'&&/^[A-Z]$/.test(c))&&Array.isArray(s.list)&&s.list.length>0&&s.list.every(w=>typeof w==='string'&&/^[A-Z]{1,10}$/.test(w))&&vector(s.paths,s.list.length,(p,i)=>Array.isArray(p)&&p.length===s.list[i].length&&p.every(j=>integer(j,0,99))&&(p.map(j=>s.cells[j]).join('')===s.list[i]||p.map(j=>s.cells[j]).reverse().join('')===s.list[i]))&&Array.isArray(s.found)&&s.found.every(i=>integer(i,0,s.list.length-1))&&new Set(s.found).size===s.found.length&&indexOrEmpty(s.selected,100)&&indexOrEmpty(s.hint,100);
  return false;
}
function validSave(s,id){return isRecord(s)&&validState(id,s.state)&&validState(id,s.initial)&&Array.isArray(s.history)&&s.history.every(h=>isRecord(h)&&validState(id,h.state)&&integer(h.moves,0,Number.MAX_SAFE_INTEGER))&&integer(s.moves,0,Number.MAX_SAFE_INTEGER)&&Number.isFinite(s.activeMs)&&s.activeMs>=0;}
let diskRaw=null,baseSaves={},recoveryBlocked=false;
const quarantined=new Set();
function rawSave(){try{return localStorage.getItem(KEY)??null;}catch{storageOK=false;return diskRaw;}}
function quarantine(raw,reason='damaged save'){
  if(raw==null||quarantined.has(raw))return !recoveryBlocked;quarantined.add(raw);
  try{localStorage.setItem(`${KEY}-recovery-${Date.now()}-${crypto.randomUUID()}`,JSON.stringify({savedAt:new Date().toISOString(),reason,original:raw}));return true;}
  catch{storageOK=false;recoveryBlocked=true;notice='Saved progress could not be backed up. Existing data has been left untouched; keep this tab open to retain new play.';return false;}
}
function decodeSaves(raw){
  const empty={saves:{},recent:[],bestScores:{}};if(raw==null)return empty;
  let data;try{data=JSON.parse(raw);}catch{quarantine(raw);if(!recoveryBlocked)notice='A damaged save was set aside in a local backup. You can start a new round.';return empty;}
  if(!isRecord(data)){quarantine(raw);if(!recoveryBlocked)notice='A damaged save was set aside in a local backup. You can start a new round.';return empty;}
  if(data.schema!==1&&data.version!=='1.0.0'){
    if(Object.keys(data).length){quarantine(raw);recoveryBlocked=true;storageOK=false;notice='This saved data uses an unrecognized format. It has been left untouched; new play stays in this tab.';}
    return empty;
  }
  let restoredStarts=[],repaired=!isRecord(data.saves),out={saves:isRecord(data.saves)?{...data.saves}:{},recent:Array.isArray(data.recent)?[...new Set(data.recent.filter(id=>Object.hasOwn(byId,id)))].slice(0,8):[],bestScores:isRecord(data.bestScores)?{...data.bestScores}:{}};
  for(const g of games){
    const saved=out.saves[g.id];if(saved==null){delete out.saves[g.id];continue;}
    if(!isRecord(saved)||!validState(g.id,saved.state)){delete out.saves[g.id];repaired=true;continue;}
    const run={...saved};
    if(!validState(g.id,run.initial)){run.initial=clone(run.state);restoredStarts.push(g.title);repaired=true;}
    const history=Array.isArray(run.history)?run.history.filter(h=>isRecord(h)&&validState(g.id,h.state)&&integer(h.moves,0,Number.MAX_SAFE_INTEGER)).slice(-120):[];
    if(!Array.isArray(run.history)||history.length!==run.history.length)repaired=true;run.history=history;
    if(!integer(run.moves,0,Number.MAX_SAFE_INTEGER)){run.moves=0;repaired=true;}
    if(!Number.isFinite(run.activeMs)||run.activeMs<0){run.activeMs=0;repaired=true;}
    if(!integer(run.hints,0,Number.MAX_SAFE_INTEGER))run.hints=0;
    if(typeof run.runId!=='string'||!run.runId)run.runId=crypto.randomUUID();
    run.first=!!run.first;run.finished=!!(g.won(run.state)||g.ended?.(run.state));run.outcomeRecorded=!!run.outcomeRecorded;
    out.saves[g.id]=run;
  }
  if(!Number.isFinite(out.bestScores.blocks)||out.bestScores.blocks<0)delete out.bestScores.blocks;
  if(repaired){quarantine(raw);if(!recoveryBlocked)notice='Some saved data was damaged and backed up locally. Healthy rounds and usable history were kept.'+(restoredStarts.length?` Restart uses the recovered current board for ${restoredStarts.join(', ')}.`:'');}
  return out;
}
function rememberDisk(raw,data){diskRaw=raw;baseSaves=Object.fromEntries(Object.entries(data.saves).map(([id,s])=>[id,JSON.stringify(s)]));}
const firstRaw=rawSave(),stored=decodeSaves(firstRaw);saves=stored.saves;recent=stored.recent;bestScores=stored.bestScores;rememberDisk(firstRaw,stored);
// A changed remote slot wins over a stale local slot, including stale timers.
// A slot untouched on disk keeps this tab's pending action. Other games survive.
const progressSignature=s=>s==null?undefined:JSON.stringify({...s,activeMs:0});
function syncSaves(){
  const raw=rawSave();if(raw===diskRaw)return false;
  const remote=decodeSaves(raw);let currentChanged=false;
  for(const id of new Set([...Object.keys(baseSaves),...Object.keys(remote.saves)])){
    const next=remote.saves[id],signature=next==null?undefined:JSON.stringify(next);
    if(signature!==baseSaves[id]){
      const base=baseSaves[id]==null?undefined:JSON.parse(baseSaves[id]),local=saves[id];
      if(progressSignature(next)===progressSignature(base)&&local&&next&&local.runId===next.runId){local.activeMs=Math.max(local.activeMs,next.activeMs);continue;}
      const divergent=local&&progressSignature(local)!==progressSignature(base)&&progressSignature(local)!==progressSignature(next);
      if(divergent&&!quarantine(JSON.stringify({schema:1,version:VERSION,saves:{[id]:local}}),'conflicting local progress'))continue;
      if(next==null)delete saves[id];else saves[id]=next;
      if(id===current&&progressSignature(local)!==progressSignature(next)){currentChanged=true;if(!saves[id])saves[id]=fresh(byId[id]);}
    }
  }
  recent=[...new Set([...remote.recent,...recent])].slice(0,8);
  bestScores={...remote.bestScores,...bestScores,blocks:Math.max(Number(remote.bestScores.blocks)||0,Number(bestScores.blocks)||0)};
  rememberDisk(raw,remote);
  if(currentChanged){paused=false;confirmAction=null;lastTick=performance.now();notice='This round changed in another tab. The latest saved progress is now shown.';}
  return currentChanged;
}

let events=read(EVENT_KEY,[]);if(!Array.isArray(events))events=[];
function event(type,extra={}){if(testMode)return;events.push({version:VERSION,event:type,session_id:sessionId,game_id:current,run_id:current?saves[current]?.runId:null,at:new Date().toISOString(),...extra});events=events.slice(-500);try{localStorage.setItem(EVENT_KEY,JSON.stringify(events));}catch{}}
function persist(){const wasStorageOK=storageOK,changed=syncSaves();if(!recoveryBlocked){try{const data={schema:1,version:VERSION,saves,recent,bestScores},raw=JSON.stringify(data);if(raw!==diskRaw){localStorage.setItem(KEY,raw);storageOK=true;}rememberDisk(raw,data);}catch{storageOK=false;}}if(changed||wasStorageOK!==storageOK)render(true);}
function flushTime(){const now=performance.now();if(current&&!paused&&!confirmAction&&!document.hidden&&(!document.hasFocus||document.hasFocus())){let s=saves[current];if(s&&!s.finished)s.activeMs+=Math.min(now-lastTick,15000);}lastTick=now;}
function duration(ms){let n=Math.floor(ms/1000);return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;}
function fresh(g){const state=g.create();return {runId:crypto.randomUUID(),state,initial:clone(state),history:[],moves:0,activeMs:0,first:false,finished:false,hints:0,outcomeRecorded:false};}
function openGame(id,route=true){flushTime();if(current&&current!==id)event('game_switch',{to_game:id,active_ms:Math.round(saves[current]?.activeMs||0)});current=id;paused=false;if(!validSave(saves[id],id))saves[id]=fresh(byId[id]);else event('resume',{moves:saves[id].moves});recent=[id,...recent.filter(x=>x!==id)].slice(0,8);persist();render(true);if(route)history.pushState({game:id},'',`#${id}`);window.scrollTo?.({top:0,behavior:'instant'});}
function brand(){return `<a class="brand" href="#" aria-label="Pocket Puzzle Club home"><img src="./favicon.svg" alt="" width="38" height="38"><span>Pocket Puzzle <em>Club</em></span></a>`;}
const colors=['sage','sand','blue','rose','mint','gold','lavender','peach'];
function preview(g){const state=validSave(saves[g.id],g.id)?saves[g.id].state:g.create();return `<div class="preview-inner" aria-hidden="true" inert>${g.view(state).replaceAll('<button','<span').replaceAll('</button>','</span>').replace(/data-action="[^"]*"/g,'').replace(/data-value="[^"]*"/g,'')}</div>`;}
function home(){return `<header class="site-header">${brand()}<span class="header-note">A little time, well spent.</span><span class="private-pill ${qaMode?'qa-session':''}">${qaMode?'QA test session':'Preview'}</span></header><main class="home"><div class="home-heading"><div><p class="eyebrow">MAKE YOURSELF AT HOME</p><h1>What feels good today?</h1><p class="intro">Old favourites. New little challenges. Your pace.</p></div><div class="edition"><span>08</span><small>games to<br>make time for</small></div></div>${recent.length?`<section class="continue-strip"><span class="continue-dot"></span><div><small>PICK UP WHERE YOU LEFT OFF</small><strong>${byId[recent[0]].title}</strong></div>${button(saves[recent[0]]?.finished?'View round ↗':'Continue playing →','open',recent[0],'primary')}</section>`:''}<section class="game-catalog" aria-label="Choose a puzzle">${games.map((g,i)=>`<button class="game-card" data-action="open" data-value="${g.id}"><div class="game-preview ${colors[i]}">${preview(g)}<span class="play-badge">Play ↗</span></div><div class="game-card-copy"><div><h2>${g.title}</h2><p>${g.tag}</p></div><span class="card-arrow">↗</span></div></button>`).join('')}</section><footer><span>Made for a quiet moment.</span><span>No accounts. No ads. Progress stays on this device.</span></footer>${!storageOK?'<p class="storage-warning">Browser storage is unavailable. Progress may be lost when this tab closes.</p>':''}</main>`;}
function play(){const g=byId[current],r=saves[current],won=g.won(r.state),ended=g.ended?.(r.state);return `<header class="site-header">${brand()}${button('← All games','home','','back-home')}<span class="private-pill ${qaMode?'qa-session':''}">${qaMode?'QA test session':'Preview'}</span></header><main class="play-layout"><aside class="game-sidebar"><p class="eyebrow">YOUR LITTLE BREAK</p><h1>${g.title}</h1><p class="game-subtitle">${g.subtitle}</p><details class="rules" ${(rulesState[current]??matchMedia('(min-width:801px)').matches)?'open':''}><summary>How to play</summary><p>${g.rules}</p></details><p class="local-note"><span>◉</span> ${storageOK&&!recoveryBlocked?'Saved on this device':'Not saved · keep this tab open'}<br><small>Sound off · No timer pressure</small></p></aside><section class="play-surface ${current}" aria-label="${g.title} game"><div class="game-toolbar"><div class="run-stats"><span><b>${r.moves}</b> moves</span><span id="timer">${duration(r.activeMs)}</span></div><div class="toolbar-buttons">${button(paused?'Resume':'Pause','pause','','quiet')}${button('New game','new','','quiet')}</div></div><div class="board-wrap ${won?'is-won':''}">${paused?`<div class="pause-screen"><span>Ⅱ</span><h2>Take your time</h2><p>Your puzzle will be right here.</p>${button('Keep playing','pause','','primary')}</div>`:g.view(current==='blocks'?{...r.state,best:Number(bestScores.blocks)||0}:r.state)}</div><div class="game-feedback" role="status" aria-live="polite">${won?'<strong>Beautifully done. Puzzle complete!</strong>':r.state.message||'A little focus. One move at a time.'}</div><div class="game-controls">${button('↶ Undo','undo','','',r.history.length&&!paused?'':'disabled')}${button('✦ Hint','hint','','',paused||won?'disabled':'')}${button('↻ Restart','restart','','',paused?'disabled':'')}</div>${won?`<div class="win-note">${r.moves} moves · ${r.hints} hints · ${duration(r.activeMs)} active play ${button('Another puzzle →','new','','primary')}</div>`:''}${ended?`<div class="win-note"><strong>Round complete · ${r.state.score} points</strong><p>No remaining blocks fit. Undo to try another move, or start fresh.</p>${button('Play again →','new','','primary')}</div>`:''}</section><nav class="game-switcher" aria-label="Other games">${games.map(x=>button(x.title,'open',x.id,x.id===current?'active':'')).join('')}</nav></main>${!storageOK?'<p class="storage-warning">Saving is unavailable in this browser. Keep this tab open to retain your puzzle.</p>':''}`;}
function render(routeChange=false){const focused=routeChange?null:document.activeElement?.dataset;app.innerHTML=(current?play():home()).replace('</header>','</header>'+(notice?`<p class="storage-warning" role="status">${notice}</p>`:''))+(confirmAction?`<div class="modal-backdrop"><section role="dialog" aria-modal="true" aria-labelledby="dialog-title" class="confirm-dialog"><h2 id="dialog-title">${confirmAction==='new'?'A fresh start?':'Try this puzzle again?'}</h2><p>${confirmAction==='new'?'Your current round will be replaced with a new puzzle.':'The original board will return and your moves will reset.'}</p><div>${button('Keep playing','cancel','','quiet')}${button(confirmAction==='new'?'New game':'Restart','confirm','','primary')}</div></section></div>`:'');if(confirmAction)app.querySelector('[data-action="cancel"]').focus();else if(focused?.action){const el=[...app.querySelectorAll('[data-action]')].find(e=>e.dataset.action===focused.action&&e.dataset.value===focused.value);el?.focus({preventScroll:true});}}
function handle(action,value){if(syncSaves()&&!['open','home'].includes(action)){persist();render(true);return;}if(confirmAction&&action!=='confirm'&&action!=='cancel')return;if(action==='cancel'){confirmAction=null;lastTick=performance.now();render();return;}if(action==='home'){flushTime();if(current)event('active_foreground_duration',{active_ms:Math.round(saves[current].activeMs)});current=null;paused=false;persist();render(true);if(value!=='history')history.pushState({},'','#');window.scrollTo?.({top:0,behavior:'instant'});return;}if(action==='open'&&byId[value]){openGame(value);return;}if(!current)return;const g=byId[current],r=saves[current];if(action==='new'||action==='restart'){flushTime();confirmAction=action;render();return;}if(action==='confirm'){if(!r.finished&&!r.outcomeRecorded)event('run_outcome',{outcome:'abandoned',reason:confirmAction,moves:r.moves});saves[current]=confirmAction==='new'?fresh(g):{...fresh(g),state:clone(r.initial),initial:clone(r.initial)};confirmAction=null;paused=false;lastTick=performance.now();persist();render(true);return;}if(action==='pause'){flushTime();paused=!paused;if(!paused)lastTick=performance.now();render();return;}if(paused)return;if(action==='undo'){if(r.history.length){flushTime();let old=r.history.pop();r.state=old.state;r.moves=old.moves;r.finished=false;event('undo');persist();render();}return;}if(g.won(r.state))return;flushTime();let before={state:clone(r.state),moves:r.moves},changed=g.action(r.state,action,value);if(action==='hint'){r.hints++;event('hint');}if(changed){if(current==='blocks'){bestScores.blocks=Math.max(Number(bestScores.blocks)||0,r.state.score);}r.history.push(before);if(r.history.length>120)r.history.shift();if(action!=='hint'){r.moves++;if(!r.first){r.first=true;event('first_valid_move');}}if(g.won(r.state)||g.ended?.(r.state)){r.finished=true;if(!r.outcomeRecorded){r.outcomeRecorded=true;event('run_outcome',{outcome:g.won(r.state)?'won':'no_moves',moves:r.moves,hints:r.hints,active_ms:Math.round(r.activeMs)});}}}persist();render();}
app.addEventListener('toggle',e=>{if(current&&e.target.matches?.('.rules'))rulesState[current]=e.target.open;},true);
app.addEventListener('click',e=>{const target=e.target.closest('[data-action]');if(target&&!target.disabled){try{handle(target.dataset.action,target.dataset.value);}catch(err){event('error',{category:'interaction'});const status=app.querySelector('.game-feedback');if(status)status.textContent='That move could not be completed. Restart this puzzle if it keeps happening.';console.error(err);}}if(e.target.closest('.brand')){e.preventDefault();handle('home');}});
document.addEventListener('keydown',e=>{if(confirmAction&&e.key==='Tab'){const choices=[...app.querySelectorAll('.confirm-dialog button')],ix=choices.indexOf(document.activeElement);e.preventDefault();choices[(ix+(e.shiftKey?-1:1)+choices.length)%choices.length]?.focus();return;}if(e.key==='Escape'){if(confirmAction){handle('cancel');}else if(current)handle('pause');}if(current==='sliding'&&!paused&&!confirmAction&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();const z=saves[current].state.cells.indexOf(0),d={ArrowUp:-4,ArrowDown:4,ArrowLeft:-1,ArrowRight:1}[e.key],i=z+d;if(i>=0&&i<16)handle('tile',i);}
if(current==='sudoku'&&!paused&&!confirmAction&&['Backspace','Delete'].includes(e.key)){e.preventDefault();handle('number',0);}
if(current==='sudoku'&&!paused&&!confirmAction&&/^[0-9]$/.test(e.key)){e.preventDefault();handle('number',e.key);}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){flushTime();if(current)event('active_foreground_duration',{active_ms:Math.round(saves[current].activeMs)});persist();}lastTick=performance.now();});
window.addEventListener('popstate',()=>{const id=location.hash.slice(1);if(confirmAction)lastTick=performance.now();confirmAction=null;if(byId[id])openGame(id,false);else handle('home','history');});
window.addEventListener('storage',e=>{if(e.key===KEY||e.key===null){if(syncSaves())render(true);else if(!current)render(true);}});
window.addEventListener('pagehide',()=>{flushTime();persist();});window.addEventListener('error',()=>event('error',{category:'runtime'}));
setInterval(()=>{if(syncSaves())render(true);flushTime();const timer=document.querySelector('#timer');if(timer&&current)timer.textContent=duration(saves[current].activeMs);persist();},1000);
const entryParams=new URLSearchParams(location.search),sourceApp=['dot','email','search','social'].includes(entryParams.get('source'))?entryParams.get('source'):(document.referrer?'referral':'direct');event('page_entry',{source_category:sourceApp,campaign:entryParams.get('campaign')==='private-preview'?'private-preview':null});if(byId[location.hash?.slice(1)])openGame(location.hash.slice(1),false);else render();
