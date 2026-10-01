import {levelPacks} from './levels.js?v=1.11.2';
import {shuffle,button,range,grids,clone} from './core.js?v=1.11.2';
export const waterColors=['#de6557','#477ace','#edbd43','#7760a9','#299a84'];
const waterNames=['Coral','Blue','Gold','Violet','Jade'];
const waterSymbols=['●','◆','★','✿','▲'];
const tubeComplete=t=>t.length===4&&t.every(c=>c===t[0]);
export const waterWon=s=>s.tubes.every(t=>!t.length||tubeComplete(t));
// This pure plan is the single source for legal pours and effects.
export function waterPourPlan(s,a,b){
  const from=s.tubes[a],to=s.tubes[b];
  if(!Number.isInteger(a)||!Number.isInteger(b)||a===b||!from?.length||!to||to.length>=4||to.length&&to.at(-1)!==from.at(-1))return null;
  const color=from.at(-1);let count=0;
  while(count<from.length&&from[from.length-1-count]===color)count++;
  return {from:a,to:b,color,count:Math.min(count,4-to.length)};
}
export function pour(s,a,b){const p=waterPourPlan(s,a,b);if(!p)return false;s.tubes[b].push(...s.tubes[a].splice(-p.count));s.selected=null;s.hintTarget=null;return true;}
function waterOptions(s){let out=[];for(let a=0;a<s.tubes.length;a++)for(let b=0;b<s.tubes.length;b++){const p=waterPourPlan(s,a,b);if(p&&!(s.tubes[a].every(c=>c===s.tubes[a][0])&&!s.tubes[b].length))out.push(p);}return out;}
function savedWaterRoute(s){
  if(!Array.isArray(s.path)||!s.path.length)return null;
  const copy={tubes:s.tubes.map(t=>t.slice())};
  for(const pair of s.path)if(!Array.isArray(pair)||pair.length!==2||!pour(copy,...pair))return null;
  return waterWon(copy)?s.path.map(p=>p.slice()):null;
}
// Symmetric empty/uniform-tube moves add no new position. A capped search must
// distinguish "not solved yet" from proof that no route exists.
export function waterSolve(s,{maxNodes=10000,maxMs=100,maxDepth=128}={}){
  const started=Date.now(),seen=new Set();let nodes=0,limited=false;
  function visit(tubes,depth=0){
    if(waterWon({tubes}))return [];
    if(depth>=maxDepth||++nodes>maxNodes||Date.now()-started>maxMs){limited=true;return null;}
    const key=tubes.map(t=>t.join('')).sort().join('|');if(seen.has(key))return null;seen.add(key);
    const options=waterOptions({tubes}).sort((a,b)=>(Number(!!tubes[b.to].length)*8+b.count)-(Number(!!tubes[a.to].length)*8+a.count));
    for(const p of options){const copy={tubes:tubes.map(t=>t.slice())};pour(copy,p.from,p.to);const rest=visit(copy.tubes,depth+1);if(rest)return [[p.from,p.to],...rest];if(limited)return null;}
    return null;
  }
  const path=visit(s.tubes);return {status:path?'solved':limited?'limit':'blocked',path,nodes};
}
export const water={
  levels:levelPacks.water,
  id:'water',title:'Water Sort',subtitle:'A satisfying splash of order.',tag:'Modern · Sort the colours',
  rules:'Tap a tube, then a destination to pour its top matching drops. The top colour can pour only onto the same colour or into an empty tube, up to four drops per tube. Fill one tube per colour, leaving two empty. Starter levels have three, four and five colours; free play uses five. Every starting puzzle has a legal solution. Hints verify a full route when possible and say when the search is inconclusive. Tap a selected tube again to cancel. Symbols help distinguish the colours.',
  create(){
    let s={tubes:range(5).map(c=>[c,c,c,c]).concat([[],[]]),selected:null,message:'',path:[]};
    // Each reverse step moves one drop onto a different colour or empty tube,
    // leaving the same colour below. Unwinding is exactly one legal full pour.
    for(let k=0;k<65;k++){let options=[];for(let a=0;a<7;a++)for(let b=0;b<7;b++){let from=s.tubes[a],to=s.tubes[b];if(a!==b&&from.length&&to.length<4&&(to.length===0||to.at(-1)!==from.at(-1))&&(from.length===1||from.at(-2)===from.at(-1)))options.push([a,b]);}if(!options.length)break;let [a,b]=options[Math.random()*options.length|0];s.tubes[b].push(s.tubes[a].pop());s.path.unshift([b,a]);}return s;
  },
  view(s){
    const selected=Number.isInteger(s.selected)&&s.tubes[s.selected]?.length?s.selected:null,complete=s.tubes.filter(tubeComplete).length;
    return `<div class="puzzle-goal"><strong>${complete} / ${s.colorCount||5} colours sorted</strong><span>One colour per full tube</span></div><div class="tubes">${s.tubes.map((t,i)=>{
      const plan=selected==null||s.hintTarget!==i?null:waterPourPlan(s,selected,i),chosen=selected===i,done=tubeComplete(t),status=chosen?'Selected':done?'✓ Sorted':'';
      return button(`<span class="tube-glass">${range(4).reverse().map(n=>`<span class="drop ${t[n]==null?'air':''}" style="--liquid:${waterColors[t[n]]||'transparent'}">${t[n]==null?'':waterSymbols[t[n]]}</span>`).join('')}</span><span class="tube-label">${i+1}<small>${status||'&nbsp;'}</small></span>`,'tube',i,`tube ${chosen?'selected':''}  ${done?'sorted-tube':''} ${s.hintTarget===i&&plan?'hint-destination':''}`,`aria-pressed="${chosen}" aria-label="Tube ${i+1}: ${t.length?t.map(c=>waterNames[c]).join(', ')+' from bottom to top':'empty'}${chosen?', selected':plan?`, pour ${plan.count} ${waterNames[plan.color]} drops here`:done?', sorted':''}"`);
    }).join('')}</div>`;
  },
  action(s,a,v){
    if(a==='hint'){
      s.selected=null;s.hintTarget=null;
      if(waterWon(s)){s.message=`All ${s.colorCount||5} colours sorted!`;return false;}
      const saved=savedWaterRoute(s),result=saved?{status:'solved',path:saved}:waterSolve(s);
      if(result.status==='solved'){
        s.path=result.path;const [from,to]=s.path[0];s.selected=from;s.hintTarget=to;s.message=`Pour tube ${from+1} into tube ${to+1}. This starts a verified route to finish.`;
      }else if(result.status==='blocked')s.message='This position has no complete solution. Undo one or more pours, or restart this puzzle.';
      else {const p=waterOptions(s)[0];if(p){s.selected=p.from;s.hintTarget=p.to;s.message=`A legal move: tube ${p.from+1} into tube ${p.to+1}. The search could not verify a full solution; you may need Undo.`;}else s.message='No useful pour found. Try Undo or restart this puzzle.';}
      return false;
    }
    if(a==='tube'){
      const i=v===''?NaN:+v;if(!Number.isInteger(i)||i<0||i>=s.tubes.length)return false;
      if(!Number.isInteger(s.selected)||!s.tubes[s.selected]?.length)s.selected=null;
      if(s.selected==null){
        if(s.tubes[i].length)s.selected=i;s.hintTarget=null;
        s.message=s.tubes[i].length?`Tube ${i+1} selected. Choose a destination, or tap again to cancel.`:'Choose a tube with water first.';return false;
      }
      if(s.selected===i){s.selected=null;s.hintTarget=null;s.message='Selection cleared. Choose a tube to pour from.';return false;}
      const from=s.selected,plan=waterPourPlan(s,from,i);
      if(plan&&pour(s,from,i)){
        if(s.path?.[0]?.[0]===from&&s.path[0][1]===i)s.path.shift();else s.path=[];
        s.message=`Poured ${plan.count} ${waterNames[plan.color]} ${plan.count===1?'drop':'drops'} from tube ${from+1} into tube ${i+1}.${tubeComplete(s.tubes[i])?' A colour sorted!':''}${!waterWon(s)&&!waterOptions(s).length?' No useful pours remain. Undo or restart.':''}`;return true;
      }
      s.message=s.tubes[i].length===4?`Tube ${i+1} is full. Tube ${from+1} is still selected.`:`The top colours do not match. Tube ${from+1} is still selected.`;return false;
    }
    return false;
  },
  motion(s,a,v){const p=a==='tube'?waterPourPlan(s,s.selected,v===''?NaN:+v):null;return p?{game:'water',kind:'water-pour',...p,fromLength:s.tubes[p.from].length,toLength:s.tubes[p.to].length,colorValue:waterColors[p.color]}:null;},
  won:waterWon
};
const shapes=[[[0,0]],[[0,0],[1,0]],[[0,0],[1,0],[2,0]],[[0,0],[0,1],[0,2]],[[0,0],[1,0],[0,1],[1,1]],[[0,0],[0,1],[1,1]],[[0,0],[1,0],[2,0],[1,1]],[[0,0],[1,0],[2,0],[3,0]],[[0,0],[0,1],[0,2],[1,2]]];
const pieces=()=>range(3).map(()=>clone(shapes[Math.random()*shapes.length|0]));
export function canPlace(s,p,i){return Number.isInteger(i)&&i>=0&&i<64&&Array.isArray(p)&&p.length>0&&p.every(([x,y])=>i%8+x<8&&(i/8|0)+y<8&&!s.cells[i+y*8+x]);}
export function blockOver(s){return !s.pieces.some(p=>p&&range(64).some(i=>canPlace(s,p,i)));}
// A read-only placement plan is shared by previews, commits and transient effects.
// It is never stored in a save or used to finish a move asynchronously.
export function blockPlacement(s,p,i){
  if(!canPlace(s,p,i))return null;
  const placed=p.map(([x,y])=>i+y*8+x),occupied=s.cells.map((v,j)=>v||placed.includes(j));
  const rows=range(8).filter(y=>range(8).every(x=>occupied[y*8+x])),cols=range(8).filter(x=>range(8).every(y=>occupied[y*8+x]));
  const cleared=range(64).filter(j=>rows.includes(j/8|0)||cols.includes(j%8));
  return {placed,cleared,lines:rows.length+cols.length,points:p.length+(rows.length+cols.length)*10};
}
export const blocks={
  id:'blocks',title:'Block Garden',subtitle:'Make room for the next good move.',tag:'Modern · High score',
  rules:'Drag a block onto the board and release to place it. Or select a block, tap a board cell to preview its top-left corner, then tap Place block. With a keyboard, Tab between buttons and press Enter or Space. The whole shape is shown before you commit; gold outlines mark rows and columns that will clear. Complete rows or columns to clear them. Use all three blocks to get a fresh set. Blocks do not rotate. The game ends when none of your remaining blocks fits; Undo lets you try a different choice. Aim for your best score.',
  create(){return {cells:Array(64).fill(0),pieces:pieces(),selected:0,score:0,lines:0,message:''};},
  view(s){
    const piece=s.pieces[s.selected],anchor=s.anchor,plan=blockPlacement(s,piece,anchor),valid=!!plan,cleared=new Set(plan?.cleared||[]);
    const ghost=new Set(Number.isInteger(anchor)&&piece?piece.filter(([x,y])=>anchor%8+x<8&&(anchor/8|0)+y<8).map(([x,y])=>anchor+y*8+x).filter(i=>i>=0&&i<64):[]);
    return '<p class="board-instruction">Drag a block onto the board · Or select, preview, place</p>'+grids(s.cells.map((v,i)=>button(anchor===i?'•':'','preview',i,`block-cell ${v?'filled':''} ${ghost.has(i)?valid?'ghost-valid':'ghost-invalid':''} ${cleared.has(i)?'clear-preview':''}`,`aria-label="Row ${(i/8|0)+1}, column ${i%8+1}, ${v?'filled':'empty'}${cleared.has(i)?', will clear':''}"`)),8,'block-board')+
      `<div class="piece-tray">${s.pieces.map((p,i)=>{
        if(!p)return '<span class="used-piece" aria-label="Block used">✓</span>';
        const fits=range(64).some(j=>canPlace(s,p,j));
        return button(`<span class="piece-grid" style="--pw:${Math.max(...p.map(x=>x[0]))+1};--ph:${Math.max(...p.map(x=>x[1]))+1}">${p.map(([x,y])=>`<i style="grid-column:${x+1};grid-row:${y+1}"></i>`).join('')}</span>${fits?'':'<small class="piece-no-space">No space</small>'}`,'piece',i,`block-piece ${s.selected===i?'selected':''} ${fits?'':'no-space'}`,`aria-pressed="${s.selected===i}" aria-label="Select block ${i+1}, ${p.length} squares${fits?'':', no space yet'}"`);
      }).join('')}</div><div class="placement-controls">${button('Place block','place',Number.isInteger(anchor)?anchor:'','primary',valid?'':'disabled')}<span class="placement-summary">${plan?`+${plan.points} points${plan.lines?` · ${plan.lines} ${plan.lines===1?'line':'lines'}`:''}`:'Preview before placing'}</span></div><div class="game-extra"><strong class="score-current">${s.score}</strong> points · ${s.lines} lines cleared · Best ${s.best||0}</div>`;
  },
  action(s,a,v){
    if(a==='piece'){
      const i=+v;if(!Number.isInteger(i)||!s.pieces[i])return false;
      s.selected=i;s.anchor=null;s.message=range(64).some(j=>canPlace(s,s.pieces[i],j))?'Tap the board to preview a position.':'This block has no space yet. Place another block to clear room, or use Undo.';return false;
    }
    if(a==='preview'){
      const i=+v;if(v===''||!Number.isInteger(i)||i<0||i>63)return false;
      s.anchor=i;const plan=blockPlacement(s,s.pieces[s.selected],i);
      s.message=plan?plan.lines?`This clears ${plan.lines} ${plan.lines===1?'line':'lines'} for ${plan.points} points. Tap Place block.`:'This fits. Tap Place block to commit.':'This overlaps or goes off the board. Choose another spot.';return false;
    }
    if(a==='hint'){
      for(let j=0;j<3;j++)for(let i=0;i<64;i++)if(canPlace(s,s.pieces[j],i)){s.selected=j;s.anchor=i;s.message=`Block ${j+1} fits at row ${(i/8|0)+1}, column ${i%8+1}.`;return false;}
      s.message='No remaining blocks fit. Undo to try another choice, or play again.';return false;
    }
    if(a==='place'){
      const i=v===''?NaN:+v,p=s.pieces[s.selected],plan=blockPlacement(s,p,i);
      if(!plan){s.message=p?'That block will not fit there. Its top-left square goes where you tap.':'Select a remaining block first.';return false;}
      plan.placed.forEach(j=>s.cells[j]=1);plan.cleared.forEach(j=>s.cells[j]=0);
      s.score+=plan.points;s.lines+=plan.lines;s.pieces[s.selected]=null;
      const refill=s.pieces.every(p=>!p);if(refill)s.pieces=pieces();
      const fitting=s.pieces.findIndex(p=>p&&range(64).some(j=>canPlace(s,p,j)));
      s.selected=fitting>=0?fitting:s.pieces.findIndex(Boolean);s.anchor=null;
      s.message=`+${plan.points} points${plan.lines?` · ${plan.lines} ${plan.lines===1?'line':'lines'} cleared!`:'.'}${refill?' Three fresh blocks are ready.':''}${blockOver(s)?' No blocks fit. Undo or play again.':''}`;
      return true;
    }
    return false;
  },
  motion(s,action,value){
    return action==='drag'?blockPlacement(s,s.pieces[value.piece],value.anchor):action==='place'?blockPlacement(s,s.pieces[s.selected],value===''?NaN:+value):null;
  },
  won:()=>false,ended:blockOver
};
export const games=[water,blocks];
