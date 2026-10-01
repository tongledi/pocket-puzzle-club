import {shuffle,button,range,grids} from './core.js?v=1.4.0';
const slideWon=s=>s.cells.every((n,i)=>n===(i+1)%16);
const near=(a,b)=>Math.abs(a%4-b%4)+Math.abs((a/4|0)-(b/4|0))===1;
export const sliding={id:'sliding',title:'Sliding Tiles',subtitle:'One space. A little perspective.',tag:'Classic · 4 × 4',rules:'Slide a tile next to the empty space. Arrange 1–15 in order, with the empty space at the bottom right. Every new puzzle is scrambled using legal moves, so it can be solved. Arrow keys move the empty space.',create(){let s={cells:range(16).map(i=>(i+1)%16),trail:[],message:''};let last=-1;for(let i=0;i<90;i++){let z=s.cells.indexOf(0),opts=range(16).filter(j=>near(j,z)&&j!==last),j=opts[Math.random()*opts.length|0];s.trail.push(z);[s.cells[z],s.cells[j]]=[s.cells[j],s.cells[z]];last=z;}return s;},view(s){return grids(s.cells.map((n,i)=>button(n||'','tile',i,`slide-tile ${n?'':'empty'}`,`aria-label="${n?'Move tile '+n:'Empty space'}" ${n?'':'disabled'}`)),4,'sliding-board');},action(s,a,v){if(a==='hint'){if(s.trail.length){v=s.trail.pop();let z=s.cells.indexOf(0);[s.cells[z],s.cells[v]]=[s.cells[v],s.cells[z]];s.message='One step back along your path to the solved board.';return true;}return false;}if(a==='tile'){let z=s.cells.indexOf(0),i=+v;if(s.cells[i]&&near(i,z)){if(s.trail.at(-1)===i)s.trail.pop();else s.trail.push(z);[s.cells[z],s.cells[i]]=[s.cells[i],s.cells[z]];s.message='';return true;}s.message='Choose a tile beside the empty space.';}return false;},won:slideWon};
const dirs=[[0,-1,'↑'],[1,0,'→'],[0,1,'↓'],[-1,0,'←']];
export function arrowFree(s,i,d=s.cells[i]){if(d==null)return false;let [dx,dy]=dirs[d],x=i%6+dx,y=(i/6|0)+dy;while(x>=0&&x<6&&y>=0&&y<6){if(s.cells[y*6+x]!=null)return false;x+=dx;y+=dy;}return true;}
export const arrows={id:'arrows',title:'Arrow Escape',subtitle:'Find a clear way out.',tag:'Modern · Clear the board',rules:'Tap an arrow only when its path to the edge is clear. Arrows travel in the direction they point; any other arrow in that row or column blocks the exit. Remove them all. Each starting board has a solution.',create(){let s={cells:Array(36).fill(null),message:''};for(const i of shuffle(range(36))){let ds=range(4).filter(d=>arrowFree({...s,cells:s.cells.map((x,j)=>j===i?d:x)},i,d));if(ds.length)s.cells[i]=ds[Math.random()*ds.length|0];}return s;},view(s){return grids(s.cells.map((d,i)=>button(d==null?'':dirs[d][2],'arrow',i,`arrow-tile ${d==null?'empty':''} ${s.hint===i?'hinted':''} ${s.blocked?.includes(i)?'blocking-arrow':''}`,`aria-label="${d==null?'Empty': ['Up','Right','Down','Left'][d]+' arrow, row '+((i/6|0)+1)+', column '+(i%6+1)}" ${d==null?'disabled':''}`)),6,'arrow-board');},action(s,a,v){if(a==='hint'){s.blocked=[];let i=s.cells.findIndex((d,i)=>d!=null&&arrowFree(s,i));s.hint=i;s.message=i>=0?'The highlighted arrow has a clear exit.':'Board cleared.';return false;}if(a==='arrow'&&s.cells[+v]!=null){if(arrowFree(s,+v)){s.cells[+v]=null;s.hint=null;s.blocked=[];s.message='Clear path!';return true;}let i=+v,[dx,dy]=dirs[s.cells[i]],x=i%6+dx,y=(i/6|0)+dy;s.blocked=[i];while(x>=0&&x<6&&y>=0&&y<6){if(s.cells[y*6+x]!=null){s.blocked.push(y*6+x);break;}x+=dx;y+=dy;}s.message='The two marked arrows show the blockage. Clear the arrow ahead first.';}return false;},won:s=>s.cells.every(x=>x==null)};
// Replace the old base/solution/sudokuConflict/sudoku block in games/logic.js.
// Uses existing imports: shuffle, button, range, grids.
const SUDOKU_ALL = 0x3fe;
const sudokuBox = i => ((i / 27) | 0) * 3 + ((i % 9) / 3 | 0);
const sudokuPeer = (i, j) => (i / 9 | 0) === (j / 9 | 0) || i % 9 === j % 9 || sudokuBox(i) === sudokuBox(j);
const sudokuBits = mask => { const out = []; for (let n = 1; n <= 9; n++) if (mask & (1 << n)) out.push(n); return out; };
// A null count means the work cap was reached: never accept it as unique.
export function sudokuSolve(input, {random = false, limit = 2, budget = 60000} = {}) {
  const cells = [...input], rows = Array(9).fill(0), cols = Array(9).fill(0), boxes = Array(9).fill(0);
  let count = 0, answer = null, nodes = 0, exhausted = false;
  for (let i = 0; i < 81; i++) {
    const n = cells[i]; if (!n) continue;
    const r = i / 9 | 0, c = i % 9, b = sudokuBox(i), bit = 1 << n;
    if (!Number.isInteger(n) || n < 1 || n > 9 || (rows[r] | cols[c] | boxes[b]) & bit) return {count: 0, answer: null};
    rows[r] |= bit; cols[c] |= bit; boxes[b] |= bit;
  }
  function search() {
    if (count >= limit || exhausted) return;
    if (++nodes > budget) { exhausted = true; return; }
    let best = -1, options = [], min = 10;
    for (let i = 0; i < 81; i++) if (!cells[i]) {
      const choices = sudokuBits(SUDOKU_ALL & ~(rows[i / 9 | 0] | cols[i % 9] | boxes[sudokuBox(i)]));
      if (!choices.length) return;
      if (choices.length < min) { best = i; options = choices; min = choices.length; if (min === 1) break; }
    }
    if (best < 0) { count++; if (!answer) answer = [...cells]; return; }
    if (random) shuffle(options);
    const r = best / 9 | 0, c = best % 9, b = sudokuBox(best);
    for (const n of options) {
      const bit = 1 << n; cells[best] = n; rows[r] |= bit; cols[c] |= bit; boxes[b] |= bit;
      search();
      cells[best] = 0; rows[r] &= ~bit; cols[c] &= ~bit; boxes[b] &= ~bit;
      if (count >= limit || exhausted) break;
    }
  }
  search(); return {count: exhausted ? null : count, answer};
}
function sudokuPuzzle() {
  for (let attempt = 0; attempt < 3; attempt++) {
    const answer = sudokuSolve(Array(81).fill(0), {random: true, limit: 1}).answer;
    if (!answer) continue;
    const cells = [...answer], target = 36 + (Math.random() * 5 | 0); let clues = 81;
    for (const i of shuffle(range(81))) {
      const n = cells[i]; cells[i] = 0;
      if (sudokuSolve(cells).count === 1) clues--; else cells[i] = n;
      if (clues === target) break;
    }
    if (clues <= 40) return {cells, answer};
  }
  // Extremely rare bounded fallback: symmetries of a known unique puzzle,
  // plus extra solved clues. Normal games use the random backtracking route.
  const seed = '530070000600195000098000060800060003400803001700020006060000280000419005000080079';
  const solved = '534678912672195348198342567859761423426853791713924856961537284287419635345286179';
  const digits = shuffle(range(9).map(n => n + 1));
  const order = () => shuffle([0,1,2]).flatMap(b => shuffle([0,1,2]).map(n => b * 3 + n));
  const rows = order(), cols = order(), transpose = Math.random() < .5;
  const indices = range(81).map(i => transpose ? cols[i % 9] * 9 + rows[i / 9 | 0] : rows[i / 9 | 0] * 9 + cols[i % 9]);
  const cells = indices.map(i => seed[i] === '0' ? 0 : digits[+seed[i] - 1]), answer = indices.map(i => digits[+solved[i] - 1]);
  let clues = cells.filter(Boolean).length;
  for (const i of shuffle(range(81))) if (!cells[i] && clues < 38) { cells[i] = answer[i]; clues++; }
  return {cells, answer};
}
export function sudokuConflict(s, i) { return !!s.cells[i] && s.cells.some((n, j) => j !== i && n === s.cells[i] && sudokuPeer(i, j)); }
function sudokuClearPeerNotes(s, i, n) { if (s.notes) s.notes = s.notes.map((mask, j) => sudokuPeer(i, j) ? mask & ~(1 << n) : mask); }
export const sudoku = {
  id: 'sudoku', title: 'Sudoku', subtitle: 'Give every number its place.', tag: 'Classic · Gentle',
  rules: 'Fill each row, column and 3 × 3 box with 1–9 exactly once. Every new puzzle has one solution and 36–40 clues. Select a cell, then a number. Pencil lets you toggle small notes in empty cells. Erase clears a cell or its notes. Matching numbers and peers are highlighted; counts show how many of each number remain. Red outlines show duplicates, not every wrong answer. Hint fills one cell. Undo also restores notes.',
  create() { const {cells, answer} = sudokuPuzzle(); return {generatorVersion:2,cells, answer, given: cells.map(Boolean), selected: -1, notes: Array(81).fill(0), notesMode: false, message: ''}; },
  view(s) {
    const selectedNumber = s.cells[s.selected] || 0, counts = range(10).map(n => s.cells.filter(v => v === n).length);
    return (s.generatorVersion!==2?'<p class="saved-layout-note">Resuming your saved puzzle. Choose New game for a freshly generated Sudoku.</p>':'')+grids(s.cells.map((n, i) => {
      const notes = sudokuBits(s.notes?.[i] || 0);
      const content = n || (notes.length ? `<span class="sudoku-notes" aria-hidden="true">${range(9).map(k => `<span>${notes.includes(k + 1) ? k + 1 : ''}</span>`).join('')}</span>` : '');
      return button(content, 'cell', i, `sudoku-cell ${s.given[i] ? 'given' : ''} ${s.selected === i ? 'selected' : ''} ${s.selected >= 0 && s.selected !== i && sudokuPeer(s.selected, i) ? 'peer' : ''} ${selectedNumber && n === selectedNumber ? 'matching-number' : ''} ${sudokuConflict(s, i) ? 'conflict' : ''} ${i % 9 === 2 || i % 9 === 5 ? 'box-right' : ''} ${(i / 9 | 0) === 2 || (i / 9 | 0) === 5 ? 'box-bottom' : ''}`, `aria-pressed="${s.selected === i}" aria-label="Row ${1 + (i / 9 | 0)}, column ${1 + i % 9}, ${n || (notes.length ? 'notes ' + notes.join(', ') : 'empty')}${s.given[i] ? ', fixed' : ''}"`);
    }), 9, 'sudoku-board') + `<div class="sudoku-tools">${button(s.notesMode ? '✎ Pencil on' : '✎ Pencil off', 'notes', '', `pencil-toggle ${s.notesMode ? 'active' : ''}`, `aria-pressed="${!!s.notesMode}"`)}</div><div class="number-pad">${range(9).map(k => button(`<span>${k + 1}</span><small>${Math.max(0, 9 - counts[k + 1])} left</small>`, 'number', k + 1, counts[k + 1] >= 9 ? 'number-complete' : '', `aria-label="${k + 1}, ${Math.max(0, 9 - counts[k + 1])} remaining"`)).join('')}${button('Erase', 'number', 0, 'erase')}</div>`;
  },
  action(s, a, v) {
    if (a === 'notes') { s.notesMode = !s.notesMode; s.message = s.notesMode ? 'Pencil mode: choose an empty cell and toggle possible numbers.' : 'Number mode: enter your answer.'; return false; }
    if (a === 'cell') { const i = +v; if (!Number.isInteger(i) || i < 0 || i > 80) return false; s.selected = i; s.message = s.given[i] ? 'This is a fixed clue. Choose an empty cell.' : ''; return false; }
    if (a === 'hint') {
      const i = s.selected >= 0 && !s.given[s.selected] && s.cells[s.selected] !== s.answer[s.selected] ? s.selected : s.cells.findIndex((n, j) => n !== s.answer[j]);
      if (i < 0) return false;
      s.notes ||= Array(81).fill(0); s.cells[i] = s.answer[i]; s.notes[i] = 0; sudokuClearPeerNotes(s, i, s.answer[i]); s.selected = i; s.message = 'A number revealed. Look at its row, column and box.'; return true;
    }
    if (a !== 'number') return false;
    const i = s.selected, n = +v;
    if (!Number.isInteger(i) || i < 0 || i > 80 || s.given[i] || !Number.isInteger(n) || n < 0 || n > 9) return false;
    s.notes ||= Array(81).fill(0);
    if (n === 0) { if (!s.cells[i] && !s.notes[i]) return false; s.cells[i] = 0; s.notes[i] = 0; s.message = ''; return true; }
    if (s.notesMode) { if (s.cells[i]) { s.message = 'Erase this answer before adding pencil notes.'; return false; } s.notes[i] ^= 1 << n; s.message = 'Pencil notes updated.'; return true; }
    if (s.cells[i] === n) return false;
    s.cells[i] = n; s.notes[i] = 0; sudokuClearPeerNotes(s, i, n); s.message = sudokuConflict(s, i) ? 'That number conflicts with this row, column or box.' : ''; return true;
  },
  won: s => s.cells.every((n, i) => n === s.answer[i])
};

const wordSets=[['GARDEN','BREEZE','BLOOM','FERN','LEAF','ROSE'],['TRAVEL','COAST','TRAIN','ISLAND','TRAIL','MAP'],['COFFEE','BREAD','LEMON','OLIVE','PEAR','MINT'],['MUSIC','PIANO','MELODY','JAZZ','FLUTE','SONG'],['OCEAN','WAVES','SHELL','CORAL','SAND','TIDE'],['FOREST','ACORN','MAPLE','BIRCH','MOSS','PINE'],['BAKING','FLOUR','SUGAR','HONEY','CAKE','OVEN'],['BOOKS','NOVEL','STORY','PAGES','POEM','READ'],['SUMMER','SUNNY','PICNIC','BEACH','PEACH','PARK'],['WINTER','SNOW','SCARF','COCOA','SKATE','FROST'],['COLOUR','AMBER','GREEN','BLUE','PINK','GOLD'],['FAMILY','HOME','SMILE','KIND','LAUGH','HUG']];
export const words={id:'words',title:'Word Search',subtitle:'A small discovery in every line.',tag:'Words · Six to find',rules:'Find the listed English words. Tap the first letter, then the last letter. Words can go horizontally, vertically or diagonally, forwards or backwards. Hint highlights the first letter of a word you have not found.',create(){const list=wordSets[Math.random()*wordSets.length|0],cells=Array(100).fill(''),paths=[];for(let word of list){let placed=false;for(let attempt=0;attempt<1000&&!placed;attempt++){let [dx,dy]=shuffle([[1,0],[0,1],[1,1],[-1,1],[-1,0],[0,-1],[-1,-1],[1,-1]])[0],x=Math.random()*10|0,y=Math.random()*10|0,p=range(word.length).map(i=>[x+i*dx,y+i*dy]);if(p.every(([x,y],i)=>x>=0&&x<10&&y>=0&&y<10&&(!cells[y*10+x]||cells[y*10+x]===word[i]))){let ids=p.map(([x,y])=>y*10+x);ids.forEach((i,j)=>cells[i]=word[j]);paths.push(ids);placed=true;}}if(!placed)return this.create();}return {cells:cells.map(c=>c||'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.random()*26|0]),list,paths,found:[],selected:null,message:''};},view(s){let found=new Set(s.found.flatMap(i=>s.paths[i]));return grids(s.cells.map((c,i)=>button(c,'letter',i,`letter ${found.has(i)?'found':''} ${s.selected===i?'selected':''} ${s.hint===i?'hinted':''} ${s.blocked?.includes(i)?'blocking-arrow':''}`,`aria-label="${c}, row ${1+(i/10|0)}, column ${i%10+1}"`)),10,'word-board')+`<div class="word-progress">${s.found.length} of ${s.list.length} words found</div><div class="word-list">${s.list.map((w,i)=>`<span class="${s.found.includes(i)?'found-word':''}">${w}</span>`).join('')}</div>`;},action(s,a,v){if(a==='hint'){s.selected=null;let i=s.list.findIndex((_,i)=>!s.found.includes(i));s.hint=s.paths[i]?.[0];s.message='Start at the highlighted letter.';return false;}if(a==='letter'){let n=+v;if(s.selected==null){s.selected=n;s.message='Now tap the last letter.';return false;}let start=s.selected,dx=Math.sign(n%10-start%10),dy=Math.sign((n/10|0)-(start/10|0)),xx=Math.abs(n%10-start%10),yy=Math.abs((n/10|0)-(start/10|0));s.selected=null;if(xx&&yy&&xx!==yy){s.message='Choose a straight line of letters.';return false;}let path=range(Math.max(xx,yy)+1).map(i=>start+i*dx+i*dy*10),str=path.map(i=>s.cells[i]).join(''),ix=s.list.findIndex((w,i)=>!s.found.includes(i)&&(w===str||w===[...str].reverse().join('')));if(ix>=0){s.found.push(ix);s.paths[ix]=path;s.hint=null;s.message=`${s.list[ix]} found!`;return true;}s.message='Not one of the listed words. Try another line.';}return false;},won:s=>s.found.length===s.list.length};
export const games=[sliding,arrows,sudoku,words];
