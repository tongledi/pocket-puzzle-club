import { solitaireMove } from './games/classics.js?v=1.9.0';
import { blocks, canPlace, blockPlacement } from './games/modern.js?v=1.9.0';
import { words, wordLine } from './games/logic.js?v=1.9.0';

// UI gestures stay transient. Only this controller action changes a round.
// Call AFTER the controller's storage/dialog/pause/win guards and BEFORE its
// normal history/move/persist flow. No second, unguarded mutation path exists.
export function commitDrag(game, round, drop) {
  if (!drop || game.id !== drop.gameId || round.runId !== drop.runId ||
      JSON.stringify(round.state) !== drop.expected) return false;
  const state = round.state;
  if (game.id === 'solitaire') {
    if (!validSolitaireSource(state, drop.from) || !/^(t:[0-6]|f:[0-3])$/.test(drop.to)) return false;
    const changed = solitaireMove(state, drop.from, drop.to);
    if (changed) state.message = 'Moved. You can undo this move.';
    return changed;
  }
  if (game.id === 'blocks') {
    if (!Number.isInteger(drop.piece) || drop.piece < 0 || drop.piece > 2 ||
        !canPlace(state, state.pieces[drop.piece], drop.anchor)) return false;
    // Validation above precedes selection, so an invalid drop changes nothing.
    state.selected = drop.piece;
    return blocks.action(state, 'place', drop.anchor);
  }
  if (game.id === 'words') return words.action(state, 'line', {start:drop.start,end:drop.end});
  return false;
}

export function solitaireCards(state, from) {
  if (from === 'w') return state.waste.slice(-1);
  if (/^f:[0-3]$/.test(from)) return state.foundation[+from[2]].slice(-1);
  const match = /^t:([0-6]):(\d+)$/.exec(from);
  return match ? state.tableau[+match[1]].slice(+match[2]) : [];
}
export function validSolitaireSource(state, from) {
  if (typeof from !== 'string') return false;
  const cards = solitaireCards(state, from);
  return cards.length > 0 && cards.every((card, i) => card.up && (!i ||
    cards[i - 1].rank === card.rank + 1 && cards[i - 1].suit % 2 !== card.suit % 2));
}
export function canDropSolitaire(state, from, to) {
  return validSolitaireSource(state, from) && /^(t:[0-6]|f:[0-3])$/.test(to) &&
    solitaireMove(structuredClone(state), from, to);
}

// The grabbed square, rather than always the top-left square, follows the pointer.
export function blockAnchorAt(row, column, grabX = 0, grabY = 0) {
  const x = column - grabX, y = row - grabY;
  return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && x < 8 && y >= 0 && y < 8 ? y * 8 + x : null;
}
export function movementPassed(startX, startY, x, y, pointerType) {
  return Math.hypot(x - startX, y - startY) >= (pointerType === 'touch' ? 10 : 6);
}

export function installDragControls({ root, getContext, dispatch }) {
  const doc = root.ownerDocument || globalThis.document;
  const win = doc?.defaultView || globalThis.window;
  const noop = { cancel() {}, destroy() {} };
  if (!win?.PointerEvent || !root.addEventListener || !doc?.addEventListener) return noop;
  let drag = null, suppressClick = false, dropPositions = null;
  const listeners = [];
  function listen(target, type, fn, options) {
    target.addEventListener(type, fn, options);
    listeners.push(() => target.removeEventListener(type, fn, options));
  }
  function currentMatches(d) {
    const context = getContext();
    return context && !context.blocked && context.gameId === d.gameId &&
      context.runId === d.runId && JSON.stringify(context.state) === d.expected;
  }
  function feedback(message) {
    const status = root.querySelector('.game-feedback');
    if (status && status.textContent !== message) status.textContent = message;
  }
  function clearMarks(d) {
    for (const [element, name] of d.marks) element.classList.remove(name);
    d.marks = [];
  }
  function mark(d, element, name) {
    if (!element) return;
    element.classList.add(name);
    d.marks.push([element, name]);
  }
  function finish(message) {
    const d = drag;
    if (!d) return null;
    drag = null; // Release may synchronously emit lostpointercapture.
    suppressClick ||= d.active;
    clearMarks(d);
    for (const el of d.sources) el.classList.remove('drag-source');
    root.classList.remove('puzzle-dragging');
    d.ghost?.remove();
    if(d.gameId==='words'){const label=root.querySelector('.word-selection');if(label)label.textContent=d.state.selected==null?'Drag a word, or tap its two ends':`Start: ${d.state.cells[d.state.selected]} · tap the last letter`;}
    try { if (root.hasPointerCapture(d.pointerId)) root.releasePointerCapture(d.pointerId); } catch {}
    if (message && d.active && currentMatches(d)) feedback(message);
    return d;
  }
  function cancel() { finish('Drag canceled. Your board is unchanged.'); }
  function sourceFor(event, context) {
    const el = event.target.closest?.('[data-action]');
    if (!el || !root.contains(el) || el.disabled || !el.closest('.play-surface')) return null;
    if (context.gameId === 'solitaire' && el.classList.contains('playing-card')) {
      const from = el.dataset.action === 'select' ? el.dataset.value :
        el.dataset.action === 'foundation' ? `f:${el.dataset.value}` : null;
      if (from && validSolitaireSource(context.state, from)) return { el, from };
    }
    if (context.gameId === 'words' && el.dataset.action === 'letter') {
      const start=Number(el.dataset.value);
      if(Number.isInteger(start)&&start>=0&&start<100)return {el,start};
    }
    if (context.gameId === 'blocks' && el.dataset.action === 'piece') {
      const piece = Number(el.dataset.value), shape = context.state.pieces[piece];
      if (!Number.isInteger(piece) || !shape?.length) return null;
      const squares = [...el.querySelectorAll('.piece-grid i')];
      let grab = shape[0], distance = Infinity, grabFX = .5, grabFY = .5;
      squares.forEach((square, index) => {
        const box = square.getBoundingClientRect();
        const n = Math.hypot(event.clientX - (box.left + box.width / 2), event.clientY - (box.top + box.height / 2));
        if (n < distance) { distance = n; grab = shape[index];
          grabFX = Math.max(0, Math.min(1, (event.clientX - box.left) / box.width));
          grabFY = Math.max(0, Math.min(1, (event.clientY - box.top) / box.height));
        }
      });
      return { el, piece, grabX: grab[0], grabY: grab[1], grabFX, grabFY };
    }
    return null;
  }
  function down(event) {
    if (drag) { if (event.pointerId !== drag.pointerId) cancel(); return; }
    suppressClick = false; // A new deliberate press must never be swallowed.
    if (event.isPrimary === false || event.button !== 0) return;
    const context = getContext();
    if (!context || context.blocked) return;
    const source = sourceFor(event, context);
    if (!source) return;
    drag = { ...source, gameId: context.gameId, runId: context.runId,
      expected: JSON.stringify(context.state), state: structuredClone(context.state),
      pointerId: event.pointerId, pointerType: event.pointerType,
      startX: event.clientX, startY: event.clientY, active: false,
      marks: [], sources: [], ghost: null, target: null };
    // Do not preventDefault or select anything here: ordinary clicks, taps,
    // focus, and keyboard activation retain their original behavior.
  }
  function begin(d) {
    d.active = true;
    try { root.setPointerCapture(d.pointerId); } catch { /* Document listeners remain a fallback. */ }
    root.classList.add('puzzle-dragging');
    if(d.gameId==='words')return; // The highlighted line is the gesture; no floating ghost obscures letters.
    if (d.gameId === 'solitaire' && d.from.startsWith('t:')) {
      const [, column, index] = d.from.split(':').map((x, i) => i ? Number(x) : x);
      d.sources = [...root.querySelectorAll('.tableau .playing-card')].filter(el => {
        const match = /^t:(\d+):(\d+)$/.exec(el.dataset.value);
        return match && +match[1] === column && +match[2] >= index;
      });
    } else d.sources = [d.el];
    for (const el of d.sources) el.classList.add('drag-source');
    const ghost = doc.createElement('div');
    ghost.className = 'puzzle-drag-ghost';
    ghost.setAttribute('aria-hidden', 'true');
    if (d.gameId === 'solitaire') {
      const box = d.el.getBoundingClientRect();
      d.offsetX = d.startX - box.left; d.offsetY = d.startY - box.top;
      ghost.style.width = `${box.width}px`; ghost.style.height = `${box.height}px`;
      ghost.classList.add('solitaire-ghost');
      // Lift the actual visible run, preserving its offsets and readable ranks.
      for (const source of d.sources) {
        const sourceBox = source.getBoundingClientRect(), card = source.cloneNode(true);
        for (const name of ['data-action','data-value','data-card-id','id']) card.removeAttribute(name);
        card.tabIndex = -1;
        card.classList.remove('selected', 'hinted', 'drag-source');
        card.classList.add('drag-card-face');
        Object.assign(card.style, { top: `${sourceBox.top-box.top}px`, left:'0', width:'100%', height:`${sourceBox.height}px` });
        ghost.append(card);
      }
    } else {
      // Use board-cell scale and preserve the exact point within the grabbed
      // square. The outline stays transparent so landing cells remain visible.
      ghost.classList.add('drag-piece-outline');
      const cells = [...root.querySelectorAll('.block-board [data-action="preview"]')];
      const first = cells[0].getBoundingClientRect();
      const dx = (cells[7].getBoundingClientRect().left - first.left) / 7;
      const dy = (cells[56].getBoundingClientRect().top - first.top) / 7;
      const shape = d.state.pieces[d.piece];
      ghost.style.width = `${Math.max(...shape.map(([x]) => x)) * dx + first.width}px`;
      ghost.style.height = `${Math.max(...shape.map(([, y]) => y)) * dy + first.height}px`;
      for (const [x, y] of shape) {
        const square = doc.createElement('span'); square.className = 'drag-outline-square';
        Object.assign(square.style, { left: `${x * dx}px`, top: `${y * dy}px`, width: `${first.width}px`, height: `${first.height}px` });
        ghost.append(square);
      }
      d.offsetX = d.grabX * dx + d.grabFX * first.width;
      d.offsetY = d.grabY * dy + d.grabFY * first.height;
    }
    doc.body.append(ghost); d.ghost = ghost;
  }
  function solitaireTarget(point) {
    if (!point || !root.contains(point) || !point.closest('.solitaire-board')) return null;
    const foundation = point.closest('[data-action="foundation"]');
    if (foundation) return { to: `f:${foundation.dataset.value}`, el: foundation };
    const column = point.closest('.card-column');
    const slot = column?.querySelector('[data-action="column"]');
    return slot ? { to: `t:${slot.dataset.value}`, el: column } : null;
  }
  function blockTarget(d, x, y) {
    const board = root.querySelector('.block-board');
    if (!board) return null;
    const cells = [...board.querySelectorAll('[data-action="preview"]')];
    if (cells.length !== 64) return null;
    const first = cells[0].getBoundingClientRect(), last = cells[63].getBoundingClientRect();
    // Exclude surrounding padding, but tolerate the little gaps between cells.
    if (x < first.left || x > last.right || y < first.top || y > last.bottom) return null;
    const dx = (cells[7].getBoundingClientRect().left - first.left) / 7;
    const dy = (cells[56].getBoundingClientRect().top - first.top) / 7;
    if (dx <= 0 || dy <= 0) return null;
    const column = Math.max(0, Math.min(7, Math.round((x - first.left - first.width / 2) / dx)));
    const row = Math.max(0, Math.min(7, Math.round((y - first.top - first.height / 2) / dy)));
    return { anchor: blockAnchorAt(row, column, d.grabX, d.grabY), row, column, cells };
  }
  function wordTarget(d,x,y){
    const board=root.querySelector('.word-board'),cells=board?[...board.querySelectorAll('[data-action="letter"]')]:[];
    if(cells.length!==100)return null;
    const first=cells[0].getBoundingClientRect(),last=cells[99].getBoundingClientRect();
    if(x<first.left||x>last.right||y<first.top||y>last.bottom)return null;
    const dx=(cells[9].getBoundingClientRect().left-first.left)/9,dy=(cells[90].getBoundingClientRect().top-first.top)/9;
    if(dx<=0||dy<=0)return null;
    const col=Math.max(0,Math.min(9,Math.round((x-first.left-first.width/2)/dx))),row=Math.max(0,Math.min(9,Math.round((y-first.top-first.height/2)/dy))),end=row*10+col;
    return {cells,end,line:wordLine(d.state,d.start,end)};
  }
  function update(d, event) {
    if(d.gameId==='words'){
      clearMarks(d);d.target=null;d.failure='Release outside the board cancels the selection.';
      const point=doc.elementFromPoint(event.clientX,event.clientY),target=point&&root.contains(point)&&point.closest('.word-board')?wordTarget(d,event.clientX,event.clientY):null,label=root.querySelector('.word-selection');
      if(!target){if(label)label.textContent='Outside board · release to cancel';feedback('Release to cancel. Your board is unchanged.');return;}
      const {line,cells,end}=target;
      if(!line||line.path.length<2){mark(d,cells[d.start],'word-trace');mark(d,cells[end],'word-trace-invalid');d.failure='Choose a straight line of letters. Your board is unchanged.';if(label)label.textContent='Follow a straight line';feedback(d.failure);return;}
      for(const i of line.path)mark(d,cells[i],'word-trace');
      mark(d,cells[d.start],'word-trace-start');mark(d,cells[end],'word-trace-end');
      if(label)label.textContent=line.text;feedback(`${line.text} · release to check this word`);
      if(line.index>=0)d.target={start:d.start,end};
      else d.failure='Not one of the remaining words. Try another line.';
      return;
    }
    d.ghost.style.transform = `translate(${event.clientX - d.offsetX}px, ${event.clientY - d.offsetY}px)`;
    const point = doc.elementFromPoint(event.clientX, event.clientY);
    const target = d.gameId === 'solitaire' ? solitaireTarget(point) :
      point && root.contains(point) && point.closest('.block-board') ? blockTarget(d, event.clientX, event.clientY) : null;
    clearMarks(d); d.target = null;
    if (!target) { feedback('Move over a destination, or release to cancel.'); return; }
    if (d.gameId === 'solitaire') {
      const valid = canDropSolitaire(d.state, d.from, target.to);
      mark(d, target.el, valid ? 'drag-destination-valid' : 'drag-destination-invalid');
      if (valid) d.target = { to: target.to };
      feedback(valid ? 'Release to move. Undo is available.' : 'That destination is not legal. Release to cancel.');
    } else {
      const plan = blockPlacement(d.state, d.state.pieces[d.piece], target.anchor), valid = !!plan;
      for (const [x, y] of d.state.pieces[d.piece]) {
        const column = target.column - d.grabX + x, row = target.row - d.grabY + y;
        if (column >= 0 && column < 8 && row >= 0 && row < 8)
          mark(d, target.cells[row * 8 + column], valid ? 'drag-cell-valid' : 'drag-cell-invalid');
      }
      if (valid) {
        d.target = { anchor: target.anchor };
        for (const i of plan.cleared) mark(d, target.cells[i], 'drag-clear-preview');
      }
      feedback(valid ? `Release to place · +${plan.points} points${plan.lines ? ` · ${plan.lines} ${plan.lines === 1 ? 'line' : 'lines'} clear` : ''}` : 'This overlaps or goes off the board. Release to cancel.');
    }
  }
  function move(event) {
    const d = drag;
    if (!d || event.pointerId !== d.pointerId) return;
    if (!currentMatches(d) || d.el.isConnected === false) { cancel(); return; }
    if (!d.active && !movementPassed(d.startX, d.startY, event.clientX, event.clientY, d.pointerType)) return;
    if (!d.active) begin(d);
    event.preventDefault(); update(d, event);
  }
  function up(event) {
    const d = drag;
    if (!d || event.pointerId !== d.pointerId) return;
    if (!d.active) { finish(); return; }
    event.preventDefault();
    if (!currentMatches(d) || d.el.isConnected === false) { cancel(); return; }
    update(d, event);
    const drop = d.target;
    if (drop && d.gameId === 'solitaire') {
      const dx = event.clientX - d.startX, dy = event.clientY - d.startY;
      dropPositions = new Map(d.sources.filter(el=>el.dataset.cardId).map(el=>{
        const box=el.getBoundingClientRect();
        return [el.dataset.cardId,{box:{left:box.left+dx,top:box.top+dy},face:el.dataset.face}];
      }));
    }
    finish(drop ? null : d.gameId==='words'?d.failure:'That drop does not fit. Your board is unchanged.');
    if (drop) dispatch('drag', { gameId: d.gameId, runId: d.runId, expected: d.expected,
      ...(d.gameId === 'solitaire' ? { from: d.from } : d.gameId==='blocks'?{ piece: d.piece }:{}), ...drop });
  }
  listen(root, 'pointerdown', down);
  listen(doc, 'pointermove', move, { passive: false });
  listen(doc, 'pointerup', up, { passive: false });
  listen(doc, 'pointercancel', event => { if (drag?.pointerId === event.pointerId) cancel(); });
  listen(root, 'lostpointercapture', event => { if (event.target === root && drag?.pointerId === event.pointerId) cancel(); });
  listen(root, 'click', event => {
    if (suppressClick && event.detail !== 0) { suppressClick = false; event.preventDefault(); event.stopImmediatePropagation(); }
  }, true);
  listen(doc, 'keydown', event => {
    if (drag && event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); cancel(); }
    else if (drag && (event.key === 'Tab' || event.key === 'Enter' || event.key === ' ')) cancel();
  }, true);
  listen(root, 'dragstart', event => { if (drag) event.preventDefault(); });
  listen(doc, 'visibilitychange', () => { if (doc.hidden) cancel(); });
  listen(doc, 'scroll', cancel, true);
  listen(win, 'blur', cancel);
  listen(win, 'pagehide', cancel);
  listen(win, 'resize', cancel);
  return { cancel, takeDropPositions() { const positions=dropPositions;dropPositions=null;return positions; }, destroy() { finish(); listeners.forEach(remove => remove()); } };
}
