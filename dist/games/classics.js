import {shuffle,button,range,clone} from './core.js?v=1.7.0';
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
function origin(s,sel){
  if(sel==='w')return {pile:s.waste,index:s.waste.length-1};
  let match=/^f:([0-3])$/.exec(sel||'');
  if(match){const pile=s.foundation[+match[1]];return {pile,index:pile.length-1};}
  match=/^t:([0-6]):(\d+)$/.exec(sel||'');
  return match?{pile:s.tableau[+match[1]],index:+match[2]}:null;
}
function sequence(cs){return cs.every((c,i)=>c.up&&(!i||cs[i-1].rank===c.rank+1&&red(cs[i-1])!==red(c)));}
export function solitaireMove(s,from,to){let o=origin(s,from);if(!o||!o.pile||o.index<0||o.index>=o.pile.length)return false;let cards=o.pile.slice(o.index);if(!sequence(cards))return false;let [k,p]=to.split(':'),dest=k==='f'?s.foundation[+p]:k==='t'?s.tableau[+p]:null;if(!dest||dest===o.pile)return false;let last=dest.at(-1),c=cards[0];if(k==='f'){if(cards.length!==1||c.suit!==+p||c.rank!==(last?last.rank+1:1))return false;}else if(last?(!last.up||last.rank!==c.rank+1||red(last)===red(c)):c.rank!==13)return false;dest.push(...o.pile.splice(o.index));if(o.pile.length)o.pile.at(-1).up=true;s.selected=null;s.hintTarget=null;s.lastMove={from,to};return true;}
function availableMoves(s){let sources=[];if(s.waste.length)sources.push('w');s.tableau.forEach((p,j)=>p.forEach((c,i)=>{if(c.up)sources.push(`t:${j}:${i}`);}));s.foundation.forEach((p,j)=>{if(p.length)sources.push(`f:${j}`);});let out=[];for(let from of sources)for(let kind of ['f','t'])for(let j=0;j<(kind==='f'?4:7);j++){let copy=clone(s);if(solitaireMove(copy,from,`${kind}:${j}`))out.push([from,`${kind}:${j}`]);}return out;}
export function solitaireTargets(s,from=s.selected){
  if(!from)return [];
  return ['f:0','f:1','f:2','f:3',...range(7).map(i=>`t:${i}`)].filter(to=>solitaireMove(clone(s),from,to));
}
function selectedMessage(s){
  const targets=solitaireTargets(s);
  return targets.length?'Choose an outlined destination. Tap the selected card again to cancel.':'No destination for this card yet. Tap it again to cancel, or draw from the stock.';
}
function failedSolitaireMove(s,to){
  const o=origin(s,s.selected),cards=o?.pile?.slice(o.index),c=cards?.[0];
  if(!c)return 'Choose a face-up card first.';
  if(to[0]==='f')return cards.length>1?'Move one card at a time to a foundation. Your sequence is still selected.':'Foundations build Ace to King in the matching suit. Your card is still selected.';
  return !s.tableau[+to.split(':')[1]]?.length?'Only a King can fill an empty column. Your card is still selected.':'Build down by one rank, alternating red and black. Your card is still selected.';
}
export const solitaire={
  id:'solitaire',title:'Solitaire',subtitle:'The familiar comfort of a fresh deal.',tag:'Classic · Draw one',
  rules:'Build the four foundations from Ace to King, by suit. On the seven columns, stack cards in descending order with alternating colours. Only a King can fill an empty column. Drag a face-up card or sequence to its destination, or select a card and tap an outlined destination. Tap the selected card again to cancel. With a keyboard, Tab between buttons and press Enter or Space. Tap the stock to draw one card; recycle it when empty. Select a card and use To foundation for a quick legal foundation move. Larger cards in How to play offers a scrollable board. Random deals may be unwinnable.',
  create(){let deck=shuffle(range(52).map(i=>({rank:i%13+1,suit:i/13|0,up:false}))),tableau=[];for(let i=0;i<7;i++){tableau.push(deck.splice(0,i+1));tableau[i].at(-1).up=true;}return {tableau,stock:deck,waste:[],foundation:[[],[],[],[]],selected:null,message:''};},
  view(s){const targets=new Set(solitaireTargets(s));return `<div class="solitaire-scroll" tabindex="0" aria-label="Solitaire table${s.large?', larger cards. Scroll sideways to see all columns.':''}"><div class="solitaire-board ${s.large?'large-cards':''}"><div class="card-top"><div class="stock-pile">${s.stock.length?card(s.stock.at(-1),'stock','','stock-card'):button('<span class="recycle-mark">↻</span>','stock','','card-slot stock-empty',`aria-label="Recycle waste" ${s.waste.length?'':'disabled'}`)}<small>${s.stock.length?`${s.stock.length} cards`:'Recycle'}</small></div><div class="waste-pile">${s.waste.length?card(s.waste.at(-1),'select','w',s.selected==='w'?'selected':''):'<div class="card-slot waste-slot" aria-label="Waste pile empty"></div>'}<small>Draw one</small></div><div class="card-gap"></div>${s.foundation.map((p,i)=>`<div class="foundation-pile ${targets.has(`f:${i}`)?'legal-destination':''}">${p.length?card(p.at(-1),'foundation',i,s.selected===`f:${i}`?'selected':s.hintTarget===`f:${i}`?'hinted':''):button(`<span>${suits[i]}</span><small>A</small>`,'foundation',i,`card-slot foundation-slot ${s.hintTarget===`f:${i}`?'hinted':''}`,`aria-label="${suits[i]} foundation, empty"`)}<small>${p.length===13?'Complete':'Ace to King'}</small></div>`).join('')}</div><div class="tableau">${s.tableau.map((p,j)=>`<div class="card-column ${s.hintTarget===`t:${j}`?'hinted':''} ${targets.has(`t:${j}`)?'legal-destination':''}" style="--pile-count:${Math.max(0,p.length-1)}">${button('<span>K</span>','column',j,'card-slot',`aria-label="Column ${j+1}${targets.has(`t:${j}`)?', available destination':''}"`)}${p.map((c,i)=>`<div class="stack-card" style="--card-index:${i}">${card(c,'select',`t:${j}:${i}`,s.selected===`t:${j}:${i}`?'selected':'')}</div>`).join('')}</div>`).join('')}</div></div></div>`;},
  action(s,a,v){
    if(['stock','select','foundation','column'].includes(a))s.hintTarget=null;
    if(a==='zoom'){s.large=!s.large;return false;}
    if(a==='auto'){
      if(s.selected){for(let j=0;j<4;j++)if(solitaireMove(s,s.selected,`f:${j}`)){s.message='Moved to the foundation. Undo is available.';return true;}s.message='This card cannot go to a foundation yet. Your selection is unchanged.';}
      return false;
    }
    if(a==='stock'){
      if(s.stock.length){let c=s.stock.pop();c.up=true;s.waste.push(c);s.message=`Drew ${face(c)}. ${s.stock.length?`${s.stock.length} cards left in the stock.`:'The stock is empty. Tap it to recycle the waste.'}`;}
      else if(s.waste.length){s.stock=s.waste.reverse().map(c=>({...c,up:false}));s.waste=[];s.message='Waste recycled. Tap the stock to draw again.';}
      else return false;
      s.selected=null;return true;
    }
    if(a==='hint'){
      let moves=availableMoves(s);const pile=x=>x[0]==='t'?x.split(':').slice(0,2).join(':'):x;
      const ranked=moves.filter(([f,t])=>f[0]!=='f'&&!(s.lastMove&&pile(f)===s.lastMove.to&&t===pile(s.lastMove.from))).map(m=>{let [f,t]=m,o=origin(s,f),exposes=o.index>0&&!o.pile[o.index-1].up,empty=t[0]==='t'&&!s.tableau[+t.split(':')[1]].length;return {m,score:(exposes?200:0)+(t[0]==='f'?100:0)+(f==='w'?70:0)-(empty&&o.index===0?500:0)};}).filter(x=>x.score>=0).sort((a,b)=>b.score-a.score);
      let best=ranked[0]?.m;
      if(best){s.selected=best[0];s.hintTarget=best[1];s.message=`Selected card can move to ${best[1][0]==='f'?'the '+suits[+best[1].split(':')[1]]+' foundation':'column '+(+best[1].split(':')[1]+1)}.`;}
      else {s.selected=null;s.hintTarget=null;s.message=s.stock.length?'Draw a card from the stock.':s.waste.length?'Recycle the waste, or undo a move. This deal may be blocked.':'No available moves. Try Undo or a new deal.';}
      return false;
    }
    if(a==='foundation'){
      if(!Number.isInteger(+v)||+v<0||+v>3)return false;
      if(s.selected===`f:${v}`){s.selected=null;s.message='Selection cleared.';return false;}
      if(s.selected){if(solitaireMove(s,s.selected,`f:${v}`)){s.message='Moved to the foundation. Undo is available.';return true;}s.message=failedSolitaireMove(s,`f:${v}`);return false;}
      if(s.foundation[+v].length){s.selected=`f:${v}`;s.message=selectedMessage(s);}else s.message='Foundations begin with an Ace of the matching suit.';
      return false;
    }
    if(a==='column'){
      if(!Number.isInteger(+v)||+v<0||+v>6)return false;
      if(s.selected&&solitaireMove(s,s.selected,`t:${v}`)){s.message='Moved. Undo is available.';return true;}
      s.message=failedSolitaireMove(s,`t:${v}`);return false;
    }
    if(a==='select'){
      if(s.selected===v){s.selected=null;s.message='Selection cleared.';return false;}
      if(s.selected&&/^t:[0-6]:\d+$/.test(v)&&s.selected.split(':').slice(0,2).join(':')!==v.split(':').slice(0,2).join(':')){
        const to=`t:${v.split(':')[1]}`;
        if(solitaireMove(s,s.selected,to)){s.message='Moved. Undo is available.';return true;}
        s.message=failedSolitaireMove(s,to);return false;
      }
      let o=origin(s,v);
      if(o?.pile&&o.index>=0&&o.index<o.pile.length&&sequence(o.pile.slice(o.index))){s.selected=v;s.message=selectedMessage(s);}else s.message='That card is face down. Uncover it by moving the cards below it.';
    }
    return false;
  },
  won:s=>s.foundation.every(p=>p.length===13)
};
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
export function mahjongBlockers(s,i){
  const t=s.tiles[i];if(!t||t.gone)return [];
  const above=s.tiles.map((q,j)=>!q.gone&&q.z>t.z&&q.x===t.x&&q.y===t.y?j:-1).filter(j=>j>=0);
  if(above.length)return [above.reduce((a,b)=>s.tiles[a].z>s.tiles[b].z?a:b)];
  if(mahjongBlockReason(s,i)!=='side-blocked')return [];
  return s.tiles.map((q,j)=>!q.gone&&q.z===t.z&&q.y===t.y&&Math.abs(q.x-t.x)===1?j:-1).filter(j=>j>=0);
}
export function mahjongMatches(s){return freeTile(s,s.selected)?s.tiles.map((t,i)=>i!==s.selected&&t.type===s.tiles[s.selected].type&&freeTile(s,i)?i:-1).filter(i=>i>=0):[];}
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
    const matches=mahjongMatches(s),remaining=s.tiles.filter(t=>!t.gone).length;
    let cols=Math.max(...s.tiles.map(t=>t.x))+1,rows=Math.max(...s.tiles.map(t=>t.y))+1,dx=97/cols,dy=93/rows;
    return `<div class="puzzle-goal"><strong>${remaining} tiles left</strong><span>Match free pairs to clear the board</span></div>${s.symbolsVersion!==2?'<p class="saved-layout-note">Resuming your saved 28-tile layout. Choose New game for the new 72-tile board.</p>':''}<div class="mahjong-board" style="position:relative;width:100%;height:clamp(294px,calc(100svh - 385px),410px);aspect-ratio:auto">${s.tiles.map((t,i)=>{if(t.gone)return '';let reason=mahjongBlockReason(s,i),free=reason==='free',[glyph,label]=mahjongFace(s,t),availability=free?'free':reason==='covered'?'covered by an upper tile':'both side exits blocked';return `<div class="mahjong-pos" style="left:${t.x*dx+t.z*.55}%;top:${5+t.y*dy+t.z*.6}%;width:${dx-.8-t.z*.55}%;height:${dy-1.3-t.z*.6}%;z-index:${t.z+1}">${button(`<span aria-hidden="true" style="display:block;font-size:clamp(21px,4.8vw,34px);line-height:1.15">${glyph}</span><span aria-hidden="true" style="display:block;font-size:clamp(8px,1.7vw,11px);line-height:1.4;font-weight:700">${label}</span><small class="mahjong-layer" aria-hidden="true">${t.z+1}</small>`,'tile',i,`mahjong-tile ${free?'free':'blocked'} ${reason} ${t.z?'raised':''} ${s.selected===i?'selected':''} ${s.hint?.includes(i)?'hinted':''} ${matches.includes(i)?'matching-tile':''} ${s.blocked?.includes(i)?'blocking-tile':''}`,`style="width:100%;height:100%;min-width:0;padding:2px;display:flex;flex-direction:column;justify-content:center;align-items:center" aria-label="${label} tile, layer ${t.z+1}, row ${t.y+1}, column ${t.x+1}, ${availability}${matches.includes(i)?', matches selected tile':''}${s.blocked?.includes(i)?', blocking the tile you tapped':''}" title="Layer ${t.z+1}: ${availability}" aria-pressed="${s.selected===i}"`)}</div>`;}).join('')}</div><div class="game-extra">${mahjongPairs(s).length} available pairs · ${s.tiles.filter((_,i)=>freeTile(s,i)).length} free tiles</div><p class="mahjong-key">Corner numbers show layers. Two side bars mean both exits are blocked; gray tiles have a tile above.</p>`;
  },
  action(s,a,v){
    if(a==='hint'){
      s.selected=null;s.blocked=[];let legal=mahjongPairs(s);if(!legal.length){s.hint=null;s.message=s.tiles.every(t=>t.gone)?'All pairs cleared!':'No matching free pairs. Undo a move or start a new layout.';return false;}
      let route=savedMahjongRoute(s),result=route?{status:'solved',path:route}:mahjongSolve(s);
      if(result.status==='solved'){s.solution=result.path;s.hint=result.path[0];s.message='The highlighted pair starts a verified route to clear every remaining tile.';}
      else if(result.status==='blocked'){s.hint=null;s.message='This position has no complete solution. Undo one or more pairs to try another route.';}
      else {s.hint=legal[0];s.message='This highlighted pair is legal, but the search could not verify a complete solution. You may need Undo.';}
      return false;
    }
    if(a==='tile'){
      let i=v===''?NaN:+v;if(!Number.isInteger(i)||i<0||i>=s.tiles.length)return false;
      s.blocked=[];if(!freeTile(s,i)){s.hint=null;s.blocked=mahjongBlockers(s,i);const reason=mahjongBlockReason(s,i);s.message=reason==='covered'?'Another tile is directly above this one. The marked upper tile must be cleared first.':reason==='side-blocked'?'Both left and right exits are blocked. The two marked neighbours block the sides; clear either one first.':'That tile is no longer on the board.';return false;}
      if(s.selected===i){s.selected=null;s.hint=null;s.message='Selection cleared. Choose a free matching pair.';return false;}
      if(s.selected!=null&&freeTile(s,s.selected)&&s.tiles[i].type===s.tiles[s.selected].type){s.tiles[i].gone=s.tiles[s.selected].gone=true;s.selected=null;s.hint=null;s.message=mahjongPairs(s).length?`${mahjongFace(s,s.tiles[i])[1]} pair cleared. ${s.tiles.filter(t=>!t.gone).length} tiles left.`:s.tiles.every(t=>t.gone)?'All pairs cleared!':'No free pairs remain. Undo a pair or restart this layout.';return true;}
      const switched=s.selected!=null;s.selected=i;s.hint=null;const matches=mahjongMatches(s),label=mahjongFace(s,s.tiles[i])[1];
      s.message=matches.length?`${label} selected${switched?' instead':''}. Choose a marked matching tile; tap this tile again to cancel.`:`${label} selected${switched?' instead':''}, but no matching tile is free yet. Choose another tile, or tap again to cancel.`;
    }
    return false;
  },
  motion(before,a,v,after){if(a!=='tile'||!after)return null;return {game:'mahjong',targets:after.tiles.flatMap((t,i)=>freeTile(after,i)&&!freeTile(before,i)?[{selector:`[data-action="tile"][data-value="${i}"]`,kind:'unlock'}]:[])};},
  won:s=>s.tiles.every(t=>t.gone)
};

export const games=[solitaire,mahjong];
