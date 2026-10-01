// Isolated controller and markup regression tests. No browser/touch/visual claim.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { games as classics, solitaire } from '../dist/games/classics.js';
import { games as modern } from '../dist/games/modern.js';
import { games as logic } from '../dist/games/logic.js';
import { clone, button } from '../dist/games/core.js';
import { commitDrag, installDragControls } from '../dist/drag.js';

const source = fs.readFileSync(new URL('../dist/app.js', import.meta.url), 'utf8')
  .replace(/^import .*;$/gm, '') + `
  globalThis.inspect = () => ({ saves, recent, current, paused, confirmAction, rulesState, events, helpOpen, soundOn });
  globalThis.handle = handle;
  globalThis.persist = persist;
  globalThis.render = render;
  globalThis.cardPositions = cardPositions;
  globalThis.animateTable = animateTable;
`;
const NORMAL_KEY = 'pocket-puzzle-v1';
const QA_KEY = 'pocket-puzzle-qa-v1';
const gameIds = ['solitaire', 'mahjong', 'water', 'blocks', 'arrows', 'sliding', 'words', 'sudoku'];
let checks = 0;
const failures = [];
function test(name, run) {
  try { run(); checks++; console.log('PASS', name); }
  catch (error) { failures.push({ name, error }); console.error('FAIL', name, error.stack); }
}
const classList = () => {
  const names = new Set();
  return { add: (...x) => x.forEach(n => names.add(n)), remove: (...x) => x.forEach(n => names.delete(n)),
    contains: n => names.has(n), toggle(n, on) { const next = on ?? !names.has(n); next ? names.add(n) : names.delete(n); return next; } };
};
function boot({ store = new Map(), hash = '', qa = true, reducedMotion = true } = {}) {
  let html = '', time = 0, audioCreated = 0, tones = 0;
  const docEvents = {}, winEvents = {}, appEvents = {}, intervals = [];
  const element = { dataset: {}, focus() {}, classList: classList(), style: {}, setAttribute() {}, animate() { return { cancel() {} }; } };
  const app = {
    get innerHTML() { return html; }, set innerHTML(value) { html = value; },
    addEventListener: (type, handler) => appEvents[type] = handler,
    querySelector: () => element, querySelectorAll: () => [],
    classList: classList(), dataset: {}, setAttribute() {}
  };
  class AudioContext {
    constructor() { audioCreated++; this.currentTime = 0; this.state = 'running'; this.destination = {}; }
    resume() { return Promise.resolve(); }
    createOscillator() {
      tones++;
      return { type: '', frequency: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} },
        connect() {}, start() {}, stop() {} };
    }
    createGain() { return { gain: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} }, connect() {} }; }
  }
  const window = { addEventListener: (type, handler) => winEvents[type] = handler, scrollTo() {}, AudioContext };
  const document = { querySelector: () => app, querySelectorAll: () => [],
    addEventListener: (type, handler) => docEvents[type] = handler,
    hasFocus: () => true, hidden: false, referrer: '', activeElement: element,
    body: { classList: classList(), dataset: {} }, documentElement: { classList: classList(), dataset: {} } };
  const ctx = { commitDrag, installDragControls, classics, modern, logic, clone, button, console, crypto,
    URLSearchParams, structuredClone, AudioContext, performance: { now: () => time },
    matchMedia: query => ({ matches: query.includes('reduced-motion') ? reducedMotion : true }),
    navigator: { webdriver: true }, location: { hash, hostname: 'localhost', search: qa ? '?qa=1' : '' },
    history: { pushState(...args) { ctx.location.hash = args[2]; } },
    localStorage: { getItem: key => store.get(key), setItem: (key, value) => store.set(key, value) },
    document, window, setInterval: callback => intervals.push(callback),
    requestAnimationFrame() { return 1; }, cancelAnimationFrame() {}, setTimeout() { return 1; }, clearTimeout() {} };
  vm.createContext(ctx);
  vm.runInContext(source, ctx);
  return { ctx, app, store, docEvents, winEvents, appEvents,
    advance: ms => time += ms, tick: () => intervals[0](),
    audio: () => ({ created: audioCreated, tones }) };
}
const round = t => t.ctx.inspect().saves.solitaire;
const play = t => t.ctx.handle('open', 'solitaire');
const readSave = (t, key = QA_KEY) => JSON.parse(t.store.get(key));
const card = (rank, suit, up = true) => ({ rank, suit, up });
function almostWon() {
  return { stock: [], waste: [], tableau: [[card(13, 0)], [], [], [], [], [], []],
    foundation: Array.from({ length: 4 }, (_, suit) => Array.from({ length: suit ? 13 : 12 }, (_, i) => card(i + 1, suit))),
    selected: null, message: '' };
}

test('all eight routes and inert Home previews survive the Solitaire-only shell', () => {
  const t = boot();
  assert.equal((t.app.innerHTML.match(/class="game-card"/g) || []).length, 8);
  assert.ok(!/<button\b[^>]*>(?:(?!<\/button>)[\s\S])*<button\b/.test(t.app.innerHTML), 'covers must not introduce nested buttons');
  for (const id of gameIds) {
    t.ctx.handle('open', id);
    assert.equal(t.ctx.inspect().current, id);
    assert.ok(t.app.innerHTML.includes('aria-label="' + [...classics, ...modern, ...logic].find(g => g.id === id).title + ' game"'));
  }
  assert.equal(Object.keys(readSave(t).saves).length, 8);
});

test('stock, exact Undo, reload and schema-1 QA isolation remain unchanged', () => {
  const store = new Map([[NORMAL_KEY, 'normal-storage-sentinel'], ['pocket-local-events', '["normal-event"]']]);
  const t = boot({ store }); play(t);
  const before = JSON.stringify(round(t).state);
  t.ctx.handle('stock');
  assert.equal(round(t).moves, 1);
  assert.equal(round(t).history.length, 1);
  assert.equal(JSON.stringify(round(t).history[0].state), before);
  assert.equal(readSave(t).schema, 1);
  const after = JSON.stringify(round(t).state);
  const loaded = boot({ store, hash: '#solitaire' });
  assert.equal(JSON.stringify(round(loaded).state), after);
  loaded.ctx.handle('undo');
  assert.equal(JSON.stringify(round(loaded).state), before);
  assert.equal(round(loaded).moves, 0);
  assert.equal(store.get(NORMAL_KEY), 'normal-storage-sentinel');
  assert.equal(store.get('pocket-local-events'), '["normal-event"]');
  assert.equal(loaded.ctx.inspect().events.length, 0);
});

test('pause and confirmation dialogs gate Solitaire state, history and active time', () => {
  const t = boot(); play(t);
  const before = JSON.stringify(round(t).state);
  t.ctx.handle('pause'); t.advance(3000); t.ctx.handle('stock'); t.ctx.handle('hint');
  assert.equal(JSON.stringify(round(t).state), before);
  assert.equal(round(t).moves, 0); assert.equal(round(t).hints, 0);
  t.ctx.handle('pause'); t.ctx.handle('restart'); t.advance(5000);
  t.ctx.handle('stock'); t.ctx.handle('hint');
  assert.equal(JSON.stringify(round(t).state), before);
  assert.equal(round(t).history.length, 0);
  t.ctx.handle('cancel'); t.advance(1000); t.tick();
  assert.equal(round(t).activeMs, 1000);
});

test('stale or repeated confirmation cannot reset the round without an active dialog', () => {
  const t = boot(); play(t); t.ctx.handle('stock');
  const before = JSON.stringify(round(t));
  t.ctx.handle('confirm');
  assert.equal(JSON.stringify(round(t)), before, 'unexpected confirmation must be a no-op');
  t.ctx.handle('new'); t.ctx.handle('confirm');
  const next = JSON.stringify(round(t));
  t.ctx.handle('confirm');
  assert.equal(JSON.stringify(round(t)), next, 'double activation must preserve the newly-created round');
});

test('a remote replacement wins before a stale Solitaire stock action', () => {
  const store = new Map(), a = boot({ store }); play(a);
  const b = boot({ store, hash: '#solitaire' });
  a.ctx.handle('new'); a.ctx.handle('confirm');
  const expected = JSON.stringify(round(a).state), runId = round(a).runId;
  b.ctx.handle('stock');
  assert.equal(round(b).runId, runId);
  assert.equal(JSON.stringify(round(b).state), expected);
  assert.equal(round(b).moves, 0);
  assert.match(b.app.innerHTML, /another tab/);
  b.ctx.handle('stock');
  assert.equal(round(b).moves, 1, 'a fresh action on the adopted round still works');
});

const renderedCards = state => [...solitaire.view(state).matchAll(/<button\b([^>]*data-card-id="([^"]+)"[^>]*)>/g)]
  .map(([, attributes, id]) => ({ id, attributes }));
const cardId = c => `${c.suit}-${c.rank}`;
const visibleCards = state => [...state.tableau.flat(), ...state.stock.slice(-1), ...state.waste.slice(-1), ...state.foundation.flatMap(p => p.slice(-1))];

test('every rendered card has one stable suit/rank identity without mutating the round', () => {
  const state = solitaire.create(), before = JSON.stringify(state);
  const rendered = renderedCards(state), expected = visibleCards(state).map(cardId);
  assert.deepEqual(rendered.map(c => c.id).sort(), expected.sort());
  assert.equal(new Set(rendered.map(c => c.id)).size, rendered.length);
  assert.equal(JSON.stringify(state), before, 'rendering is read-only');
  const drawn = cardId(state.stock.at(-1));
  solitaire.action(state, 'stock');
  const waste = renderedCards(state).find(c => /data-value="w"/.test(c.attributes));
  assert.equal(waste.id, drawn, 'stock-to-waste transition retains the same identity');
  assert.match(waste.attributes, /data-face="up"/);
  assert.equal(new Set(renderedCards(state).map(c => c.id)).size, renderedCards(state).length);
});

test('face cards, pip cards and hidden cards keep accessible labels and legal source controls', () => {
  const state = { stock: [], waste: [], foundation: [[], [], [], []],
    tableau: Array.from({ length: 7 }, () => []), selected: null, message: '' };
  for (let suit = 0; suit < 4; suit++) for (let rank = 1; rank <= 13; rank++) state.tableau[(rank + suit) % 7].push(card(rank, suit));
  const html = solitaire.view(state), rendered = renderedCards(state);
  assert.equal(rendered.length, 52); assert.equal(new Set(rendered.map(c => c.id)).size, 52);
  for (const { attributes } of rendered) {
    assert.match(attributes, /data-action="select"/);
    assert.match(attributes, /data-value="t:[0-6]:\d+"/);
    assert.match(attributes, /aria-label="(?:[AKQJ2-9]|10)[♠♥♣♦]"/);
  }
  assert.equal((html.match(/class="card-court"/g) || []).length, 12);
  assert.equal((html.match(/class="card-pips /g) || []).length, 40);
  state.tableau[0][0].up = false;
  assert.match(renderedCards(state).find(c => c.id === cardId(state.tableau[0][0])).attributes, /data-face="down" aria-label="Face-down card"/);
});

test('Solitaire alone gets compact chrome with rules hidden until requested', () => {
  const t = boot(); play(t);
  assert.match(t.app.innerHTML, /class="solitaire-room"/);
  assert.match(t.app.innerHTML, /class="table-header"/);
  assert.match(t.app.innerHTML, /class="table-footer"/);
  assert.doesNotMatch(t.app.innerHTML, /class="(?:site-header|game-sidebar|game-switcher|table-help-dialog)"/);
  assert.equal(t.ctx.inspect().helpOpen, false);
  assert.match(t.app.innerHTML, /data-action="help"[^>]*aria-expanded="false"/);
  t.ctx.handle('help');
  assert.equal(t.ctx.inspect().helpOpen, true);
  assert.match(t.app.innerHTML, /class="confirm-dialog table-help-dialog" role="dialog" aria-modal="true"/);
  assert.match(t.app.innerHTML, /data-action="zoom"/);
  for (const id of gameIds.filter(id => id !== 'solitaire')) {
    t.ctx.handle('open', id);
    assert.equal(t.ctx.inspect().helpOpen, false);
    assert.doesNotMatch(t.app.innerHTML, /class="solitaire-room"/);
    assert.match(t.app.innerHTML, /class="room-header"/);
    assert.match(t.app.innerHTML, /class="room-bottom"/);
  }
});

test('help gates board actions, preserves selection and does not count reading time', () => {
  const t = boot(); play(t);
  const before = JSON.stringify(round(t).state);
  t.advance(1000); t.ctx.handle('help'); t.advance(9000);
  t.ctx.handle('stock'); t.ctx.handle('hint'); t.ctx.handle('new');
  assert.equal(JSON.stringify(round(t).state), before);
  assert.equal(round(t).moves, 0); assert.equal(round(t).hints, 0);
  assert.equal(t.ctx.inspect().confirmAction, null);
  t.docEvents.keydown({ key: 'Escape' });
  assert.equal(t.ctx.inspect().helpOpen, false);
  assert.equal(t.ctx.inspect().paused, false);
  t.advance(1000); t.tick(); assert.equal(round(t).activeMs, 2000);
  t.ctx.handle('help'); t.ctx.handle('zoom');
  assert.equal(round(t).state.large, true);
  assert.equal(round(t).moves, 0); assert.equal(round(t).history.length, 0);
  assert.equal(t.ctx.inspect().helpOpen, true);
  t.ctx.handle('help'); assert.match(t.app.innerHTML, /solitaire-board large-cards/);
});

test('Back/Forward dismisses help without charging its waiting time', () => {
  const t = boot(); play(t); t.advance(1000); t.ctx.handle('help'); t.advance(9000);
  t.ctx.location.hash = '#water'; t.winEvents.popstate();
  assert.equal(t.ctx.inspect().helpOpen, false); assert.equal(t.ctx.inspect().current, 'water');
  assert.equal(round(t).activeMs, 1000);
  t.ctx.location.hash = '#solitaire'; t.winEvents.popstate();
  assert.equal(t.ctx.inspect().current, 'solitaire'); assert.equal(t.ctx.inspect().helpOpen, false);
});

test('sound control rerenders keep focus inside the open help dialog', () => {
  const t = boot(); play(t); t.ctx.handle('help');
  const control = () => ({ dataset: { action: 'sound', value: '' }, focus() { t.ctx.document.activeElement = this; } });
  const headerSound = control(), dialogSound = control();
  t.app.querySelectorAll = selector => selector.includes('table-help-dialog') ? [dialogSound] : selector === '[data-action]' ? [headerSound, dialogSound] : [];
  t.ctx.document.activeElement = dialogSound;
  t.ctx.handle('sound');
  assert.equal(t.ctx.document.activeElement, dialogSound, 'focus must not jump to the matching header control behind aria-modal');
});

test('sound defaults off, is opt-in and uses a QA-isolated preference', () => {
  const store = new Map([[NORMAL_KEY + '-sound', 'on']]);
  const t = boot({ store }); play(t);
  assert.equal(t.ctx.inspect().soundOn, false);
  assert.match(t.app.innerHTML, /data-action="sound"[^>]*aria-pressed="false"/);
  t.ctx.handle('stock'); assert.deepEqual(t.audio(), { created: 0, tones: 0 });
  const before = JSON.stringify(round(t));
  t.ctx.handle('sound');
  assert.equal(t.ctx.inspect().soundOn, true);
  assert.equal(JSON.stringify(round(t)), before, 'sound preference must not change round state, history or counters');
  assert.equal(store.get(QA_KEY + '-sound'), 'on');
  assert.equal(store.get(NORMAL_KEY + '-sound'), 'on');
  assert.equal(t.audio().created, 1); assert.ok(t.audio().tones > 0);
  const priorTones = t.audio().tones; t.ctx.handle('stock'); assert.ok(t.audio().tones > priorTones);
  t.ctx.handle('sound'); const muted = t.audio().tones;
  t.ctx.handle('stock'); assert.equal(t.audio().tones, muted);
  assert.equal(store.get(QA_KEY + '-sound'), 'off');
  t.ctx.handle('sound'); const loaded = boot({ store, hash: '#solitaire' });
  assert.equal(loaded.ctx.inspect().soundOn, true);
  assert.deepEqual(loaded.audio(), { created: 0, tones: 0 }, 'saved preference must not autoplay on page load');
});

test('audio remains Solitaire-only and fails safely when browser support is absent or blocked', () => {
  const t = boot(); play(t); t.ctx.handle('sound'); const tones = t.audio().tones;
  for (const id of gameIds.filter(id => id !== 'solitaire')) {
    t.ctx.handle('open', id); t.ctx.handle('hint'); t.ctx.handle('restart'); t.ctx.handle('confirm');
  }
  assert.equal(t.audio().tones, tones, 'the other seven games remain silent');
  for (const mode of ['missing', 'denied']) {
    const u = boot(); play(u);
    if (mode === 'missing') delete u.ctx.window.AudioContext;
    else u.ctx.window.AudioContext = class { constructor() { throw new Error('Audio blocked'); } };
    assert.doesNotThrow(() => u.ctx.handle('sound'));
    assert.doesNotThrow(() => u.ctx.handle('stock'));
    assert.equal(round(u).moves, 1); assert.equal(round(u).history.length, 1);
    u.ctx.handle('undo'); assert.equal(round(u).moves, 0);
  }
});

test('winning uses legal controller actions, stops time and supports confirmed replay or another deal', () => {
  const t = boot(); play(t);
  const state = almostWon(), original = JSON.stringify(state), oldRun = round(t).runId;
  round(t).state = state; round(t).initial = clone(state); t.ctx.persist();
  t.ctx.handle('select', 't:0:0'); t.ctx.handle('auto');
  assert.equal(solitaire.won(round(t).state), true); assert.equal(round(t).finished, true);
  assert.equal(round(t).moves, 1); assert.equal(round(t).history.length, 1);
  assert.match(t.app.innerHTML, /class="table-result"/);
  assert.match(t.app.innerHTML, /data-action="restart"[^>]*>Replay this deal/);
  assert.match(t.app.innerHTML, /data-action="new"[^>]*>Play another deal/);
  const completed = JSON.stringify(round(t).state), time = round(t).activeMs;
  t.advance(20000); t.tick(); t.ctx.handle('stock');
  assert.equal(round(t).activeMs, time); assert.equal(JSON.stringify(round(t).state), completed);
  t.ctx.handle('restart'); assert.equal(t.ctx.inspect().confirmAction, 'restart');
  t.ctx.handle('cancel'); assert.equal(JSON.stringify(round(t).state), completed);
  t.ctx.handle('restart'); t.ctx.handle('confirm');
  assert.equal(JSON.stringify(round(t).state), original); assert.notEqual(round(t).runId, oldRun);
  assert.equal(round(t).moves, 0); assert.equal(round(t).history.length, 0); assert.equal(round(t).finished, false);
  const replayRun = round(t).runId;
  t.ctx.handle('new'); t.ctx.handle('confirm');
  assert.notEqual(round(t).runId, replayRun); assert.equal(round(t).state.stock.length, 24);
  assert.equal(round(t).moves, 0); assert.equal(round(t).history.length, 0);
  assert.doesNotMatch(t.app.innerHTML, /class="table-result"/);
});



test('card motion is transient, scoped to Solitaire and bypassed with reduced motion', () => {
  function scene(t) {
    const animations = [], rect = { left: 20, top: 35, width: 80, height: 120 };
    const moving = { dataset: { cardId: '0-13', face: 'down' },
      getBoundingClientRect: () => ({ ...rect }), closest: () => ({}),
      animate: (frames, options) => animations.push({ frames, options }) };
    t.app.querySelectorAll = selector => selector === '.solitaire [data-card-id]' ? [moving] : [];
    t.app.querySelector = selector => selector === '.stock-pile' ? { getBoundingClientRect: () => ({ left: 0, top: 0 }) } : null;
    return { moving, rect, animations };
  }
  const t = boot({ reducedMotion: false }); play(t);
  const ui = scene(t), beforeState = JSON.stringify(round(t)), prior = t.ctx.cardPositions();
  ui.rect.left = 130; ui.rect.top = 170; ui.moving.dataset.face = 'up';
  t.ctx.animateTable(prior);
  assert.equal(ui.animations.length, 1);
  assert.match(ui.animations[0].frames[0].transform, /translate\(-110px,-135px\)/);
  assert.equal(ui.animations[0].frames.at(-1).transform, 'translate(0,0) rotate(0deg)');
  assert.equal(JSON.stringify(round(t)), beforeState, 'visual motion must not modify any saved round data');
  const samePosition = t.ctx.cardPositions(); ui.moving.dataset.face = 'down';
  t.ctx.animateTable(samePosition); assert.equal(ui.animations.length, 2);
  assert.equal(ui.animations[1].frames[0].transform, 'scaleX(.12)');
  t.ctx.animateTable(new Map(), true); assert.equal(ui.animations.length, 3);
  assert.equal(ui.animations[2].frames[0].opacity, 0);
  const reduced = boot({ reducedMotion: true }); play(reduced); const reducedUi = scene(reduced);
  reduced.ctx.animateTable(new Map(), true); assert.equal(reducedUi.animations.length, 0);
  t.ctx.handle('open', 'water'); ui.animations.length = 0;
  t.ctx.animateTable(new Map(), true); assert.equal(ui.animations.length, 0);
});

test('rejected audio resume cannot escape into the controller', () => {
  const t = boot(); play(t); let caught = 0;
  const OriginalAudio = t.ctx.window.AudioContext;
  t.ctx.window.AudioContext = class extends OriginalAudio {
    resume() { return { catch(handler) { caught++; handler(new Error('Autoplay policy')); } }; }
  };
  assert.doesNotThrow(() => t.ctx.handle('sound'));
  assert.ok(caught > 0);
  t.ctx.handle('stock'); assert.equal(round(t).moves, 1);
});

if (failures.length) {
  console.error(`SOLITAIRE POLISH TESTS FAILED (${checks} passed; ${failures.length} failed)`);
  process.exitCode = 1;
} else console.log(`SOLITAIRE POLISH TESTS PASSED (${checks}; isolated VM/markup, not browser visual QA)`);
