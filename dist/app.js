import { commitDrag, installDragControls } from './drag.js?v=1.6.1';
import {games as classics} from './games/classics.js?v=1.6.1';
import {games as modern} from './games/modern.js?v=1.6.1';
import {games as logic} from './games/logic.js?v=1.6.1';
import {clone,button} from './games/core.js?v=1.6.1';
const games=[...classics,...modern,...logic],byId=Object.fromEntries(games.map(g=>[g.id,g]));
const app=document.querySelector('#app'),VERSION='1.6.1',qaMode=new URLSearchParams(location.search).get('qa')==='1',KEY=qaMode?'pocket-puzzle-qa-v1':'pocket-puzzle-v1',EVENT_KEY=qaMode?'pocket-qa-local-events':'pocket-local-events';
let storageOK=true,saves={},recent=[],bestScores={},current=null,paused=false,confirmAction=null,notice='',rulesState={},lastTick=performance.now();
let dragControls=null,helpOpen=false,settingsOpen=false,editingFavorites=false;
let lobbyView=location.hash==='#favorites'?'favorites':'all',lobbyFilter='all',lobbyScroll=0,favoriteWarning='';
const FAVORITES_KEY=KEY+'-favorites';
function loadFavorites(fallback=[]){try{const value=JSON.parse(localStorage.getItem(FAVORITES_KEY)||'[]');return Array.isArray(value)?[...new Set(value.filter(id=>Object.hasOwn(byId,id)))]:[];}catch{return fallback;}}
let favorites=loadFavorites();
// Installation is browser-controlled. Never persist a guessed installed state.
let deferredInstallPrompt=null,installBusy=false,installGuideOpen=false,installStatus='',installedSession=false;
const standaloneMedia=window.matchMedia?.('(display-mode: standalone)');
function isInstalled(){return installedSession||navigator.standalone===true||!!standaloneMedia?.matches;}
function installPlatform(){
  const ua=navigator.userAgent||'';
  if(/iPad|iPhone|iPod/i.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1))return 'ios';
  if(/Android/i.test(ua))return 'android';
  if(/Mac/i.test(navigator.platform||ua)&&/Safari/i.test(ua)&&!/Chrome|Chromium|Edg|OPR/i.test(ua))return 'safari';
  return 'desktop';
}
function installLabel(){return ['ios','android'].includes(installPlatform())?'Add to home screen':'Install Pocket Puzzle';}
function refreshInstallUI(){if(settingsOpen)render();}
window.addEventListener('beforeinstallprompt',e=>{
  e.preventDefault();
  if(qaMode||isInstalled()||installBusy)return;
  deferredInstallPrompt=e;installStatus='';refreshInstallUI();
});
window.addEventListener('appinstalled',()=>{installedSession=true;deferredInstallPrompt=null;installBusy=false;installStatus='installed';refreshInstallUI();});
standaloneMedia?.addEventListener?.('change',()=>{if(isInstalled())deferredInstallPrompt=null;refreshInstallUI();});
async function requestInstall(){
  if(!settingsOpen||installBusy||isInstalled())return;
  installGuideOpen=true;installStatus='';
  const prompt=deferredInstallPrompt;
  if(!prompt||qaMode){render();app.querySelector('.dialog-close')?.focus();return;}
  deferredInstallPrompt=null;installBusy=true;render();
  try{
    // This call must remain synchronous with the player's click, before any await.
    const result=await prompt.prompt();
    const choice=await (prompt.userChoice||result);
    if(!isInstalled())installStatus=choice?.outcome==='accepted'?'accepted':'dismissed';
  }catch{if(!isInstalled())installStatus='unavailable';}
  finally{installBusy=false;if(settingsOpen&&installGuideOpen)render();}
}
function installGuide(){
  let content;
  if(isInstalled())content='<p>Pocket Puzzle is ready to open from its icon on your home screen, dock or app launcher.</p>';
  else if(installBusy)content='<p role="status">Follow the confirmation in your browser to continue.</p>';
  else if(installStatus==='accepted')content='<p role="status">Your browser accepted the request. Look for Pocket Puzzle on your home screen or in your apps once setup finishes.</p>';
  else{
    const platform=installPlatform();
    const steps=platform==='ios'?['Open your browser’s Share menu.','Choose Add to Home Screen. If it is missing, open this page in Safari.','If you see Open as Web App, keep it on, then tap Add.']:platform==='android'?['Open your browser’s menu (⋮).','Look for Install app or Add to Home screen. Some versions call it Install and create shortcut.','Confirm in your browser. If the option is missing, try opening this page in Chrome.']:platform==='safari'?['On macOS Sonoma 14 or later, choose File → Add to Dock in Safari.','Check the name, then click Add. On older versions, you can bookmark this page.']:['Use the install icon in your browser’s address bar, if shown.','In Chrome, you can also open the menu → Cast, save, and share → Install page as app. In Edge, look for Install in the address bar or Apps menu.','If no install option is available, bookmark this page or try Chrome or Edge.'];
    content=(installStatus==='dismissed'?'<p role="status">The browser prompt was dismissed. You can use the browser menu to try again later.</p>':installStatus==='unavailable'?'<p role="status">The browser could not open its install prompt. You can use the steps below instead.</p>':'<p>Keep the club a tap away with an icon on your device.</p>')+(deferredInstallPrompt&&!qaMode?button(installLabel(),'install','','menu-primary'):`<ol class="install-steps">${steps.map(step=>`<li>${step}</li>`).join('')}</ol>`);
  }
  return `<div class="dialog-heading"><h2 id="settings-title">${isInstalled()?'Pocket Puzzle':installLabel()}</h2>${button('×','settings','','dialog-close','aria-label="Close install instructions"')}</div><div class="install-guide">${content}${qaMode?'<p class="settings-note">QA preview: the site’s install prompt is disabled here.</p>':''}<p class="settings-note">Internet access is needed to play. Progress stays local; some devices keep app and browser saves separate.</p></div>${button('Back to settings','install-back','','menu-primary')}`;
}
let soundOn=false,audioContext=null;
try{soundOn=localStorage.getItem(KEY+'-sound')==='on';}catch{}
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
  if(currentChanged){paused=false;confirmAction=null;helpOpen=false;settingsOpen=false;lastTick=performance.now();notice='This round changed in another tab. The latest saved progress is now shown.';}
  return currentChanged;
}

let events=read(EVENT_KEY,[]);if(!Array.isArray(events))events=[];
function event(type,extra={}){if(testMode)return;events.push({version:VERSION,event:type,session_id:sessionId,game_id:current,run_id:current?saves[current]?.runId:null,at:new Date().toISOString(),...extra});events=events.slice(-500);try{localStorage.setItem(EVENT_KEY,JSON.stringify(events));}catch{}}
function persist(){const wasStorageOK=storageOK,changed=syncSaves();if(!recoveryBlocked){try{const data={schema:1,version:VERSION,saves,recent,bestScores},raw=JSON.stringify(data);if(raw!==diskRaw){localStorage.setItem(KEY,raw);storageOK=true;}rememberDisk(raw,data);}catch{storageOK=false;}}if(changed||wasStorageOK!==storageOK)render(true);}
function flushTime(){const now=performance.now();if(current&&!paused&&!confirmAction&&!helpOpen&&!settingsOpen&&!document.hidden&&(!document.hasFocus||document.hasFocus())){let s=saves[current];if(s&&!s.finished)s.activeMs+=Math.min(now-lastTick,15000);}lastTick=now;}
function duration(ms){let n=Math.floor(ms/1000);return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`;}
function fresh(g){const state=g.create();return {runId:crypto.randomUUID(),state,initial:clone(state),history:[],moves:0,activeMs:0,first:false,finished:false,hints:0,outcomeRecorded:false};}
function openGame(id,route=true){if(!Object.hasOwn(byId,id))return;if(!current)lobbyScroll=window.scrollY||0;flushTime();if(current&&current!==id)event('game_switch',{to_game:id,active_ms:Math.round(saves[current]?.activeMs||0)});current=id;paused=false;helpOpen=false;settingsOpen=false;editingFavorites=false;if(!validSave(saves[id],id))saves[id]=fresh(byId[id]);else event('resume',{moves:saves[id].moves});recent=[id,...recent.filter(x=>x!==id)].slice(0,8);persist();render(true,true);if(route)history.pushState({game:id},'',`#${id}`);window.scrollTo?.({top:0,behavior:'instant'});}
const shortTitles={mahjong:'Mahjong'};
const heart=(filled=false)=>`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 4.8a5.4 5.4 0 0 0-7.6 0l-.9.9-.9-.9a5.4 5.4 0 0 0-7.6 7.6L12 21l8.5-8.6a5.4 5.4 0 0 0 0-7.6Z" fill="${filled?'currentColor':'none'}" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
const menuIcon=(name)=>({settings:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 3-1 3-3 1-2 5 2 5 3 1 1 3h6l1-3 3-1 2-5-2-5-3-1-1-3Z"/><circle cx="12" cy="12" r="3.5"/></svg>',games:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg>',back:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 5-7 7 7 7"/></svg>',play:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 10 7-10 7Z"/></svg>'}[name]);
function brand(){return `<a class="brand" href="#" aria-label="Pocket Puzzle Club home"><img src="./favicon.svg" alt="" width="40" height="40"><span>Pocket Puzzle <em>Club</em></span></a>`;}
function favoriteButton(id,full=false){const active=favorites.includes(id);return button(`${heart(active)}${full?`<span>${active?'Favourited':'Favourite'}</span>`:''}`,'favorite',id,`favorite-button ${active?'is-favorite':''} ${full?'favorite-full':''}`,`aria-label="${active?'Remove':'Add'} ${byId[id].title} ${active?'from':'to'} favourites" aria-pressed="${active}"`);}
function cover(id,extra=''){return `<img class="cover-art ${extra}" src="./art/${id}.svg" alt="" width="720" height="480" decoding="async">`;}
function settingsButton(){return button(menuIcon('settings'),'settings','','scene-icon','aria-label="Settings" aria-haspopup="dialog"');}
function gameTile(g){const r=saves[g.id],saved=validSave(r,g.id)&&!r.finished,active=favorites.includes(g.id);return `<article class="game-tile" data-game="${g.id}"><button class="game-card" data-action="${editingFavorites?'favorite':'open'}" data-value="${g.id}" aria-label="${editingFavorites?`${active?'Remove':'Add'} ${g.title} ${active?'from':'to'} favourites`:`${saved?'Continue':'Play'} ${g.title}`}" ${editingFavorites?`aria-pressed="${active}"`:''}>${cover(g.id)}<span class="menu-game-name">${shortTitles[g.id]||g.title}</span>${editingFavorites?`<span class="menu-favorite ${active?'chosen':''}">${heart(active)}</span>`:''}</button></article>`;}
function home(){
  const resume=recent.find(id=>validSave(saves[id],id)&&!saves[id].finished),shown=games.filter(g=>editingFavorites||lobbyView!=='favorites'||favorites.includes(g.id));
  return `<div class="menu-scene"><header class="menu-header"><div class="menu-header-slot">${lobbyView==='favorites'?button(editingFavorites?'Done':'Edit','edit-favorites','','menu-edit',`aria-pressed="${editingFavorites}"`):''}</div><h1 id="menu-title" tabindex="-1"><span>Pocket Puzzle</span><em>${editingFavorites?'Pick favourites':lobbyView==='favorites'?'Favourites':'Club'}</em></h1><div class="menu-header-slot">${settingsButton()}</div></header><main class="menu-field" aria-label="${editingFavorites?'Choose your favourite games':lobbyView==='favorites'?'Favourite games':'Choose a game'}"><div class="game-catalog">${shown.map(gameTile).join('')}</div>${!shown.length?`<div class="menu-empty">${heart()}<h2>Your favourites</h2><p>Keep your favourite games here.</p>${button('Choose games','edit-favorites','','menu-primary')}</div>`:''}</main><div class="menu-bottom">${resume&&!editingFavorites?`<button class="menu-resume" data-action="open" data-value="${resume}" aria-label="Continue ${byId[resume].title}">${menuIcon('play')}<span>Continue <strong>${shortTitles[resume]||byId[resume].title}</strong></span></button>`:''}<nav class="menu-dock" aria-label="Main navigation">${button(`${menuIcon('games')}<span>Games</span>`,'lobby','all',lobbyView==='all'?'active':'',`aria-current="${lobbyView==='all'?'page':'false'}"`)}${button(`${heart(lobbyView==='favorites')}<span>Favourites</span>`,'lobby','favorites',lobbyView==='favorites'?'active':'',`aria-current="${lobbyView==='favorites'?'page':'false'}"`)}</nav></div>${qaMode?'<span class="scene-qa">QA</span>':''}</div>`;
}
function helpDialog(){
  if(!helpOpen||!current)return '';
  const g=byId[current];
  return `<div class="modal-backdrop scene-backdrop"><section class="confirm-dialog scene-dialog table-help-dialog" role="dialog" aria-modal="true" aria-labelledby="help-title"><div class="dialog-heading"><h2 id="help-title">${g.title}</h2>${button('×','help','','dialog-close','aria-label="Close how to play"')}</div><h3>How to play</h3><p>${g.rules}</p>${current==='solitaire'?`<p>Drag a card or sequence, or select it and tap a destination. Tab between cards, then use Enter or Space.</p><p>Hints suggest legal moves, not a guaranteed solution. Random deals may be unwinnable.</p><div class="table-preferences">${button(saves.solitaire.state.large?'Standard cards':'Larger cards','zoom','','',`aria-pressed="${!!saves.solitaire.state.large}"`)}${button(soundOn?'Sound on':'Sound off','sound','','',`aria-pressed="${soundOn}"`)}</div><p>Larger cards lets you scroll the table sideways.</p>`:''}${button('Keep playing','help','','menu-primary')}</section></div>`;
}
function settingsDialog(){
  if(!settingsOpen)return '';
  if(installGuideOpen)return `<div class="modal-backdrop scene-backdrop"><section class="confirm-dialog scene-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title">${installGuide()}</section></div>`;
  return `<div class="modal-backdrop scene-backdrop"><section class="confirm-dialog scene-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title"><div class="dialog-heading"><h2 id="settings-title">${current?byId[current].title:'Settings'}</h2>${button('×','settings','','dialog-close','aria-label="Close settings"')}</div><div class="settings-list">${current?`${button('How to play','help','','setting-row')}${favoriteButton(current,true)}${button(paused?'Resume game':'Pause game','pause','','setting-row')}${button(current==='solitaire'?'New deal':'New game','new','','setting-row')}`:''}${button(`<span>Solitaire sound</span><strong>${soundOn?'On':'Off'}</strong>`,'sound','','setting-row',`aria-pressed="${soundOn}"`)}${!isInstalled()?button(installLabel(),'install','','setting-row','aria-haspopup="dialog"'):''}</div><p class="settings-note">${storageOK&&!recoveryBlocked?'Progress is saved on this device.':'Saving is unavailable. Keep this tab open to retain progress.'}</p>${favoriteWarning?`<p class="settings-note" role="status">${favoriteWarning}</p>`:''}${current?button('All games','lobby','all','menu-primary'):button('Back to games','settings','','menu-primary')}</section></div>`;
}
function play(){
  if(current==='solitaire')return solitaireRoom();
  const g=byId[current],r=saves[current],won=g.won(r.state),ended=g.ended?.(r.state);
  return `<div class="club-room"><header class="room-header">${button(menuIcon('back'),'home','','scene-icon room-back',`aria-label="Back to ${lobbyView==='favorites'?'Favourites':'All games'}"`)}<h1>${g.title}</h1>${settingsButton()}</header><main class="play-layout"><section class="play-surface ${current}" aria-label="${g.title} game"><div class="game-toolbar"><div class="run-stats"><span><b>${r.moves}</b> ${r.moves===1?'move':'moves'}</span><span id="timer">${duration(r.activeMs)}</span></div>${button('?','help','','room-help','aria-label="How to play" aria-haspopup="dialog"')}</div><div class="board-wrap ${won?'is-won':''}">${paused?`<div class="pause-screen"><span>Ⅱ</span><h2>Paused</h2>${button('Keep playing','pause','','menu-primary')}</div>`:g.view(current==='blocks'?{...r.state,best:Number(bestScores.blocks)||0}:r.state)}</div><div class="game-feedback" role="status" aria-live="polite">${won?'<strong>Puzzle complete!</strong>':r.state.message||''}</div><div class="game-controls">${button('↶ Undo','undo','','',r.history.length&&!paused?'':'disabled')}${button('✦ Hint','hint','','',paused||won||ended?'disabled':'')}${button('↻ Restart','restart','','',paused?'disabled':'')}</div>${won?`<div class="win-note">${r.moves} moves · ${duration(r.activeMs)} ${button('Play again','new','','menu-primary')}</div>`:''}${ended?`<div class="win-note block-result"><strong>Round complete · ${r.state.score} points</strong><p>No remaining blocks fit. Undo to try a different choice.</p>${button('Play again','new','','menu-primary')}${button('Replay this board','restart','','result-replay')}</div>`:''}</section></main>${qaMode?'<span class="scene-qa">QA</span>':''}${!storageOK?'<p class="storage-warning">Saving is unavailable. Keep this tab open.</p>':''}</div>`;
}
// Solitaire retains its low-chrome felt table within the shared clubhouse navigation.
function solitaireRoom(){
  const g=byId.solitaire,r=saves.solitaire,won=g.won(r.state),foundationCount=r.state.foundation.reduce((n,p)=>n+p.length,0);
  return `<div class="solitaire-room"><header class="table-header"><div class="table-identity">${button(`← <span>${lobbyView==='favorites'?'Favourites':'All games'}</span>`,'home','','table-back',`aria-label="Back to ${lobbyView==='favorites'?'Favourites':'All games'}"`)}<div><h1>Solitaire</h1><p>Pocket Puzzle Club</p></div></div><div class="table-stats" aria-label="Round statistics"><span><b>${r.moves}</b><small>Moves</small></span><span><b id="timer">${duration(r.activeMs)}</b><small>Time</small></span><span class="foundation-stat"><b>${foundationCount}<i>/52</i></b><small>Collected</small></span></div><nav class="table-top-actions" aria-label="Game options">${settingsButton()}</nav></header>${qaMode?'<span class="scene-qa">QA</span>':''}<main class="play-surface solitaire" aria-label="Solitaire game"><div class="table-watermark" aria-hidden="true"><span>♠</span><small>POCKET PUZZLE CLUB</small></div><div class="board-wrap ${won?'is-won':''}">${paused?`<section class="table-pause-screen"><span aria-hidden="true">Ⅱ</span><p class="table-kicker">A MOMENT TO YOURSELF</p><h2>Your table is waiting</h2><p>The clock is paused. Come back when you’re ready.</p>${button('Keep playing','pause','','table-new')}</section>`:g.view(r.state)}${won&&!paused?`<section class="table-result" aria-labelledby="win-title"><div class="win-suits" aria-hidden="true">♠ ♥ ♣ ♦</div><p class="table-kicker">DEAL COMPLETE</p><h2 id="win-title">Beautifully played.</h2><p>All 52 cards, right where they belong.</p><div class="result-stats"><span><b>${r.moves}</b> ${r.moves===1?'move':'moves'}</span><span><b>${duration(r.activeMs)}</b> active play</span><span><b>${r.hints}</b> ${r.hints===1?'hint':'hints'}</span></div>${button('Play another deal','new','','table-new')}${button('Replay this deal','restart','','result-replay')}</section>`:''}</div></main><footer class="table-footer"><div class="game-feedback" role="status" aria-live="polite">${won?'Deal complete. Enjoy the moment.':paused?'Your progress is saved while you take a break.':r.state.message||(r.moves?'One move at a time.':'Drag cards to move them. Tap the deck to draw.')}</div><div class="table-action-row"><p class="table-save"><span aria-hidden="true">●</span> ${storageOK&&!recoveryBlocked?'Saved on this device':'Not saved · keep this tab open'}</p><div class="game-controls">${button('<span aria-hidden="true">↶</span> Undo','undo','','',r.history.length&&!paused?'':'disabled')}${button('<span aria-hidden="true">✧</span> Hint','hint','','',paused||won?'disabled':'')}${button('<span aria-hidden="true">♤</span> To foundation','auto','','',r.state.selected&&!paused&&!won?'':'disabled')}${button('<span aria-hidden="true">↻</span> Restart','restart','','',paused?'disabled':'')}</div><p class="table-mode">KLONDIKE · DRAW ONE</p></div></footer></div>`;
}
function cardPositions(){
  if(current!=='solitaire'||!app.querySelectorAll)return new Map();
  const positions=new Map([...app.querySelectorAll('.solitaire [data-card-id]')].filter(el=>el.getBoundingClientRect).map(el=>[el.dataset.cardId,{box:el.getBoundingClientRect(),face:el.dataset.face}]));
  for(const [id,position] of dragControls?.takeDropPositions?.()||[])positions.set(id,position);
  return positions;
}
function animateTable(previous,deal=false){
  if(current!=='solitaire'||paused||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const cards=[...app.querySelectorAll('.solitaire [data-card-id]')];
  if(!cards[0]?.animate)return;
  const stock=app.querySelector('.stock-pile')?.getBoundingClientRect();
  cards.forEach((el,i)=>{
    const old=previous.get(el.dataset.cardId),now=el.getBoundingClientRect();
    if(old){
      const dx=old.box.left-now.left,dy=old.box.top-now.top;
      if(Math.abs(dx)+Math.abs(dy)>2)el.animate([{transform:`translate(${dx}px,${dy}px) rotate(-1.5deg)`,filter:'brightness(1.06)'},{transform:'translate(0,0) rotate(0deg)',filter:'brightness(1)'}],{duration:260,easing:'cubic-bezier(.2,.8,.25,1)'});
      else if(old.face!==el.dataset.face)el.animate([{transform:'scaleX(.12)',filter:'brightness(.7)'},{transform:'scaleX(1)',filter:'brightness(1)'}],{duration:220,easing:'ease-out'});
    }else if(deal&&stock&&el.closest('.tableau')){
      el.animate([{transform:`translate(${stock.left-now.left}px,${stock.top-now.top}px) rotate(-8deg)`,opacity:0},{transform:'translate(0,0) rotate(0)',opacity:1}],{duration:380,delay:Math.min(i*18,430),fill:'backwards',easing:'cubic-bezier(.2,.75,.2,1)'});
    }
  });
}
// Purely visual: state, history and score already committed before these start.
// Rerendering replaces the animated cells, so Undo/navigation cannot finish an old move.
function animateBlocks(plan){
  if(!plan||current!=='blocks'||paused||helpOpen||settingsOpen||confirmAction||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const cells=[...app.querySelectorAll('.block-board [data-action="preview"]')];
  if(cells.length!==64||!cells[0]?.animate)return;
  for(const i of plan.placed)if(!plan.cleared.includes(i))cells[i].animate([{transform:'scale(.76)',filter:'brightness(1.3)'},{transform:'scale(1)',filter:'brightness(1)'}],{duration:190,easing:'ease-out'});
  for(const i of plan.cleared)cells[i].animate([{background:'#d3b46d',boxShadow:'inset 0 0 0 2px #fff0ba',transform:'scale(1)'},{background:'#e7d197',offset:.35,transform:'scale(.92)'},{background:'#faf7ed',boxShadow:'none',transform:'scale(1)'}],{duration:340,easing:'ease-out'});
  app.querySelector('.score-current')?.animate?.([{transform:'scale(1.18)',color:'#a07824'},{transform:'scale(1)',color:'#2d4738'}],{duration:280,easing:'ease-out'});
}
// Small synthesized card/foundation sounds: no downloads, music or autoplay.
function tableSound(kind='move'){
  if(!soundOn||current!=='solitaire')return;
  try{
    const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
    audioContext??=new Audio();audioContext.resume?.()?.catch?.(()=>{});const now=audioContext.currentTime;
    const notes=kind==='win'?[392,494,587,784]:kind==='foundation'?[440,660]:kind==='undo'?[260]:kind==='deal'?[330,392]:[340];
    notes.forEach((frequency,i)=>{const tone=audioContext.createOscillator(),gain=audioContext.createGain(),at=now+i*.085;tone.type='sine';tone.frequency.setValueAtTime(frequency,at);tone.frequency.exponentialRampToValueAtTime(frequency*.85,at+.09);gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(.035,at+.008);gain.gain.exponentialRampToValueAtTime(.0001,at+.14);tone.connect(gain);gain.connect(audioContext.destination);tone.start(at);tone.stop(at+.15);});
  }catch{/* Audio support cannot affect the round. */}
}
function render(routeChange=false,sceneMotion=false){
  const positions=cardPositions();dragControls?.cancel();const focused=routeChange?null:document.activeElement?.dataset;
  const scene=(current?play():home()).replace('</header>','</header>'+(notice||favoriteWarning||!storageOK?`<p class="storage-warning" role="status">${[notice,favoriteWarning,!storageOK?'Browser storage is unavailable. Keep this tab open to retain progress.':''].filter(Boolean).join(' ')}</p>`:''));
  app.innerHTML=`<div class="app-scene ${sceneMotion?'scene-enter':''}" ${confirmAction||helpOpen||settingsOpen?'inert':''}>${scene}</div>`+helpDialog()+settingsDialog()+(confirmAction?`<div class="modal-backdrop"><section role="dialog" aria-modal="true" aria-labelledby="dialog-title" class="confirm-dialog"><h2 id="dialog-title">${current==='solitaire'?(confirmAction==='new'?'Deal a fresh hand?':'Replay this deal?'):(confirmAction==='new'?'A fresh start?':'Try this puzzle again?')}</h2><p>${current==='solitaire'?(confirmAction==='new'?'Your current deal will be replaced. Your other games stay saved.':'The same cards return to their starting places. Moves and time reset.'):(confirmAction==='new'?'Your current round will be replaced with a new puzzle.':'The original board will return and your moves will reset.')}</p><div>${button('Keep playing','cancel','','quiet')}${button(confirmAction==='new'?'New game':'Restart','confirm','','primary')}</div></section></div>`:'');
  animateTable(positions,routeChange&&current==='solitaire'&&saves.solitaire.moves===0);
  if(confirmAction)app.querySelector('[data-action="cancel"]')?.focus();
  else if(focused?.action){const selector=helpOpen||settingsOpen?'.scene-dialog [data-action]':'[data-action]',el=[...app.querySelectorAll(selector)].find(e=>e.dataset.action===focused.action&&e.dataset.value===focused.value);if(el)el.focus({preventScroll:true});else if(helpOpen||settingsOpen)app.querySelector('.dialog-close')?.focus();else if(!current)app.querySelector('#menu-title')?.focus({preventScroll:true});else app.querySelector('[data-action="settings"]')?.focus({preventScroll:true});}
}
function handle(action,value){if(syncSaves()&&!['open','home'].includes(action)){persist();render(true);return;}if(confirmAction&&action!=='confirm'&&action!=='cancel')return;if(helpOpen&&!['help','sound','zoom','home','open','lobby'].includes(action))return;if(settingsOpen&&!['settings','help','sound','favorite','new','pause','home','lobby','install','install-back'].includes(action))return;if(action==='install'){requestInstall();return;}if(action==='install-back'&&settingsOpen){installGuideOpen=false;installStatus='';render();app.querySelector('[data-action="install"]')?.focus();return;}if(action==='edit-favorites'&&!current){editingFavorites=!editingFavorites;render();return;}if(action==='settings'){flushTime();settingsOpen=!settingsOpen;installGuideOpen=false;installStatus='';helpOpen=false;lastTick=performance.now();render();app.querySelector(settingsOpen?'.dialog-close':'[data-action="settings"]')?.focus();return;}if(action==='help'&&current){flushTime();helpOpen=!helpOpen;settingsOpen=false;lastTick=performance.now();render();app.querySelector(helpOpen?'.dialog-close':`[data-action="${current==='solitaire'?'settings':'help'}"]`)?.focus();return;}if(action==='sound'){soundOn=!soundOn;try{localStorage.setItem(KEY+'-sound',soundOn?'on':'off');}catch{}tableSound();render();return;}if(action==='cancel'){confirmAction=null;lastTick=performance.now();render();app.querySelector('[data-action="settings"]')?.focus();return;}if(action==='favorite'&&Object.hasOwn(byId,value)){const latest=loadFavorites(favorites),next=latest.includes(value)?latest.filter(id=>id!==value):[...latest,value];try{localStorage.setItem(FAVORITES_KEY,JSON.stringify(next));favorites=next;favoriteWarning='';}catch{favoriteWarning='Favourites cannot be saved in this browser right now.';}render();return;}if(action==='lobby'&&['all','favorites'].includes(value)){lobbyView=value;lobbyFilter='all';lobbyScroll=0;editingFavorites=false;handle('home','nav');return;}if(action==='home'){flushTime();if(current)event('active_foreground_duration',{active_ms:Math.round(saves[current].activeMs)});current=null;paused=false;helpOpen=false;settingsOpen=false;editingFavorites=false;persist();render(true,true);if(value!=='history')history.pushState({},'',lobbyView==='favorites'?'#favorites':'#');window.scrollTo?.({top:value==='nav'?0:lobbyScroll,behavior:'instant'});return;}if(action==='open'&&Object.hasOwn(byId,value)){openGame(value);return;}if(!current)return;const g=byId[current],r=saves[current];if(action==='new'||action==='restart'){flushTime();settingsOpen=false;confirmAction=action;render();return;}if(action==='confirm'){if(!confirmAction)return;if(!r.finished&&!r.outcomeRecorded)event('run_outcome',{outcome:'abandoned',reason:confirmAction,moves:r.moves});saves[current]=confirmAction==='new'?fresh(g):{...fresh(g),state:clone(r.initial),initial:clone(r.initial)};confirmAction=null;paused=false;lastTick=performance.now();persist();render(true);tableSound('deal');return;}if(action==='pause'){flushTime();settingsOpen=false;paused=!paused;if(!paused)lastTick=performance.now();render();return;}if(paused)return;if(action==='undo'){if(r.history.length){flushTime();let old=r.history.pop();r.state=old.state;r.moves=old.moves;r.finished=false;event('undo');persist();render();tableSound('undo');}return;}if(g.won(r.state)||g.ended?.(r.state))return;if(current==='blocks'&&action==='place'&&(!Number.isInteger(r.state.anchor)||r.state.anchor!==+value))return;flushTime();let before={state:clone(r.state),moves:r.moves},changed=action==='drag'?commitDrag(g,r,value):g.action(r.state,action,value);if(action==='hint'){r.hints++;event('hint');}if(changed){if(current==='blocks'){bestScores.blocks=Math.max(Number(bestScores.blocks)||0,r.state.score);}r.history.push(before);if(r.history.length>120)r.history.shift();if(action!=='hint'){r.moves++;if(!r.first){r.first=true;event('first_valid_move');}}if(g.won(r.state)||g.ended?.(r.state)){r.finished=true;if(!r.outcomeRecorded){r.outcomeRecorded=true;event('run_outcome',{outcome:g.won(r.state)?'won':'no_moves',moves:r.moves,hints:r.hints,active_ms:Math.round(r.activeMs)});}}}const motion=changed?g.motion?.(before.state,action,value):null;persist();render();animateBlocks(motion);if(changed)tableSound(g.won(r.state)?'win':r.state.foundation?.reduce((n,p)=>n+p.length,0)>before.state.foundation?.reduce((n,p)=>n+p.length,0)?'foundation':'move');}
dragControls=installDragControls({root:app,getContext:()=>current?{gameId:current,runId:saves[current].runId,state:saves[current].state,blocked:paused||helpOpen||settingsOpen||!!confirmAction||!!saves[current].finished}:null,dispatch:handle});
app.addEventListener('toggle',e=>{if(current&&e.target.matches?.('.rules'))rulesState[current]=e.target.open;},true);
app.addEventListener('click',e=>{const target=e.target.closest('[data-action]');if(target&&!target.disabled){try{handle(target.dataset.action,target.dataset.value);}catch(err){event('error',{category:'interaction'});const status=app.querySelector('.game-feedback');if(status)status.textContent='That move could not be completed. Restart this puzzle if it keeps happening.';console.error(err);}}if(e.target.closest('.brand')){e.preventDefault();handle('lobby','all');}if(e.target.closest('a[data-action]'))e.preventDefault();});
document.addEventListener('keydown',e=>{if((confirmAction||helpOpen||settingsOpen)&&e.key==='Tab'){const choices=[...app.querySelectorAll('.confirm-dialog button')],ix=choices.indexOf(document.activeElement);e.preventDefault();choices[(ix+(e.shiftKey?-1:1)+choices.length)%choices.length]?.focus();return;}if(e.key==='Escape'){if(confirmAction){handle('cancel');}else if(helpOpen){handle('help');}else if(settingsOpen){handle('settings');}else if(current)handle('pause');}if(current==='sliding'&&!paused&&!confirmAction&&!helpOpen&&!settingsOpen&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();const z=saves[current].state.cells.indexOf(0),d={ArrowUp:-4,ArrowDown:4,ArrowLeft:-1,ArrowRight:1}[e.key],i=z+d;if(i>=0&&i<16)handle('tile',i);}
if(current==='sudoku'&&!paused&&!confirmAction&&!helpOpen&&!settingsOpen&&['Backspace','Delete'].includes(e.key)){e.preventDefault();handle('number',0);}
if(current==='sudoku'&&!paused&&!confirmAction&&!helpOpen&&!settingsOpen&&/^[0-9]$/.test(e.key)){e.preventDefault();handle('number',e.key);}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){flushTime();if(current)event('active_foreground_duration',{active_ms:Math.round(saves[current].activeMs)});persist();}lastTick=performance.now();});
window.addEventListener('popstate',()=>{const id=location.hash.slice(1);if(confirmAction||helpOpen||settingsOpen)lastTick=performance.now();confirmAction=null;helpOpen=false;settingsOpen=false;editingFavorites=false;if(Object.hasOwn(byId,id))openGame(id,false);else{lobbyView=id==='favorites'?'favorites':'all';handle('home','history');}});
window.addEventListener('storage',e=>{if(e.key===FAVORITES_KEY||e.key===null){favorites=loadFavorites(favorites);render();}if(e.key===KEY||e.key===null){if(syncSaves())render(true);else if(!current)render(true);}});
window.addEventListener('pagehide',()=>{flushTime();persist();});window.addEventListener('error',()=>event('error',{category:'runtime'}));
setInterval(()=>{if(syncSaves())render(true);flushTime();const timer=document.querySelector('#timer');if(timer&&current)timer.textContent=duration(saves[current].activeMs);persist();},1000);
const entryParams=new URLSearchParams(location.search),sourceApp=['dot','email','search','social'].includes(entryParams.get('source'))?entryParams.get('source'):(document.referrer?'referral':'direct');event('page_entry',{source_category:sourceApp,campaign:entryParams.get('campaign')==='private-preview'?'private-preview':null});if(Object.hasOwn(byId,location.hash?.slice(1)))openGame(location.hash.slice(1),false);else render();
