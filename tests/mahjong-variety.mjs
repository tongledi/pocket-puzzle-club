let {mahjong,freeTile,mahjongSolve,mahjongGeometry,mahjongBlockReason}=await import('../dist/games/classics.js');
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
const explained=mahjong.view(statusBoard);ok(explained.includes('both side exits blocked')&&explained.includes('covered by an upper tile')&&explained.includes('depth-board')&&!explained.includes('mahjong-layer'),'accessible blockers and layer cues');
console.log('PASS Mahjong distinct blocker explanations agree with legal rules and do not remove tiles');

// Uniform portrait projection keeps adjacent exposed centers fully tappable.
// Small projected edge overlap represents elevation, not a rule blocker.
const visualState=mahjong.create(),projection=mahjongGeometry(visualState),visualGeometry=mahjong.view(visualState);
const percentages=[...visualGeometry.matchAll(/left:([\d.]+)%;top:([\d.]+)%;width:([\d.]+)%;height:([\d.]+)%/g)].map(m=>m.slice(1).map(Number));
ok(percentages.length===visualState.tiles.length,'one face rectangle per tile');
for(let i=0;i<visualState.tiles.length;i++){
 const a=projection.boxes[i],t=visualState.tiles[i],cx=a.left+a.width/2,cy=a.top+a.height/2;
 ok(Math.abs(a.height/a.width-1.34)<1e-9,'portrait face ratio');
 const p=percentages[i];ok(Math.abs((p[3]*projection.height)/(p[2]*projection.width)-1.34)<1e-8,'rendered projection keeps portrait ratio');
 for(let j=0;j<visualState.tiles.length;j++)if(visualState.tiles[j].z>t.z){const b=projection.boxes[j],q=visualState.tiles[j],covers=cx>b.left&&cx<b.left+b.width&&cy>b.top&&cy<b.top+b.height;ok(covers===(t.x===q.x&&t.y===q.y),'only direct upper stack covers a tile center');}
}
ok(Math.abs(projection.pitchX-projection.faceWidth-.035)<1e-9,'tight horizontal seams');
ok(Math.abs(projection.pitchY-projection.faceHeight-.035)<1e-9,'tight vertical seams');
console.log('PASS portrait aspect, tight seams and center coverage match logical stack rules');
