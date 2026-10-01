import {shuffle,button,range,clone} from './core.js?v=1.5.2';
const suits=['♠','♥','♣','♦'];
const red=c=>c.suit%2===1;
const face=c=>`${['','A','2','3','4','5','6','7','8','9','10','J','Q','K'][c.rank]}${suits[c.suit]}`;
const ranks=['','A','2','3','4','5','6','7','8','9','10','J','Q','K'];
const pipPositions={1:[[50,50]],2:[[50,24],[50,76]],3:[[50,24],[50,50],[50,76]],4:[[28,24],[72,24],[28,76],[72,76]],5:[[28,24],[72,24],[50,50],[28,76],[72,76]],6:[[28,22],[72,22],[28,50],[72,50],[28,78],[72,78]],7:[[28,22],[72,22],[50,36],[28,50],[72,50],[28,78],[72,78]],8:[[28,22],[72,22],[50,36],[28,50],[72,50],[50,64],[28,78],[72,78]],9:[[28,19],[72,19],[28,39],[72,39],[50,50],[28,61],[72,61],[28,81],[72,81]],10:[[28,19],[72,19],[50,29],[28,39],[72,39],[28,61],[72,61],[50,71],[28,81],[72,81]]};
function card(c,a,v,cls=''){
  const corner=`<span class="card-corner"><strong>${ranks[c.rank]}</strong><i>${suits[c.suit]}</i></span>`;
  const middle=c.rank>10?`<span class="card-court"><em>${ranks[c.rank]}</em><i>${suits[c.suit]}</i></span>`:`<span class="card-pips ${c.rank===1?'ace-pip':''}">${pipPositions[c.rank].map(([x,y])=>`<i style="left:${x}%;top:${y}%"${y>50?' class="inverted"':''}>${suits[c.suit]}</i>`).join('')}</span>`;
  return button(c.up?`${corner}${middle}<span class="card-corner corner-bottom"><strong>${ranks[c.rank]}</strong><i>${suits[c.suit]}</i></span>`:'<span class="card-back-emblem" aria-hidden="true">♠</span>',a,v,`playing-card ${c.up?'':'back'} ${red(c)?'red':''} ${cls}`,`data-card-id="${c.suit}-${c.rank}" data-face="${c.up?'up':'down'}" aria-label="${a==='stock'?'Draw card from stock':c.up?face(c):'Face-down card'}"`);
}
function origin(s,sel){if(!sel)return null;let [kind,p,i]=sel.split(':');return kind==='w'?{pile:s.waste,index:s.waste.length-1}:kind==='f'?{pile:s.foundation[+p],index:s.foundation[+p].length-1}:kind==='t'?{pile:s.tableau[+p],index:+i}:null;}
function sequence(cs){return cs.every((c,i)=>c.up&&(!i||cs[i-1].rank===c.rank+1&&red(cs[i-1])!==red(c)));}
export function solitaireMove(s,from,to){let o=origin(s,from);if(!o||!o.pile||o.index<0||o.index>=o.pile.length)return false;let cards=o.pile.slice(o.index);if(!sequence(cards))return false;let [k,p]=to.split(':'),dest=k==='f'?s.foundation[+p]:k==='t'?s.tableau[+p]:null;if(!dest||dest===o.pile)return false;let last=dest.at(-1),c=cards[0];if(k==='f'){if(cards.length!==1||c.suit!==+p||c.rank!==(last?last.rank+1:1))return false;}else if(last?(!last.up||last.rank!==c.rank+1||red(last)===red(c)):c.rank!==13)return false;dest.push(...o.pile.splice(o.index));if(o.pile.length)o.pile.at(-1).up=true;s.selected=null;s.hintTarget=null;s.lastMove={from,to};return true;}
function availableMoves(s){let sources=[];if(s.waste.length)sources.push('w');s.tableau.forEach((p,j)=>p.forEach((c,i)=>{if(c.up)sources.push(`t:${j}:${i}`);}));s.foundation.forEach((p,j)=>{if(p.length)sources.push(`f:${j}`);});let out=[];for(let from of sources)for(let kind of ['f','t'])for(let j=0;j<(kind==='f'?4:7);j++){let copy=clone(s);if(solitaireMove(copy,from,`${kind}:${j}`))out.push([from,`${kind}:${j}`]);}return out;}
export const solitaire={id:'solitaire',title:'Solitaire',subtitle:'The familiar comfort of a fresh deal.',tag:'Classic · Draw one',rules:'Build the four foundations from Ace to King, by suit. On the seven columns, stack cards in descending order with alternating colours. Only a King can fill an empty column. Drag a face-up card or sequence to its destination, or tap the card then its destination. With a keyboard, Tab between buttons and press Enter or Space. Tap the stock to draw one card; recycle it when empty. Select a card and use Send to foundation for a quick legal foundation move. Larger cards in How to play offers a scrollable board. Random deals may be unwinnable.',create(){let deck=shuffle(range(52).map(i=>({rank:i%13+1,suit:i/13|0,up:false}))),tableau=[];for(let i=0;i<7;i++){tableau.push(deck.splice(0,i+1));tableau[i].at(-1).up=true;}return {tableau,stock:deck,waste:[],foundation:[[],[],[],[]],selected:null,message:''};},view(s){return `<div class="solitaire-scroll" tabindex="0" aria-label="Solitaire table${s.large?', larger cards. Scroll sideways to see all columns.':''}"><div class="solitaire-board ${s.large?'large-cards':''}"><div class="card-top"><div class="stock-pile">${s.stock.length?card(s.stock.at(-1),'stock','','stock-card'):button('<span class="recycle-mark">↻</span>','stock','','card-slot stock-empty',`aria-label="Recycle waste" ${s.waste.length?'':'disabled'}`)}<small>${s.stock.length?`${s.stock.length} cards`:'Recycle'}</small></div><div class="waste-pile">${s.waste.length?card(s.waste.at(-1),'select','w',s.selected==='w'?'selected':''):'<div class="card-slot waste-slot" aria-label="Waste pile empty"></div>'}<small>Draw one</small></div><div class="card-gap"></div>${s.foundation.map((p,i)=>`<div class="foundation-pile">${p.length?card(p.at(-1),'foundation',i,s.selected===`f:${i}`?'selected':s.hintTarget===`f:${i}`?'hinted':''):button(`<span>${suits[i]}</span><small>A</small>`,'foundation',i,`card-slot foundation-slot ${s.hintTarget===`f:${i}`?'hinted':''}`,`aria-label="${suits[i]} foundation, empty"`)}<small>${p.length===13?'Complete':'Ace to King'}</small></div>`).join('')}</div><div class="tableau">${s.tableau.map((p,j)=>`<div class="card-column ${s.hintTarget===`t:${j}`?'hinted':''}" style="--pile-count:${Math.max(0,p.length-1)}">${button('<span>K</span>','column',j,'card-slot',`aria-label="Column ${j+1}"`)}${p.map((c,i)=>`<div class="stack-card" style="--card-index:${i}">${card(c,'select',`t:${j}:${i}`,s.selected===`t:${j}:${i}`?'selected':'')}</div>`).join('')}</div>`).join('')}</div></div></div>`;},action(s,a,v){if(['stock','select','foundation','column'].includes(a))s.hintTarget=null;if(a==='zoom'){s.large=!s.large;return false;}if(a==='auto'){if(s.selected){for(let j=0;j<4;j++)if(solitaireMove(s,s.selected,`f:${j}`)){s.message='Moved to the foundation.';return true;}s.message='This card cannot go to a foundation yet.';}return false;}if(a==='stock'){if(s.stock.length){let c=s.stock.pop();c.up=true;s.waste.push(c);}else if(s.waste.length){s.stock=s.waste.reverse().map(c=>({...c,up:false}));s.waste=[];}else return false;s.selected=null;s.message='';return true;}if(a==='hint'){let moves=availableMoves(s);const pile=x=>x[0]==='t'?x.split(':').slice(0,2).join(':'):x;const ranked=moves.filter(([f,t])=>f[0]!=='f'&&!(s.lastMove&&pile(f)===s.lastMove.to&&t===pile(s.lastMove.from))).map(m=>{let [f,t]=m,o=origin(s,f),exposes=o.index>0&&!o.pile[o.index-1].up,empty=t[0]==='t'&&!s.tableau[+t.split(':')[1]].length;return {m,score:(exposes?200:0)+(t[0]==='f'?100:0)+(f==='w'?70:0)-(empty&&o.index===0?500:0)};}).filter(x=>x.score>=0).sort((a,b)=>b.score-a.score);let best=ranked[0]?.m;if(best){s.selected=best[0];s.hintTarget=best[1];s.message=`Selected card can move to ${best[1][0]==='f'?'the '+suits[+best[1].split(':')[1]]+' foundation':'column '+(+best[1].split(':')[1]+1)}.`;}else s.message=s.stock.length?'Draw a card from the stock.':s.waste.length?'Recycle the waste, or undo a move. This deal may be blocked.':'No available moves. Try Undo or a new deal.';return false;}if(a==='foundation'){if(s.selected&&solitaireMove(s,s.selected,`f:${v}`)){s.message='';return true;}if(s.foundation[+v].length)s.selected=`f:${v}`;else s.message='Foundations begin with an Ace of the matching suit.';return false;}if(a==='column'){if(s.selected&&solitaireMove(s,s.selected,`t:${v}`)){s.message='';return true;}s.message='Only a King can fill an empty column.';return false;}if(a==='select'){if(s.selected===v){s.selected=null;return false;}if(s.selected&&v[0]==='t'&&solitaireMove(s,s.selected,`t:${v.split(':')[1]}`)){s.message='';return true;}let o=origin(s,v);if(o?.pile&&o.index>=0&&o.index<o.pile.length&&sequence(o.pile.slice(o.index))){s.selected=v;s.message='Now tap a column or a foundation.';}else s.message='That card is face down.';}return false;},won:s=>s.foundation.every(p=>p.length===13)};
// Replacement Mahjong section for classics.js; uses the existing button, range, shuffle imports.
const mahjongSymbols=[
  ['☀','Sun'],['☾','Moon'],['★','Star'],['♥','Heart'],['♠','Spade'],['♣','Club'],
  ['♦','Gem'],['♫','Music'],['🔔','Bell'],['🔑','Key'],['🍃','Leaf'],['🌲','Tree'],
  ['🌼','Flower'],['🐦','Bird'],['🐟','Fish'],['🐚','Shell'],['♛','Crown'],['⚓','Anchor']
];
const legacyMahjongSymbols=[['春','Spring'],['夏','Summer'],['秋','Autumn'],['冬','Winter'],['竹','Bamboo'],['梅','Plum'],['菊','Mum'],['蘭','Orchid'],['一','One'],['二','Two'],['三','Three'],['四','Four'],['五','Five'],['六','Six']];
function mahjongFace(s,t){return (s.symbolsVersion===2?mahjongSymbols:legacyMahjongSymbols)[t.type]||['?','Tile'];}
export function freeTile(s,i){let t=s.tiles[i];if(!t||t.gone)return false;let active=s.tiles.filter(t=>!t.gone);return !active.some(q=>q.z>t.z&&q.x===t.x&&q.y===t.y)&&(!active.some(q=>q.z===t.z&&q.y===t.y&&q.x===t.x-1)||!active.some(q=>q.z===t.z&&q.y===t.y&&q.x===t.x+1));}
export function mahjongBlockReason(s,i){
  const t=s.tiles[i];if(!t||t.gone)return 'removed';
  const active=s.tiles.filter(q=>!q.gone);
  if(active.some(q=>q.z>t.z&&q.x===t.x&&q.y===t.y))return 'covered';
  if(active.some(q=>q.z===t.z&&q.y===t.y&&q.x===t.x-1)&&active.some(q=>q.z===t.z&&q.y===t.y&&q.x===t.x+1))return 'side-blocked';
  return 'free';
}
function mahjongPairs(s){let free=s.tiles.map((t,i)=>freeTile(s,i)?i:-1).filter(i=>i>=0),out=[];for(let a=0;a<free.length;a++)for(let b=a+1;b<free.length;b++)if(s.tiles[free[a]].type===s.tiles[free[b]].type)out.push([free[a],free[b]]);return out;}
// Validate the complete saved route, not just its first pair: alternate matches can break it.
function savedMahjongRoute(s){if(!Array.isArray(s.solution))return null;let copy={tiles:s.tiles.map(t=>({...t}))},route=[];for(let pair of s.solution){if(!Array.isArray(pair)||pair.length!==2)return null;let [a,b]=pair,ta=copy.tiles[a],tb=copy.tiles[b];if(!ta||!tb||a===b)return null;if(ta.gone&&tb.gone)continue;if(ta.gone||tb.gone||ta.type!==tb.type||!freeTile(copy,a)||!freeTile(copy,b))return null;ta.gone=tb.gone=true;route.push([a,b]);}return copy.tiles.every(t=>t.gone)?route:null;}
// Pure bounded depth-first search. BigInt occupancy works for both 72-tile games and legacy saves.
export function mahjongSolve(s,{maxNodes=12000,maxMs=120}={}){
  let started=Date.now(),nodes=0,limited=false,n=s.tiles.length,bits=s.tiles.map((_,i)=>1n<<BigInt(i)),above=[],left=[],right=[],initial=0n,dead=new Set();
  s.tiles.forEach((t,i)=>{if(!t.gone)initial|=bits[i];above[i]=left[i]=right[i]=0n;s.tiles.forEach((q,j)=>{if(q.y!==t.y)return;if(q.x===t.x&&q.z>t.z)above[i]|=bits[j];if(q.z===t.z&&q.x===t.x-1)left[i]|=bits[j];if(q.z===t.z&&q.x===t.x+1)right[i]|=bits[j];});});
  function visit(mask){if(!mask)return [];if(++nodes>maxNodes||Date.now()-started>maxMs){limited=true;return null;}if(dead.has(mask))return null;let groups=new Map(),pairs=[];for(let i=0;i<n;i++)if((mask&bits[i])&&!(mask&above[i])&&(!(mask&left[i])||!(mask&right[i]))){let type=s.tiles[i].type;if(!groups.has(type))groups.set(type,[]);groups.get(type).push(i);}for(let indices of groups.values())for(let a=0;a<indices.length;a++)for(let b=a+1;b<indices.length;b++)pairs.push([indices[a],indices[b]]);
    // Prefer raised tiles, whose removal typically opens the most useful space.
    pairs.sort((a,b)=>(s.tiles[b[0]].z+s.tiles[b[1]].z)-(s.tiles[a[0]].z+s.tiles[a[1]].z));
    for(let [a,b] of pairs){let rest=visit(mask&~bits[a]&~bits[b]);if(rest)return [[a,b],...rest];if(limited)return null;}dead.add(mask);return null;
  }
  let path=visit(initial);return {status:path?'solved':limited?'limit':'blocked',path,nodes};
}
export const mahjong={
  id:'mahjong',title:'Mahjong Solitaire',subtitle:'Find a pair. Uncover a possibility.',tag:'Classic · 72 tiles',
  rules:'Clear 72 tiles across three layers. Each picture appears four times: choose which matching pair to remove. A tile is free when no tile covers it and at least one left or right side is open. Match the same picture and label. New layouts have a verified full solution, but some choices can lead to a dead end. Hints check for a route to the finish; if a search is inconclusive, the hint says so. Undo is always available after a move.',
  create(){
    let tiles=[];for(let y=0;y<6;y++)for(let x=0;x<8;x++)tiles.push({x,y,z:0,type:0,gone:false});
    for(let y=1;y<=4;y++)for(let x=2;x<=5;x++)tiles.push({x,y,z:1,type:0,gone:false});
    for(let y=2;y<=3;y++)for(let x=2;x<=5;x++)tiles.push({x,y,z:2,type:0,gone:false});
    let s={tiles,selected:null,message:'',solution:[],symbolsVersion:2},types=shuffle([...range(18),...range(18)]);
    // Randomly remove any free pair while assigning symbols. Discard a geometry dead end.
    // The bounded fallback peels two exposed ends of an even-width row, guaranteeing completion.
    let assigned=false;
    for(let attempt=0;attempt<32&&!assigned;attempt++){
      tiles.forEach(t=>t.gone=false);s.solution=[];
      for(let k=0;k<36;k++){
        let free=shuffle(tiles.map((t,i)=>freeTile(s,i)?i:-1).filter(i=>i>=0));
        if(free.length<2)break;let pair=free.slice(0,2);
        pair.forEach(i=>{tiles[i].type=types[k];tiles[i].gone=true;});s.solution.push(pair);
      }
      assigned=s.solution.length===36;
    }
    if(!assigned){
      tiles.forEach(t=>t.gone=false);s.solution=[];
      for(let k=0;k<36;k++){
        let rows=new Map();tiles.forEach((t,i)=>{if(!freeTile(s,i))return;let key=t.z+':'+t.y;if(!rows.has(key))rows.set(key,[]);rows.get(key).push(i);});
        let pair=shuffle([...rows.values()].filter(row=>row.length>=2))[0].slice(0,2);
        pair.forEach(i=>{tiles[i].type=types[k];tiles[i].gone=true;});s.solution.push(pair);
      }
    }
    tiles.forEach(t=>t.gone=false);return s;
  },
  view(s){
    let cols=Math.max(...s.tiles.map(t=>t.x))+1,rows=Math.max(...s.tiles.map(t=>t.y))+1,dx=97/cols,dy=93/rows;
    return `${s.symbolsVersion!==2?'<p class="saved-layout-note">Resuming your saved 28-tile layout. Choose New game for the new 72-tile board.</p>':''}<div class="mahjong-board" style="position:relative;width:100%;height:clamp(360px,78vw,460px);aspect-ratio:auto">${s.tiles.map((t,i)=>{if(t.gone)return '';let reason=mahjongBlockReason(s,i),free=reason==='free',[glyph,label]=mahjongFace(s,t),availability=free?'free':reason==='covered'?'covered by an upper tile':'both side exits blocked';return `<div class="mahjong-pos" style="left:${t.x*dx+t.z*.55}%;top:${5+t.y*dy+t.z*.6}%;width:${dx-.8-t.z*.55}%;height:${dy-1.3-t.z*.6}%;z-index:${t.z+1}">${button(`<span aria-hidden="true" style="display:block;font-size:clamp(21px,4.8vw,34px);line-height:1.15">${glyph}</span><span aria-hidden="true" style="display:block;font-size:clamp(8px,1.7vw,11px);line-height:1.4;font-weight:700">${label}</span><small class="mahjong-layer" aria-hidden="true">${t.z+1}</small>`,'tile',i,`mahjong-tile ${free?'free':'blocked'} ${reason} ${t.z?'raised':''} ${s.selected===i?'selected':''} ${s.hint?.includes(i)?'hinted':''}`,`style="width:100%;height:100%;min-width:0;padding:2px;display:flex;flex-direction:column;justify-content:center;align-items:center" aria-label="${label} tile, layer ${t.z+1}, row ${t.y+1}, column ${t.x+1}, ${availability}" title="Layer ${t.z+1}: ${availability}" aria-pressed="${s.selected===i}"`)}</div>`;}).join('')}</div><div class="game-extra">${s.tiles.filter(t=>!t.gone).length} tiles remaining · ${mahjongPairs(s).length} available pairs</div><p class="mahjong-key">Corner numbers show layers. Two side bars mean both exits are blocked; gray tiles have a tile above.</p>`;
  },
  action(s,a,v){
    if(a==='hint'){
      s.selected=null;let legal=mahjongPairs(s);if(!legal.length){s.hint=null;s.message=s.tiles.every(t=>t.gone)?'All pairs cleared!':'No matching free pairs. Undo a move or start a new layout.';return false;}
      let route=savedMahjongRoute(s),result=route?{status:'solved',path:route}:mahjongSolve(s);
      if(result.status==='solved'){s.solution=result.path;s.hint=result.path[0];s.message='The highlighted pair starts a verified route to clear every remaining tile.';}
      else if(result.status==='blocked'){s.hint=null;s.message='This position has no complete solution. Undo one or more pairs to try another route.';}
      else {s.hint=legal[0];s.message='This highlighted pair is legal, but the search could not verify a complete solution. You may need Undo.';}
      return false;
    }
    if(a==='tile'){
      let i=+v;if(!freeTile(s,i)){const reason=mahjongBlockReason(s,i);s.message=reason==='covered'?'Another tile is directly above this one. Remove that upper tile first.':reason==='side-blocked'?'Both left and right exits are blocked. Clear either neighbouring tile first.':'That tile is no longer on the board.';return false;}
      if(s.selected===i){s.selected=null;return false;}
      if(s.selected!=null&&freeTile(s,s.selected)&&s.tiles[i].type===s.tiles[s.selected].type){s.tiles[i].gone=s.tiles[s.selected].gone=true;s.selected=null;s.hint=null;s.message=mahjongPairs(s).length?'A pair cleared.':s.tiles.every(t=>t.gone)?'All pairs cleared!':'No free pairs remain. Undo can help.';return true;}
      s.selected=i;s.hint=null;s.message='Choose another free tile with the same picture and label.';
    }
    return false;
  },
  won:s=>s.tiles.every(t=>t.gone)
};

export const games=[solitaire,mahjong];
