import assert from 'node:assert/strict';
import { clone, shuffle, range, button, grids } from '../dist/games/core.js';
import { solitaire, solitaireMove, mahjong, freeTile } from '../dist/games/classics.js';
import { water, waterWon, pour, blocks, canPlace, blockOver } from '../dist/games/modern.js';
import { sliding, arrows, arrowFree, sudoku, sudokuConflict, words } from '../dist/games/logic.js';

let checks = 0, failures = [], warnings = [];
const origRandom = Math.random;
function seed(n) { let x=n|0; Math.random=()=>{x|=0;x=x+0x6D2B79F5|0;let t=Math.imul(x^x>>>15,1|x);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;}; }
function test(name, fn) { try { fn(); checks++; console.log('PASS',name); } catch(e) { failures.push({name,message:e.message,stack:e.stack}); console.error('FAIL',name,e.stack); } }
const sorted = a => [...a].sort((a,b)=>a-b);
const cards = s => [...s.stock,...s.waste,...s.tableau.flat(),...s.foundation.flat()];
const card = (rank,suit,up=true) => ({rank,suit,up});
const solState = () => ({tableau:range(7).map(()=>[]),stock:[],waste:[],foundation:range(4).map(()=>[]),selected:null,message:''});
function cardInvariant(s) { assert.equal(cards(s).length,52); assert.equal(new Set(cards(s).map(c=>`${c.suit}:${c.rank}`)).size,52); s.tableau.forEach(p=>{let up=false;for(let c of p){if(c.up)up=true;else assert(!up);}}); }
function clickPair(game,s,action,a,b) { game.action(s,action,String(a)); return game.action(s,action,String(b)); }
const waterMass = s => sorted(s.tubes.flat());
const gridNear = (a,b,n) => Math.abs(a%n-b%n)+Math.abs(Math.floor(a/n)-Math.floor(b/n))===1;

// A tiny independent Sudoku solver: count at most two solutions using MRV.
function countSudokuSolutions(start,limit=2) {
 const a=start.slice(); let count=0,nodes=0;
 function solve(){if(++nodes>1e6)throw Error('Sudoku solver budget exceeded');let best=-1,opts=[];
  for(let i=0;i<81;i++)if(!a[i]){let used=new Set;for(let j=0;j<81;j++)if(a[j]&&(Math.floor(i/9)===Math.floor(j/9)||i%9===j%9||(Math.floor(i/27)===Math.floor(j/27)&&Math.floor((i%9)/3)===Math.floor((j%9)/3))))used.add(a[j]);let o=range(9).map(x=>x+1).filter(x=>!used.has(x));if(!o.length)return;if(best<0||o.length<opts.length){best=i;opts=o;}if(o.length===1)break;}
  if(best<0){count++;return;}for(let n of opts){a[best]=n;solve();a[best]=0;if(count>=limit)return;}}
 solve();return {count,nodes};
}

try {
test('core helpers preserve values, clone deeply, and render expected markup',()=>{
 assert.deepEqual(range(0),[]);assert.deepEqual(range(5),[0,1,2,3,4]);const o={a:[{b:1}]};const c=clone(o);c.a[0].b=2;assert.equal(o.a[0].b,1);
 for(let s=1;s<=100;s++){seed(s);assert.deepEqual(sorted(shuffle(range(52))),range(52));}
 assert.equal(button('Go','move',3,'test','disabled'),'<button class="test" data-action="move" data-value="3" disabled>Go</button>');
 assert.match(grids(['A','B'],2,'test'),/--cols:2/);
});
test('all eight game descriptors create, render, reject unknown actions, and start incomplete',()=>{
 for(const [i,g] of [solitaire,mahjong,water,blocks,sliding,arrows,sudoku,words].entries()){seed(i+4);let s=g.create();assert.equal(typeof g.view(s),'string');assert(g.view(s).length>100);assert.equal(g.action(s,'unknown','0'),false);assert.equal(g.won(s),false,g.id);}
});
test('Solitaire 500 generated deals conserve all 52 cards and standard 1–7 tableau/24 stock',()=>{
 for(let n=1;n<=500;n++){seed(n);let s=solitaire.create();cardInvariant(s);assert.deepEqual(s.tableau.map(p=>p.length),[1,2,3,4,5,6,7]);assert.equal(s.stock.length,24);assert(s.stock.every(c=>!c.up));assert(s.tableau.every(p=>p.filter(c=>c.up).length===1));}
});
test('Solitaire draw-one stock, waste recycle order, and selection reset',()=>{
 seed(21);const s=solitaire.create(),drawn=[];for(let i=0;i<24;i++){s.selected='t:0:0';assert.equal(solitaire.action(s,'stock',''),true);assert.equal(s.selected,null);assert(s.waste.at(-1).up);drawn.push(`${s.waste.at(-1).suit}:${s.waste.at(-1).rank}`);cardInvariant(s);}
 assert.equal(s.stock.length,0);assert.equal(solitaire.action(s,'stock',''),true);assert.equal(s.waste.length,0);assert(s.stock.every(c=>!c.up));let recycled=[];for(let i=0;i<24;i++){solitaire.action(s,'stock','');recycled.push(`${s.waste.at(-1).suit}:${s.waste.at(-1).rank}`);}assert.deepEqual(recycled,drawn);
 assert.equal(solitaire.action(solState(),'stock',''),false);
});
test('Solitaire legal alternating descending sequence, reveal, and invalid moves',()=>{
 let s=solState();s.tableau[0]=[card(2,0,false),card(8,0),card(7,1),card(6,2)];s.tableau[1]=[card(9,1)];assert.equal(solitaireMove(s,'t:0:1','t:1'),true);assert.deepEqual(s.tableau[1].map(c=>c.rank),[9,8,7,6]);assert.equal(s.tableau[0][0].up,true);
 const bad=(setup,from,to)=>{const q=solState();setup(q);const before=clone(q);assert.equal(solitaireMove(q,from,to),false);assert.deepEqual(q,before);};
 bad(q=>{q.tableau[0]=[card(8,0)];q.tableau[1]=[card(9,2)];},'t:0:0','t:1');
 bad(q=>{q.tableau[0]=[card(8,0),card(7,2)];q.tableau[1]=[card(9,1)];},'t:0:0','t:1');
 bad(q=>{q.tableau[0]=[card(8,0,false)];q.tableau[1]=[card(9,1)];},'t:0:0','t:1');
 bad(q=>{q.tableau[0]=[card(12,0)];},'t:0:0','t:1');
 bad(q=>{q.tableau[0]=[card(13,0)];},'t:0:0','t:0');
 bad(q=>{q.waste=[card(2,0)];},'w','f:0');
 bad(q=>{q.waste=[card(1,0)];},'w','f:1');
 bad(q=>{q.tableau[0]=[card(2,0),card(1,1)];},'t:0:0','f:0');
 s=solState();s.tableau[0]=[card(13,0),card(12,1)];assert.equal(solitaireMove(s,'t:0:0','t:1'),true);assert.equal(s.tableau[1].length,2);
 s=solState();s.foundation[0]=[card(1,0)];s.tableau[1]=[card(2,1)];assert.equal(solitaireMove(s,'f:0','t:1'),true);
});
test('Solitaire all 52 foundations can be completed via public actions and win is exact',()=>{
 const s=solState();s.stock=range(4).flatMap(suit=>range(13).map(x=>card(x+1,suit,false))).reverse();
 for(let suit=0;suit<4;suit++)for(let rank=1;rank<=13;rank++){assert.equal(solitaire.action(s,'stock',''),true);assert.equal(solitaire.action(s,'select','w'),false);assert.equal(solitaire.action(s,'foundation',String(suit)),true);assert.equal(s.foundation[suit].at(-1).rank,rank);assert.equal(solitaire.won(s),suit===3&&rank===13);}
});
test('Solitaire legal random play over 50 deals conserves deck and valid face-up runs',()=>{
 for(let n=1;n<=50;n++){seed(n);let s=solitaire.create();for(let m=0;m<200;m++){const sources=['w',...s.tableau.flatMap((p,j)=>p.map((c,i)=>c.up?`t:${j}:${i}`:null).filter(Boolean)),...s.foundation.map((p,j)=>p.length?`f:${j}`:null).filter(Boolean)];if(Math.random()<.3)solitaire.action(s,'stock','');else{let from=sources[Math.floor(Math.random()*sources.length)];let to=Math.random()<.5?`t:${Math.floor(Math.random()*7)}`:`f:${Math.floor(Math.random()*4)}`;solitaireMove(s,from,to);}cardInvariant(s);}}
});
test('Mahjong covered and horizontally blocked tiles cannot move; wrong symbols do not clear',()=>{
 const s={tiles:[{x:0,y:0,z:0,type:1},{x:1,y:0,z:0,type:1},{x:2,y:0,z:0,type:2},{x:0,y:0,z:1,type:3}],selected:null};
 assert.equal(freeTile(s,0),false);assert.equal(freeTile(s,1),false);assert.equal(freeTile(s,2),true);assert.equal(freeTile(s,3),true);assert.equal(mahjong.action(s,'tile','1'),false);assert.equal(s.selected,null);assert.equal(clickPair(mahjong,s,'tile',2,3),false);assert(s.tiles.every(t=>!t.gone));
});
test('Mahjong 500 seeded layouts solve fully using real pairs; hints always name legal matching pairs',()=>{
 for(let n=1;n<=500;n++){seed(n);let s=mahjong.create();assert.equal(s.tiles.length,72);assert.equal(s.solution.length,36);for(let k=0;k<18;k++)assert.equal(s.tiles.filter(t=>t.type===k).length,4);for(const [a,b] of s.solution){assert(freeTile(s,a));assert(freeTile(s,b));assert.equal(s.tiles[a].type,s.tiles[b].type);assert.equal(mahjong.action(s,'hint',''),false);assert(s.hint.every(i=>freeTile(s,i)));assert.equal(s.tiles[s.hint[0]].type,s.tiles[s.hint[1]].type);s.selected=null;assert.equal(clickPair(mahjong,s,'tile',a,b),true);}assert(mahjong.won(s));assert(s.tiles.every(t=>t.gone));}
});
test('Water Sort validates all pour rules, full contiguous runs, capacity, and exact win',()=>{
 const s={tubes:[[0,1,1],[1,1,1],[2],[],[3,3,3,3],[4,4,4,4],[]],selected:0};const mass=waterMass(s);assert.equal(pour(s,0,1),true);assert.deepEqual(s.tubes[0],[0,1]);assert.deepEqual(s.tubes[1],[1,1,1,1]);assert.equal(s.selected,null);assert.deepEqual(waterMass(s),mass);
 for(const [a,b] of [[0,0],[0,1],[0,2],[3,0]]){let before=clone(s);assert.equal(pour(s,a,b),false);assert.deepEqual(s,before);}
 assert.equal(pour(s,4,3),true);assert.deepEqual(s.tubes[3],[3,3,3,3]);assert.deepEqual(s.tubes[4],[]);
 assert.equal(waterWon({tubes:[[1,1],[]]}),false);assert.equal(waterWon({tubes:[[1,1,1,1],[2,2,2,2],[]]}),true);assert.equal(waterWon({tubes:[[1,1,2,2],[]]}),false);
});
test('Water Sort 1000 seeded puzzles are unsolved and their hinted inverse paths win through legal pours',()=>{
 for(let n=1;n<=1000;n++){seed(n);let s=water.create();assert.equal(s.tubes.length,7);assert.equal(s.tubes.flat().length,20);assert(s.tubes.every(t=>t.length<=4));assert.equal(water.won(s),false,`seed ${n} starts solved`);const mass=waterMass(s);let moves=0;while(s.path.length){let [a,b]=s.path[0];water.action(s,'hint','');assert.equal(s.selected,a);assert.equal(water.action(s,'tube',String(b)),true,`seed ${n}, path ${moves}`);assert.deepEqual(waterMass(s),mass);assert(s.tubes.every(t=>t.length<=4));moves++;assert(moves<=65);}assert(water.won(s),`seed ${n} inverse path not solved`);}
});
test('Water Sort unplanned moves invalidate scripted hints and fallback hints remain legal',()=>{
 seed(56);let s=water.create();let alternative=null;for(let a=0;a<7;a++)for(let b=0;b<7;b++)if(JSON.stringify([a,b])!==JSON.stringify(s.path[0])&&pour(clone(s),a,b))alternative=[a,b];assert(alternative);s.selected=alternative[0];assert.equal(water.action(s,'tube',String(alternative[1])),true);assert.deepEqual(s.path,[]);water.action(s,'hint','');let m=s.message.match(/tube (\d+) into tube (\d+)/);if(m)assert(pour(clone(s),+m[1]-1,+m[2]-1));
});
test('Block Garden edges, occupied cells, row+column clears, scoring, exhaustion, game-over',()=>{
 let s={cells:Array(64).fill(0),pieces:[[[0,0],[1,0]],[[0,0]],null],selected:0,score:0,lines:0};assert.equal(canPlace(s,s.pieces[0],7),false);assert.equal(canPlace(s,[[0,0],[0,1]],56),false);s.cells[0]=1;assert.equal(canPlace(s,s.pieces[0],0),false);assert.equal(blocks.action(s,'place','0'),false);assert.equal(s.score,0);
 s={cells:Array(64).fill(0),pieces:[[[0,0]],[[0,0]],null],selected:0,score:0,lines:0};for(let x=1;x<8;x++)s.cells[x]=1;for(let y=1;y<8;y++)s.cells[y*8]=1;assert.equal(blocks.action(s,'place','0'),true);assert(s.cells.every(v=>v===0));assert.equal(s.lines,2);assert.equal(s.score,21);assert.equal(s.pieces[0],null);assert.equal(s.selected,1);assert.equal(blocks.action(s,'place','0'),true);assert(s.pieces.every(Boolean));assert.equal(s.pieces.length,3);
 s={cells:Array(64).fill(1),pieces:[[[0,0]],null,null]};assert(blockOver(s));s.cells[63]=0;assert.equal(blockOver(s),false);s.pieces[0]=[[0,0],[1,0]];assert(blockOver(s));assert.equal(blocks.won(s),false);
});
test('Block Garden 100 seeded runs reproduce independent placement and simultaneous-clear scoring',()=>{
 for(let n=1;n<=100;n++){seed(n);let s=blocks.create();for(let k=0;k<200&&!blockOver(s);k++){let opts=[];s.pieces.forEach((p,j)=>{if(p)for(let i=0;i<64;i++)if(canPlace(s,p,i))opts.push([j,i]);});assert(opts.length);let [j,i]=opts[Math.random()*opts.length|0],p=clone(s.pieces[j]);let beforeScore=s.score,beforeLines=s.lines,expected=s.cells.slice();p.forEach(([x,y])=>expected[i+8*y+x]=1);let clearRows=range(8).filter(y=>range(8).every(x=>expected[y*8+x]===1)),clearCols=range(8).filter(x=>range(8).every(y=>expected[y*8+x]===1));expected=expected.map((c,z)=>clearRows.includes(Math.floor(z/8))||clearCols.includes(z%8)?0:c);blocks.action(s,'piece',String(j));assert.equal(blocks.action(s,'place',String(i)),true);assert.deepEqual(s.cells,expected);assert.equal(s.lines,beforeLines+clearRows.length+clearCols.length);assert.equal(s.score,beforeScore+p.length+10*(clearRows.length+clearCols.length));assert(s.cells.length===64);}}
});
test('Sliding Tiles reject nonadjacent and blank moves, forbid row wrap, and recognize exact win',()=>{
 let s={cells:range(16).map(i=>(i+1)%16),trail:[],message:''};assert(sliding.won(s));let before=s.cells.slice();assert.equal(sliding.action(s,'tile','15'),false);assert.equal(sliding.action(s,'tile','0'),false);assert.deepEqual(s.cells,before);assert.equal(sliding.action(s,'tile','14'),true);assert.equal(sliding.won(s),false);assert.equal(sliding.action(s,'tile','15'),true);assert(sliding.won(s));assert.equal(s.trail.length,0);
 s.cells=[1,2,3,0,4,5,6,7,8,9,10,11,12,13,14,15];assert.equal(sliding.action(s,'tile','4'),false);
});
test('Sliding Tiles 500 seeds plus random detours retain a legal path to victory',()=>{
 for(let n=1;n<=500;n++){seed(n);let s=sliding.create();assert.equal(s.trail.length,90);assert.deepEqual(sorted(s.cells),range(16));for(let k=0;k<50;k++){let z=s.cells.indexOf(0),choices=range(16).filter(i=>gridNear(i,z,4));let i=choices[Math.random()*choices.length|0];assert.equal(sliding.action(s,'tile',String(i)),true);}let steps=0;while(s.trail.length){let before=s.cells.slice(),z=s.cells.indexOf(0);assert(gridNear(z,s.trail.at(-1),4));assert.equal(sliding.action(s,'hint',''),true);assert.equal(s.cells.filter((v,i)=>v!==before[i]).length,2);assert(++steps<=140);}assert(sliding.won(s));assert.equal(sliding.action(s,'hint',''),false);}
});
test('Arrow Escape exact directional blocking, border exits, invalid moves',()=>{
 let s={cells:Array(36).fill(null)};s.cells[7]=1;s.cells[9]=0;assert.equal(arrowFree(s,7),false);assert.equal(arrows.action(s,'arrow','7'),false);assert.equal(s.cells[7],1);assert.equal(arrows.action(s,'arrow','9'),true);assert(arrowFree(s,7));assert.equal(arrows.action(s,'arrow','7'),true);assert(arrows.won(s));assert.equal(arrows.action(s,'arrow','7'),false);
 for(const [i,d] of [[0,0],[5,1],[35,2],[30,3]]){s={cells:Array(36).fill(2)};s.cells[i]=d;assert(arrowFree(s,i));}
});
test('Arrow Escape 1000 seeds always finish by clearing any available arrow; hints valid',()=>{
 for(let n=1;n<=1000;n++){seed(n);let s=arrows.create(),steps=0;assert(s.cells.some(x=>x!=null));while(!arrows.won(s)){const available=range(36).filter(i=>s.cells[i]!=null&&arrowFree(s,i));assert(available.length,`seed ${n} deadlocked`);arrows.action(s,'hint','');assert(available.includes(s.hint));const i=available[Math.random()*available.length|0];assert.equal(arrows.action(s,'arrow',String(i)),true);assert(++steps<=36);}assert(s.cells.every(x=>x==null));}
});
test('Sudoku 100 shuffled puzzles preserve clues, valid complete answers, and unique solvability',()=>{
 for(let n=1;n<=100;n++){seed(n);let s=sudoku.create();assert.equal(s.cells.length,81);assert(s.given.filter(Boolean).length>=36&&s.given.filter(Boolean).length<=40);assert(s.cells.every((v,i)=>!v||v===s.answer[i]));assert(s.cells.every((_,i)=>!sudokuConflict(s,i)));let q={cells:s.answer};assert(q.cells.every((_,i)=>!sudokuConflict(q,i)));assert.equal(countSudokuSolutions(s.cells).count,1);}
});
test('Sudoku fixed clues immutable, row/column/box conflicts found, erase/hints solve and correct',()=>{
 seed(20);let s=sudoku.create(),fixed=s.given.findIndex(Boolean),empty=s.given.findIndex(v=>!v);sudoku.action(s,'cell',String(fixed));let before=s.cells[fixed];assert.equal(sudoku.action(s,'number','0'),false);assert.equal(s.cells[fixed],before);sudoku.action(s,'cell',String(empty));assert.equal(sudoku.action(s,'number','1'),true);assert.equal(s.cells[empty],1);assert.equal(sudoku.action(s,'number','0'),true);assert.equal(s.cells[empty],0);
 for(let j of [1,9,10]){let q={cells:Array(81).fill(0)};q.cells[0]=q.cells[j]=4;assert(sudokuConflict(q,0));assert(sudokuConflict(q,j));}let q={cells:Array(81).fill(0)};q.cells[0]=q.cells[40]=4;assert.equal(sudokuConflict(q,0),false);
 let steps=0;while(!sudoku.won(s)){assert.equal(sudoku.action(s,'hint',''),true);assert(++steps<=51);}assert.equal(sudoku.action(s,'hint',''),false);assert(sudoku.won(s));sudoku.action(s,'cell',String(empty));sudoku.action(s,'number',String(s.answer[empty]%9+1));assert.equal(sudoku.won(s),false);assert.equal(sudoku.action(s,'hint',''),true);assert(sudoku.won(s));
});
test('Word Search 500 random boards embed all six words, accept reverse endpoints, prevent duplicate finds, and win',()=>{
 for(let n=1;n<=500;n++){seed(n);let s=words.create();assert.equal(s.cells.length,100);assert(s.cells.every(c=>/^[A-Z]$/.test(c)));assert.equal(s.list.length,6);assert.equal(new Set(s.list).size,6);for(let k=0;k<6;k++){const p=s.paths[k].slice();assert.equal(p.map(i=>s.cells[i]).join(''),s.list[k]);words.action(s,'hint','');assert.equal(s.hint,s.paths[k][0]);let [a,b]=n%2?[p[0],p.at(-1)]:[p.at(-1),p[0]];assert.equal(clickPair(words,s,'letter',a,b),true);assert.equal(s.found.length,k+1);assert.equal(clickPair(words,s,'letter',a,b),false);assert.equal(s.found.length,k+1);}assert(words.won(s));}
});
test('Word Search rejects bent lines, unrelated single cells, and recognizes all eight directions',()=>{
 seed(43);let s=words.create();assert.equal(clickPair(words,s,'letter',0,12),false);assert.equal(s.found.length,0);assert.match(s.message,/straight/);assert.equal(clickPair(words,s,'letter',0,0),false);
 for(let [dx,dy] of [[1,0],[0,1],[1,1],[-1,1],[-1,0],[0,-1],[-1,-1],[1,-1]]){let p=[44,44+dx+10*dy,44+2*dx+20*dy];s={cells:Array(100).fill('X'),list:['CAT'],paths:[p],found:[],selected:null};p.forEach((j,i)=>s.cells[j]='CAT'[i]);assert.equal(clickPair(words,s,'letter',p[0],p[2]),true);assert(words.won(s));}
});

test('Hint display highlights the promised Arrow Escape tile',()=>{
 seed(982);let s=arrows.create();arrows.action(s,'hint','');assert(s.hint>=0);let markup=arrows.view(s),button=markup.match(new RegExp(`<button[^>]*data-value="${s.hint}"[^>]*>`))?.[0];assert(button);assert.match(button,/class="[^"]*hinted/, 'Arrow Escape announces a highlighted hint, but rendered tile has no hinted class');
});
test('Random valid UI action flows never throw or corrupt board dimensions, and all states render',()=>{
 const games=[solitaire,mahjong,water,blocks,sliding,arrows,sudoku,words];
 for(let n=1;n<=20;n++)for(const g of games){seed(n*100+games.indexOf(g));let s=g.create();for(let m=0;m<200;m++){
 let act,val='';switch(g.id){
 case 'solitaire':{let choices=[['stock',''],['hint',''],...range(7).map(i=>['column',String(i)]),...range(4).map(i=>['foundation',String(i)]),...s.tableau.flatMap((p,j)=>p.map((_,i)=>['select',`t:${j}:${i}`])),...(s.waste.length?[['select','w']]:[])];[act,val]=choices[Math.random()*choices.length|0];break;}
 case 'mahjong':act=Math.random()<.1?'hint':'tile';val=String(Math.random()*s.tiles.length|0);break;
 case 'water':act=Math.random()<.1?'hint':'tube';val=String(Math.random()*7|0);break;
 case 'blocks':act=Math.random()<.1?'hint':Math.random()<.3?'piece':'place';val=String(Math.random()*(act==='piece'?3:64)|0);break;
 case 'sliding':act=Math.random()<.1?'hint':'tile';val=String(Math.random()*16|0);break;
 case 'arrows':act=Math.random()<.1?'hint':'arrow';val=String(Math.random()*36|0);break;
 case 'sudoku':act=Math.random()<.1?'hint':Math.random()<.5?'cell':'number';val=String(Math.random()*(act==='cell'?81:10)|0);break;
 case 'words':act=Math.random()<.1?'hint':'letter';val=String(Math.random()*100|0);break;
 }
 g.action(s,act,val);assert.equal(typeof g.won(s),'boolean');assert.equal(typeof g.view(s),'string');
 if(g.id==='solitaire')cardInvariant(s);if(g.id==='water'){assert.equal(s.tubes.flat().length,20);assert(s.tubes.every(t=>t.length<=4));}if(g.id==='blocks')assert.equal(s.cells.length,64);if(g.id==='sliding')assert.deepEqual(sorted(s.cells),range(16));if(g.id==='arrows')assert.equal(s.cells.length,36);if(g.id==='sudoku')assert.equal(s.cells.length,81);if(g.id==='words')assert.equal(s.cells.length,100);
 }}
});

// Robustness probes are separated: these values cannot be emitted by the shipped board buttons.
const probes=[
 ['solitaire source out of range',()=>solitaireMove(solitaire.create(),'t:0:99','t:1')],
 ['Solitaire malformed selected pile',()=>solitaire.action(solitaire.create(),'select','t:99:0')],
 ['Water Sort out-of-range tube',()=>water.action(water.create(),'tube','99')],
 ['Block Garden negative cell',()=>{let s=blocks.create();s.pieces=[[[0,0]],null,null];s.selected=0;return blocks.action(s,'place','-1');}],
 ['Sudoku invalid number',()=>{let s=sudoku.create();s.selected=s.given.findIndex(v=>!v);return sudoku.action(s,'number','42');}]
];
for(const [name,fn] of probes){try{let result=fn();if(result===true)warnings.push({name,issue:'accepts malformed programmatic input'});}catch(e){warnings.push({name,issue:e.message});}}
} finally { Math.random=origRandom; }
console.log('\nSUMMARY',JSON.stringify({passed:checks,failed:failures.length,warnings,failures},null,2));
if(failures.length)process.exitCode=1;
