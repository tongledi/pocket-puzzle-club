export const clone=x=>JSON.parse(JSON.stringify(x));
export function shuffle(a){for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export const button=(label,action,value='',cls='',extra='')=>`<button class="${cls}" data-action="${action}" data-value="${value}" ${extra}>${label}</button>`;
export const range=n=>Array.from({length:n},(_,i)=>i);
export const grids=(cells,n,cls='')=>`<div class="grid-board ${cls}" style="--cols:${n}">${cells.join('')}</div>`;
