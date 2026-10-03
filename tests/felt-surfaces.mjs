// Source guards and palette calculations only; live browser QA is separate.
import fs from 'node:fs';
import assert from 'node:assert/strict';
const css=fs.readFileSync(new URL('../dist/style.css',import.meta.url),'utf8');
const surface=css.slice(css.indexOf('/* 1.12.1:')).replace(/\/\*[\s\S]*?\*\//g,'');
let checks=0;
function test(name,fn){fn();checks++;console.log('PASS '+name);}
const rule=selector=>{const hits=[...surface.matchAll(/([^{}]+)\{([^{}]+)\}/g)].filter(m=>m[1].trim()===selector);assert(hits.length,selector+' exists');return hits.map(m=>m[2]).join(';');};
test('Shared puzzle shell is transparent, borderless and shadowless',()=>{const r=rule('.club-room .play-surface');for(const prop of ['background:transparent','border:0','border-radius:0','box-shadow:none'])assert(r.includes(prop));});
test('Felt change leaves lobby, paper dialogs and Solitaire styling scoped independently',()=>{assert.doesNotMatch(surface,/\.menu-scene\s*\{|\.menu-field\s|\.scene-dialog\s|\.solitaire-room\s/);assert(css.includes('.scene-dialog{width:min(100%,430px)'));});
test('Block toolbar pins Help right even without a level chip',()=>{assert(rule('.club-room .room-help').includes('grid-column:3'));});
test('Water selected and hinted labels have dark-backed felt states',()=>{assert(rule('.club-room .tube.hint-destination').includes('background:#173e31'));assert(rule('.club-room .tube.selected').includes('background:#123c31b3'));assert(rule('.club-room .tube-label').includes('color:var(--room-muted)'));});
test('Block drag outline is styled outside the room and transient states stay distinct',()=>{assert(rule('.puzzle-drag-ghost.drag-piece-outline .drag-outline-square').includes('border-color:#f4d58e'));for(const state of ['ghost-valid','ghost-invalid','drag-cell-valid','drag-cell-invalid','clear-preview','drag-clear-preview'])assert(surface.includes('.block-cell.'+state));});
test('Paper playing objects and dark scene text have explicit color treatment',()=>{for(const selector of ['.club-room .arrow-tile','.club-room .sudoku .number-pad button','.club-room .words .word-list>span','.club-room .word-board .letter:not(.found):not(.word-trace):not(.word-trace-invalid)'])assert(rule(selector).includes('color:'));for(const state of ['.puzzle-result h2','.pause-screen h2','.puzzle-result .result-stats','.sudoku-status>span','.placement-summary'])assert(surface.includes(state));});
function luminance(hex){const c=hex.match(/\w\w/g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return c[0]*.2126+c[1]*.7152+c[2]*.0722;}
const contrast=(a,b)=>{const [hi,lo]=[luminance(a),luminance(b)].sort((a,b)=>b-a);return (hi+.05)/(lo+.05);};
test('Primary, secondary and accent scene text clear AA on lightest felt stop',()=>{for(const color of ['fff4d9','d3dfc6','f4d58e'])assert(contrast(color,'37664e')>=4.5,color);});
test('Focus stays visible on felt, dark block sockets and pale cells',()=>{assert(rule('.club-room button:focus-visible').includes('var(--room-accent)'));assert(rule('.club-room .block-board .block-cell:focus-visible').includes('var(--room-accent)'));assert(rule('.club-room .grid-board button:focus-visible').includes('#9b621c'));assert(contrast('f4d58e','315b47')>=3);assert(contrast('9b621c','fffefa')>=3);});
test('Pause uses a decorative CSS mark without relying on a missing glyph',()=>{assert.match(css,/\.club-room \.pause-screen>span\{[^}]*font-size:0;[^}]*background:linear-gradient/);const app=fs.readFileSync(new URL('../dist/app.js',import.meta.url),'utf8');assert(app.includes('class="pause-screen"><span aria-hidden="true">'));});
console.log(`FELT SURFACE TESTS PASSED (${checks}; static CSS and palette guards, not browser layout)`);
