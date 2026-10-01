let {mahjong,freeTile,mahjongSolve,mahjongBlockReason}=await import('../dist/games/classics.js');
function ok(x,m){if(!x)throw Error(m)}
for(let r=0;r<500;r++){
 let s=mahjong.create();ok(s.tiles.length===72,'tile count');let counts={};s.tiles.forEach(t=>counts[t.type]=(counts[t.type]||0)+1);ok(Object.keys(counts).length===18&&Object.values(counts).every(c=>c===4),'type distribution');ok(new Set(s.tiles.map(t=>t.z)).size===3,'layers');ok(Math.max(...s.tiles.map(t=>t.x))===7,'max columns');
 for(let [a,b] of s.solution){ok(freeTile(s,a)&&freeTile(s,b),'solution geometry');ok(s.tiles[a].type===s.tiles[b].type,'matching');ok(!mahjong.action(s,'tile',a),'select non-move');ok(mahjong.action(s,'tile',b),'remove move');}ok(mahjong.won(s),'win');
}
let s=mahjong.create(),before=JSON.stringify(s.tiles);mahjong.action(s,'hint');ok(s.hint.length===2&&s.message.includes('verified'),'verified hint');ok(JSON.stringify(s.tiles)===before,'hint nonmutation');
let trivial={tiles:[{x:0,y:0,z:0,type:1,gone:false},{x:1,y:0,z:0,type:1,gone:false}]};ok(mahjongSolve(trivial).status==='solved','solver trivial');
let impossible={tiles:[{x:0,y:0,z:0,type:1,gone:false},{x:1,y:0,z:0,type:2,gone:false}]};ok(mahjongSolve(impossible).status==='blocked','solver blocked');ok(mahjongSolve(s,{maxNodes:0}).status==='limit','solver limit');
let legacy={tiles:[{x:0,y:0,z:0,type:0,gone:false},{x:1,y:0,z:0,type:0,gone:false}],selected:null};ok(mahjong.view(legacy).includes('Spring'),'legacy symbol');mahjong.action(legacy,'hint');ok(legacy.hint.length===2,'legacy hint');
let geometry={tiles:[{x:0,y:0,z:0,type:0,gone:false},{x:1,y:0,z:0,type:0,gone:false},{x:2,y:0,z:0,type:0,gone:false},{x:0,y:0,z:1,type:0,gone:false}]};ok(!freeTile(geometry,0),'covered');ok(!freeTile(geometry,1),'both sides');ok(freeTile(geometry,2)&&freeTile(geometry,3),'edge and upper');
console.log('PASS: 500 generated layouts (18,000 legal solution pairs), 72 tiles / 18 types x 4 / 3 layers / 8 columns; hint verification/nonmutation; solver solved/blocked/limit; legacy labels and hints; covered/side-blocked geometry.');

// Visual explanations must agree with the unchanged side/coverage rule.
let statusBoard=mahjong.create();
for(let i=0;i<statusBoard.tiles.length;i++)ok((mahjongBlockReason(statusBoard,i)==='free')===freeTile(statusBoard,i),'explanation matches legal state');
for(const reason of ['covered','side-blocked','free']){
 const i=statusBoard.tiles.findIndex((_,i)=>mahjongBlockReason(statusBoard,i)===reason);ok(i>=0,'fixture has '+reason);
 const before=statusBoard.tiles.filter(t=>t.gone).length;mahjong.action(statusBoard,'tile',i);
 if(reason==='covered')ok(statusBoard.message.includes('directly above'),'specific upper cover feedback');
 if(reason==='side-blocked')ok(statusBoard.message.includes('left and right exits'),'specific side exit feedback');
 ok(statusBoard.tiles.filter(t=>t.gone).length===before,'inspection does not remove tiles');
}
const explained=mahjong.view(statusBoard);ok(explained.includes('both side exits blocked')&&explained.includes('covered by an upper tile')&&explained.includes('mahjong-layer'),'accessible blockers and layer cues');
console.log('PASS Mahjong distinct blocker explanations agree with legal rules and do not remove tiles');

// Tile faces stay within their logical cells; only same-cell higher layers cover.
const visualGeometry=mahjong.view(mahjong.create());
const boxes=[...visualGeometry.matchAll(/left:([\d.]+)%;top:([\d.]+)%;width:([\d.]+)%;height:([\d.]+)%/g)].map(m=>m.slice(1).map(Number));
const tiles=mahjong.create().tiles;ok(boxes.length===tiles.length,'one face rectangle per tile');
for(let i=0;i<tiles.length;i++)for(let j=i+1;j<tiles.length;j++){
 const a=boxes[i],b=boxes[j],overlap=Math.min(a[0]+a[2],b[0]+b[2])-Math.max(a[0],b[0])>0&&Math.min(a[1]+a[3],b[1]+b[3])-Math.max(a[1],b[1])>0;
 ok(overlap===(tiles[i].x===tiles[j].x&&tiles[i].y===tiles[j].y),'visual overlap agrees with cover geometry');
}
console.log('PASS every rendered Mahjong overlap matches a same-cell layer stack');
