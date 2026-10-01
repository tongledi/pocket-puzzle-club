import assert from 'node:assert/strict';
globalThis.range = n => Array.from({length:n}, (_,i)=>i);
globalThis.shuffle = a => { for(let i=a.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[a[i],a[j]]=[a[j],a[i]];} return a; };
globalThis.button = (label,action,value='',cls='',extra='') => `<button class="${cls}" data-action="${action}" data-value="${value}" ${extra}>${label}</button>`;
globalThis.grids = (cells,n,cls='')=>`<div class="${cls}">${cells.join('')}</div>`;
const {sudoku,sudokuSolve,sudokuConflict} = await import('../dist/games/logic.js');
const clone = s => JSON.parse(JSON.stringify(s));
function independentCount(input){
 const a=[...input]; let count=0;
 function dfs(){let target=-1,choices=null;for(let i=0;i<81;i++){if(a[i])continue;const r=i/9|0,c=i%9,used=new Set();for(let j=0;j<81;j++)if((j/9|0)===r||j%9===c||((j/27|0)===(i/27|0)&&(j%9/3|0)===(c/3|0)))used.add(a[j]);const opts=range(9).map(n=>n+1).filter(n=>!used.has(n));if(!opts.length)return;if(!choices||opts.length<choices.length){target=i;choices=opts;if(opts.length===1)break;}}
 if(target<0){count++;return;}for(const n of choices){a[target]=n;dfs();a[target]=0;if(count>=2)return;}}
 dfs();return count;
}
const samples=100,times=[],answers=new Set(),masks=new Set();
for(let k=0;k<samples;k++){
 const start=performance.now(),s=sudoku.create();times.push(performance.now()-start);
 const clues=s.given.filter(Boolean).length;assert.ok(clues>=36&&clues<=40);
 assert.equal(independentCount(s.cells),1);assert.equal(sudokuSolve(s.cells).count,1);
 assert.equal(sudokuSolve(s.answer).count,1);assert.ok(s.cells.every((n,i)=>!n||n===s.answer[i]));
 answers.add(s.answer.join(''));masks.add(s.given.map(Number).join(''));
}
assert.equal(answers.size, samples);assert.equal(masks.size, samples);
const s=sudoku.create(),i=s.given.findIndex(g=>!g);assert.equal(sudoku.action(s,'cell',i),false);
const before=clone(s);assert.equal(sudoku.action(s,'notes'),false);assert.equal(sudoku.action(s,'number',3),true);assert.equal(s.cells[i],0);assert.ok(s.notes[i]&(1<<3));
assert.equal(sudoku.action(s,'number',3),true);assert.equal(s.notes[i],0);
sudoku.action(s,'number',2);assert.equal(sudoku.action(s,'number',0),true);assert.equal(s.notes[i],0);
sudoku.action(s,'notes');assert.equal(sudoku.action(s,'number',s.answer[i]),true);assert.equal(s.cells[i],s.answer[i]);assert.equal(sudoku.action(s,'number',0),true);
const fixed=s.given.findIndex(Boolean);sudoku.action(s,'cell',fixed);assert.equal(sudoku.action(s,'number',0),false);
sudoku.action(s,'cell',i);sudoku.action(s,'notes');sudoku.action(s,'number',5);const snapshot=clone(s);assert.equal(sudoku.action(s,'hint'),true);assert.equal(s.cells[i],s.answer[i]);assert.equal(s.notes[i],0);assert.equal(snapshot.cells[i],0);assert.ok(snapshot.notes[i]&(1<<5));
const legacy={cells:[...before.cells],given:[...before.given],answer:[...before.answer],selected:i,message:''};assert.ok(sudoku.view(legacy).includes('Pencil off'));assert.equal(sudoku.action(legacy,'number',legacy.answer[i]),true);assert.ok(Array.isArray(legacy.notes));assert.equal(sudoku.won({...legacy,cells:[...legacy.answer]}),true);
const bad=[...legacy.answer];bad[0]=bad[1];assert.equal(sudokuSolve(bad).count,0);assert.equal(sudokuConflict({cells:bad},0),true);
assert.equal(sudokuSolve(Array(81).fill(0),{budget:1}).count,null);
assert.ok(sudoku.view(s).includes('sudoku-notes')===false);assert.ok(sudoku.view(snapshot).includes('sudoku-notes'));
console.log(JSON.stringify({samples,uniqueAnswers:answers.size,uniqueClueMasks:masks.size,independentUniquenessChecks:samples,generationMs:{median:times.sort((a,b)=>a-b)[50],max:Math.max(...times),total:times.reduce((a,b)=>a+b)},notesEraseHintMigrationFixedCluesUndoSnapshots:'PASS'},null,2));
