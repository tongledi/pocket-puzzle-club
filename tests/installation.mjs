// Browser events are simulated. This suite never installs an app on the host.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { games as classics } from '../dist/games/classics.js';
import { games as modern } from '../dist/games/modern.js';
import { games as logic } from '../dist/games/logic.js';
import { clone, button } from '../dist/games/core.js';
import { commitDrag, installDragControls } from '../dist/drag.js';
const version=JSON.parse(fs.readFileSync(new URL('../package.json',import.meta.url),'utf8')).version;
const source=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8').replace(/^import .*;$/gm,'')+`
  globalThis.handle=handle;globalThis.requestInstall=requestInstall;
  globalThis.inspect=()=>({installed:isInstalled(),platform:installPlatform(),installBusy,installGuideOpen,installStatus,
    settingsOpen,helpOpen,current,saves,deferredInstallPrompt});
`;
function boot({navigator={},standalone=false,search='',hash='',store=new Map()}={}){
  let html='',time=0,focusedSelector;const winEvents={},docEvents={},intervals=[];
  const media={matches:standalone,addEventListener(name,fn){this[name]=fn;}};
  const app={get innerHTML(){return html;},set innerHTML(value){html=value;},addEventListener(){},querySelectorAll(){return [];},querySelector(selector){return {focus(){focusedSelector=selector;}};}};
  const ctx={classics,modern,logic,clone,button,commitDrag,installDragControls,console,crypto,URLSearchParams,
    navigator:{webdriver:true,userAgent:'Mozilla/5.0 Chrome/130.0 Safari/537.36',platform:'Win32',...navigator},
    matchMedia:()=>({matches:true}),performance:{now:()=>time},
    document:{querySelector:()=>app,addEventListener:(name,fn)=>docEvents[name]=fn,referrer:'',hidden:false,hasFocus:()=>true,activeElement:{dataset:{}}},
    window:{addEventListener:(name,fn)=>winEvents[name]=fn,matchMedia:()=>media,scrollTo(){}},
    location:{hash,search,hostname:'localhost'},history:{pushState(_a,_b,hash){ctx.location.hash=hash;}},
    localStorage:{getItem:key=>store.get(key),setItem:(key,value)=>store.set(key,value)},setInterval:fn=>intervals.push(fn)};
  vm.createContext(ctx);vm.runInContext(source,ctx);
  return {ctx,app,media,winEvents,docEvents,store,focusedSelector:()=>focusedSelector,advance:ms=>time+=ms,tick:()=>intervals[0]()};
}
function promptEvent(t,{outcome='dismissed',result,error}={}){
  let calls=0,prevented=0;const e={preventDefault(){prevented++;},prompt(){calls++;if(error)throw error;return result||Promise.resolve();},userChoice:Promise.resolve({outcome})};
  t.winEvents.beforeinstallprompt(e);return {calls:()=>calls,prevented:()=>prevented,event:e};
}
const openSettings=t=>t.ctx.handle('settings');
const verifyDialog=t=>{assert.match(t.app.innerHTML,/<div class="app-scene [^"]*" inert>/);assert.equal((t.app.innerHTML.match(/role="dialog"/g)||[]).length,1);};
let checks=0;
async function test(name,fn){await fn();checks++;console.log('PASS',name);}

await test('install entry stays in Settings and never changes the eight-game lobby',()=>{
  const t=boot();assert.doesNotMatch(t.app.innerHTML,/data-action="install"/);assert.equal((t.app.innerHTML.match(/data-game="/g)||[]).length,8);
  openSettings(t);assert.match(t.app.innerHTML,/data-action="install"[^>]*>Install Pocket Puzzle/);assert.equal(Object.keys(t.ctx.inspect().saves).length,0);
});
await test('beforeinstallprompt is saved without opening UI or prompting automatically',()=>{
  const t=boot(),original=t.app.innerHTML,e=promptEvent(t);assert.equal(e.prevented(),1);assert.equal(e.calls(),0);assert.equal(t.app.innerHTML,original);assert.equal(t.ctx.inspect().deferredInstallPrompt,e.event);
});
await test('native prompt is click-driven, one-use and protected from double clicks',async()=>{
  const t=boot();let resolve;const waiting=new Promise(r=>resolve=r),e=promptEvent(t,{result:waiting});openSettings(t);
  const first=t.ctx.requestInstall();assert.equal(e.calls(),1,'prompt runs synchronously before await');assert.equal(t.ctx.inspect().installBusy,true);assert.equal(t.ctx.inspect().deferredInstallPrompt,null);verifyDialog(t);
  await t.ctx.requestInstall();assert.equal(e.calls(),1);resolve();await first;
  assert.equal(t.ctx.inspect().installStatus,'dismissed');assert.equal(t.ctx.inspect().installed,false);assert.match(t.app.innerHTML,/prompt was dismissed/);
  await t.ctx.requestInstall();assert.equal(e.calls(),1);assert.match(t.app.innerHTML,/Install page as app/);
});
await test('accepted choice is not treated as completed installation',async()=>{
  const t=boot(),e=promptEvent(t,{outcome:'accepted'});openSettings(t);await t.ctx.requestInstall();assert.equal(e.calls(),1);assert.equal(t.ctx.inspect().installed,false);
  assert.match(t.app.innerHTML,/browser accepted the request/);assert.doesNotMatch(t.app.innerHTML,/is ready to open/);
  t.ctx.handle('install-back');assert.match(t.app.innerHTML,/data-action="install"/);
});
await test('appinstalled hides entry and clears pending browser events without a persistent flag',async()=>{
  const t=boot();promptEvent(t,{outcome:'accepted'});openSettings(t);await t.ctx.requestInstall();t.winEvents.appinstalled();
  assert.equal(t.ctx.inspect().installed,true);assert.equal(t.ctx.inspect().deferredInstallPrompt,null);assert.match(t.app.innerHTML,/is ready to open/);
  t.ctx.handle('install-back');assert.doesNotMatch(t.app.innerHTML,/data-action="install"/);assert.equal(t.store.size,0);
  const e=promptEvent(t);await t.ctx.requestInstall();assert.equal(e.calls(),0);
});
await test('standalone and iOS launches omit entry; display-mode changes refresh Settings',()=>{
  for(const options of [{standalone:true},{navigator:{standalone:true}}]){const t=boot(options);openSettings(t);assert.doesNotMatch(t.app.innerHTML,/data-action="install"/);}
  const t=boot();openSettings(t);promptEvent(t);t.media.matches=true;t.media.change();assert.doesNotMatch(t.app.innerHTML,/data-action="install"/);assert.equal(t.ctx.inspect().deferredInstallPrompt,null);
  t.media.matches=false;t.media.change();assert.match(t.app.innerHTML,/data-action="install"/);
});
await test('iPhone, third-party iOS browser and desktop-mode iPad receive accurate Share guidance',async()=>{
  for(const navigator of [{userAgent:'Mozilla/5.0 (iPhone) Safari/604.1',platform:'iPhone'},{userAgent:'Mozilla/5.0 (iPhone) CriOS/130 Safari/604.1',platform:'iPhone'},{userAgent:'Mozilla/5.0 (Macintosh) Safari/605.1.15',platform:'MacIntel',maxTouchPoints:5}]){
    const t=boot({navigator});assert.equal(t.ctx.inspect().platform,'ios');openSettings(t);assert.match(t.app.innerHTML,/>Add to home screen</);await t.ctx.requestInstall();verifyDialog(t);
    assert.match(t.app.innerHTML,/Share menu/);assert.match(t.app.innerHTML,/If it is missing, open this page in Safari/);assert.match(t.app.innerHTML,/Open as Web App/);assert.doesNotMatch(t.app.innerHTML,/only Safari|Install page as app/);
  }
});
await test('Android, Mac Safari and desktop fallbacks do not pretend a prompt is supported',async()=>{
  for(const [navigator,pattern] of [[{userAgent:'Mozilla/5.0 (Linux; Android 16) Chrome/130'},/Install and create shortcut/],[{userAgent:'Mozilla/5.0 (Macintosh) Version/26.0 Safari/605.1.15',platform:'MacIntel'},/macOS Sonoma 14 or later/],[{userAgent:'Mozilla/5.0 Firefox/140',platform:'Win32'},/bookmark this page or try Chrome or Edge/]]){
    const t=boot({navigator});openSettings(t);await t.ctx.requestInstall();assert.match(t.app.innerHTML,pattern);assert.doesNotMatch(t.app.innerHTML,/data-action="install"/);assert.equal(t.ctx.inspect().installed,false);
    assert.match(t.app.innerHTML,/Internet access is needed/);assert.match(t.app.innerHTML,/app and browser saves separate/);
  }
});
await test('missing early prompt can arrive later and supplies a native action without auto-invocation',async()=>{
  const t=boot();openSettings(t);await t.ctx.requestInstall();assert.doesNotMatch(t.app.innerHTML,/data-action="install"/);
  const e=promptEvent(t);assert.equal(e.calls(),0);assert.match(t.app.innerHTML,/data-action="install"/);await t.ctx.requestInstall();assert.equal(e.calls(),1);
});
await test('a thrown or rejected browser prompt falls back without unhandled rejection or installed claims',async()=>{
  for(const failure of [{error:Error('unsupported')},{result:Promise.reject(Error('not allowed'))}]){
    const t=boot();const e=promptEvent(t,failure);openSettings(t);await t.ctx.requestInstall();assert.equal(e.calls(),1);assert.equal(t.ctx.inspect().installBusy,false);assert.equal(t.ctx.inspect().installed,false);assert.match(t.app.innerHTML,/could not open its install prompt/);assert.match(t.app.innerHTML,/Install page as app/);
  }
});
await test('a pending browser choice never reopens Settings after Escape or history navigation',async()=>{
  for(const close of ['escape','history']){
    const t=boot();let resolve;const e=promptEvent(t,{result:new Promise(r=>resolve=r)});openSettings(t);const pending=t.ctx.requestInstall();
    if(close==='escape')t.docEvents.keydown({key:'Escape'});else{t.ctx.location.hash='#water';t.winEvents.popstate();}
    assert.equal(t.ctx.inspect().settingsOpen,false);const html=t.app.innerHTML;resolve();await pending;assert.equal(e.calls(),1);assert.equal(t.app.innerHTML,html);assert.doesNotMatch(t.app.innerHTML,/role="dialog"/);
  }
});
await test('guide Back and Escape preserve focus routes and do not claim success',async()=>{
  const t=boot();openSettings(t);await t.ctx.requestInstall();assert.equal(t.focusedSelector(),'.dialog-close');t.ctx.handle('install-back');assert.equal(t.focusedSelector(),'[data-action="install"]');assert.equal(t.ctx.inspect().settingsOpen,true);
  await t.ctx.requestInstall();t.docEvents.keydown({key:'Escape'});assert.equal(t.focusedSelector(),'[data-action="settings"]');assert.equal(t.ctx.inspect().settingsOpen,false);assert.equal(t.ctx.inspect().installed,false);
});
await test('guide blocks all eight boards and excludes reading time without touching save schema',async()=>{
  for(const id of ['solitaire','mahjong','water','blocks','sliding','arrows','sudoku','words']){
    const t=boot();t.ctx.handle('open',id);t.advance(1000);openSettings(t);await t.ctx.requestInstall();verifyDialog(t);
    const before=JSON.stringify(t.ctx.inspect().saves[id]);t.advance(9000);for(const action of ['hint','undo','stock','restart','tile','number','place','arrow','tube','letter'])t.ctx.handle(action,0);t.tick();assert.equal(JSON.stringify(t.ctx.inspect().saves[id]),before,id);
    assert.equal(JSON.parse(t.store.get('pocket-puzzle-v1')).schema,1);t.docEvents.keydown({key:'Escape'});t.advance(1000);t.tick();assert.equal(t.ctx.inspect().saves[id].activeMs,2000,id);
  }
});
await test('QA mode prevents native installation, keeps guidance and never changes production saves',async()=>{
  const store=new Map([['pocket-puzzle-v1-favorites','["water"]']]),t=boot({search:'?qa=1',store}),e=promptEvent(t);openSettings(t);await t.ctx.requestInstall();assert.equal(e.prevented(),1);assert.equal(e.calls(),0);assert.equal(t.ctx.inspect().deferredInstallPrompt,null);assert.match(t.app.innerHTML,/install prompt is disabled here/);assert.equal(store.size,1);assert.equal(store.get('pocket-puzzle-v1-favorites'),'["water"]');
});
await test('manifest stays scoped to each deployment directory and strips QA/query/hash launch state',()=>{
  const manifest=JSON.parse(fs.readFileSync(new URL('../dist/manifest.webmanifest',import.meta.url),'utf8'));
  assert.equal(manifest.display,'standalone');assert.equal(manifest.prefer_related_applications,false);assert.ok(manifest.name&&manifest.short_name);assert.equal(manifest.lang,'en');
  for(const base of ['https://tongledi.github.io/pocket-puzzle-club/dist/','https://preview.invalid/dist/']){
    const file=new URL('manifest.webmanifest?v='+version,base);
    for(const field of ['start_url','scope'])assert.equal(new URL(manifest[field],file).href,base,field);
    // Unlike scope/start_url, the spec resolves id against the start URL origin.
    assert.equal(new URL(manifest.id,new URL(base).origin).href,new URL('/pocket-puzzle-club/dist/',base).href);
    assert.equal(manifest.id,'/pocket-puzzle-club/dist/');
    for(const icon of manifest.icons){assert.equal(new URL(icon.src,file).origin,new URL(base).origin);assert.ok(new URL(icon.src,file).pathname.startsWith(new URL(base).pathname));assert.equal(icon.type,'image/png');}
  }
  assert.ok(manifest.icons.some(icon=>icon.sizes==='192x192'));assert.ok(manifest.icons.some(icon=>icon.sizes==='512x512'));assert.ok(manifest.icons.some(icon=>icon.purpose.includes('maskable')));
});
await test('PNG icon headers and Apple touch metadata are valid and all icons remain local',()=>{
  for(const [name,size] of [['icon-192.png',192],['icon-512.png',512],['apple-touch-icon.png',180]]){
    const bytes=fs.readFileSync(new URL('../dist/icons/'+name,import.meta.url));assert.equal(bytes.subarray(1,4).toString(),'PNG');assert.equal(bytes.readUInt32BE(16),size);assert.equal(bytes.readUInt32BE(20),size);assert.equal(bytes[24],8,'8-bit icons');
  }
  const html=fs.readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');assert.ok(html.includes('<link rel="manifest" href="./manifest.webmanifest?v='+version+'">'));assert.match(html,/rel="apple-touch-icon" sizes="180x180"/);assert.match(html,/name="apple-mobile-web-app-capable" content="yes"/);assert.doesNotMatch(source,/serviceWorker\.register|caches\.open/);
});
await test('install instructions override legacy dialog action-row flex and flow vertically',async()=>{
  const css=fs.readFileSync(new URL('../dist/style.css',import.meta.url),'utf8');
  // Source-level regression guard, not a substitute for browser computed-style QA.
  const generic=css.indexOf('.confirm-dialog>div{display:flex;');
  const override=css.indexOf('.scene-dialog>.install-guide{display:block}');
  assert.ok(generic>=0,'legacy action-row rule remains intact for other dialogs');
  assert.ok(override>generic,'more-specific block override follows the legacy row rule');
  const t=boot();openSettings(t);await t.ctx.requestInstall();
  assert.match(t.app.innerHTML,/<div class="install-guide"><p>/);
  assert.match(t.app.innerHTML,/<ol class="install-steps">/);
  assert.match(t.app.innerHTML,/<\/div><button[^>]*data-action="install-back"/,'Back stays outside flowing content');
});
console.log(`INSTALLATION TESTS PASSED (${checks}; simulated events and static assets, no host installation or physical-device claim)`);
