// Isolated controller, localStorage, and accessibility-markup regressions.
// These tests do not claim browser layout, real focus, or touch verification.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { games as classics } from '../dist/games/classics.js';
import { games as modern } from '../dist/games/modern.js';
import { games as logic } from '../dist/games/logic.js';
import { clone, button } from '../dist/games/core.js';
import { commitDrag, installDragControls } from '../dist/drag.js';

const KEY = 'pocket-puzzle-v1', games = [...classics, ...modern, ...logic];
const ids = ['solitaire', 'mahjong', 'water', 'blocks', 'sliding', 'arrows', 'sudoku', 'words'];
const source = fs.readFileSync(new URL('../dist/app.js', import.meta.url), 'utf8')
  .replace(/^import .*;$/gm, '') + `
  globalThis.inspect = () => ({ saves, recent, current, paused, confirmAction, notice, storageOK,
    favorites, lobbyView, lobbyScroll, editingFavorites, helpOpen, settingsOpen });
  globalThis.handle = handle; globalThis.persist = persist; globalThis.home = home;
  globalThis.render = render;
`;
function boot({ store = new Map(), hash = '', search = '' } = {}) {
  let html = '', time = 0, focused = true, canAccessStorage = true, focusedSelector;
  const docEvents = {}, winEvents = {}, intervals = [], pushes = [];
  const element = { dataset: {}, focus() {} };
  const app = {
    get innerHTML() { return html; }, set innerHTML(value) { html = value; },
    addEventListener() {}, querySelectorAll: () => [],
    querySelector(selector) { return { dataset: {}, focus() { focusedSelector = selector; } }; }
  };
  const ctx = {
    commitDrag, installDragControls, classics, modern, logic, clone, button, console, crypto,
    URLSearchParams, matchMedia: () => ({ matches: true }), navigator: { webdriver: true },
    history: { pushState(...args) { pushes.push(args); ctx.location.hash = args[2]; } },
    location: { hash, hostname: 'localhost', search }, performance: { now: () => time },
    localStorage: {
      getItem: key => { if (!canAccessStorage) throw Error('Storage unavailable'); return store.get(key); },
      setItem: (key, value) => { if (!canAccessStorage) throw Error('Storage unavailable'); store.set(key, value); }
    },
    document: { querySelector: () => app, addEventListener: (name, fn) => docEvents[name] = fn,
      hasFocus: () => focused, hidden: false, referrer: '', activeElement: element },
    window: { addEventListener: (name, fn) => winEvents[name] = fn, scrollTo() {} },
    setInterval: fn => intervals.push(fn)
  };
  vm.createContext(ctx); vm.runInContext(source, ctx);
  return { ctx, app, store, docEvents, winEvents, pushes,
    advance: ms => time += ms, tick: () => intervals[0](), focus: value => focused = value,
    access: value => canAccessStorage = value, focusedSelector: () => focusedSelector };
}
let checks = 0;
const failures = [];
function test(name, fn) {
  try { fn(); checks++; console.log('PASS', name); }
  catch (error) { failures.push({ name, error }); console.error('FAIL', name, error.stack); }
}
const tiles = t => [...t.app.innerHTML.matchAll(/data-game="([^"]+)"/g)].map(match => match[1]);
const tileButtons = t => [...t.app.innerHTML.matchAll(/<button class="game-card"([^>]*)>/g)].map(match => match[1]);
const state = (t, id = t.ctx.inspect().current) => t.ctx.inspect().saves[id];
const stringify = value => JSON.stringify(value);
const open = (t, id) => t.ctx.handle('open', id);
const key = (t, value, shiftKey = false) => {
  let prevented = false;
  t.docEvents.keydown({ key: value, shiftKey, preventDefault() { prevented = true; } });
  return prevented;
};
const editing = t => { t.ctx.handle('lobby', 'favorites'); t.ctx.handle('edit-favorites'); };
const modalMarkup = (t, label) => {
  assert.match(t.app.innerHTML, /<div class="app-scene [^"]*" inert>/, 'background is inert');
  assert.match(t.app.innerHTML, new RegExp('role="dialog" aria-modal="true" aria-labelledby="' + label + '"'));
  assert.equal((t.app.innerHTML.match(/role="dialog"/g) || []).length, 1, 'one active dialog');
  assert.match(t.app.innerHTML, new RegExp('id="' + label + '"'));
};

test('main menu has exactly eight named visual buttons without generating rounds or fake resume', () => {
  const t = boot();
  assert.deepEqual(tiles(t), ids);
  assert.equal(Object.keys(t.ctx.inspect().saves).length, 0);
  assert.equal(t.store.has(KEY), false);
  assert.equal((t.app.innerHTML.match(/class="cover-art /g) || []).length, 8);
  assert.equal((t.app.innerHTML.match(/class="menu-game-name"/g) || []).length, 8);
  assert.ok(!/<button\b[^>]*>(?:(?!<\/button>)[\s\S])*<button\b/.test(t.app.innerHTML));
  for (const g of games) {
    assert.ok(t.app.innerHTML.includes('./art/' + g.id + '.svg'));
    assert.ok(t.app.innerHTML.includes('aria-label="Play ' + g.title + '"'));
    assert.ok(!t.app.innerHTML.includes(g.subtitle), 'menu tiles contain names, not editorial descriptions');
    assert.ok(!t.app.innerHTML.includes(g.rules), 'instructions stay out of the menu');
  }
  assert.doesNotMatch(t.app.innerHTML, /class="menu-resume"|data-action="filter"|Find your kind of play|A good place to begin/);
  assert.match(t.app.innerHTML, /<h1 id="menu-title" tabindex="-1">/);
  assert.match(t.app.innerHTML, /<nav class="menu-dock" aria-label="Main navigation">/);
  assert.match(t.app.innerHTML, /data-value="all" aria-current="page"/);
  assert.match(t.app.innerHTML, /data-action="settings"[^>]*aria-label="Settings" aria-haspopup="dialog"/);
});

test('favourites Edit and Done turn whole tiles into accessible selectors without opening games', () => {
  const t = boot();
  t.ctx.handle('lobby', 'favorites');
  assert.deepEqual(tiles(t), []);
  assert.match(t.app.innerHTML, /Your favourites/);
  assert.match(t.app.innerHTML, /data-action="edit-favorites"[^>]*>Choose games/);
  const roundData = t.store.get(KEY);
  t.ctx.handle('edit-favorites');
  assert.equal(t.ctx.inspect().editingFavorites, true);
  assert.deepEqual(tiles(t), ids);
  assert.match(t.app.innerHTML, /data-action="edit-favorites"[^>]*aria-pressed="true"[^>]*>Done/);
  for (const attrs of tileButtons(t)) { assert.match(attrs, /data-action="favorite"/); assert.match(attrs, /aria-pressed="false"/); }
  t.ctx.handle('favorite', 'water'); t.ctx.handle('favorite', 'words');
  assert.deepEqual(JSON.parse(t.store.get(KEY + '-favorites')), ['water', 'words']);
  assert.equal(t.store.get(KEY), roundData, 'favourites never rewrite schema-1 round data');
  assert.equal(t.ctx.inspect().current, null);
  assert.equal(Object.keys(t.ctx.inspect().saves).length, 0);
  assert.deepEqual(tiles(t), ids, 'selected tiles remain visible until Done');
  assert.match(t.app.innerHTML, /aria-label="Remove Water Sort from favourites" aria-pressed="true"/);
  assert.doesNotMatch(t.app.innerHTML, /class="menu-resume"/);
  t.ctx.handle('edit-favorites');
  assert.equal(t.ctx.inspect().editingFavorites, false);
  assert.deepEqual(tiles(t), ['water', 'words']);
  for (const attrs of tileButtons(t)) assert.match(attrs, /data-action="open"/);
  assert.equal(t.ctx.location.hash, '#favorites');
  const loaded = boot({ store: t.store, hash: '#favorites' });
  assert.equal(loaded.ctx.inspect().editingFavorites, false);
  assert.deepEqual(tiles(loaded), ['water', 'words']);
  loaded.ctx.handle('edit-favorites'); loaded.ctx.handle('favorite', 'water'); loaded.ctx.handle('favorite', 'words'); loaded.ctx.handle('edit-favorites');
  assert.deepEqual(tiles(loaded), []);
  assert.deepEqual(JSON.parse(t.store.get(KEY + '-favorites')), []);
});

test('leaving favourites edit mode resets selection controls but preserves choices', () => {
  const t = boot(); editing(t); t.ctx.handle('favorite', 'sudoku');
  t.ctx.handle('lobby', 'all');
  assert.equal(t.ctx.inspect().editingFavorites, false); assert.deepEqual(tiles(t), ids);
  for (const attrs of tileButtons(t)) assert.match(attrs, /data-action="open"/);
  t.ctx.handle('lobby', 'favorites'); assert.deepEqual(tiles(t), ['sudoku']);
  t.ctx.handle('edit-favorites');
  t.ctx.location.hash = '#'; t.winEvents.popstate();
  assert.equal(t.ctx.inspect().editingFavorites, false); assert.equal(t.ctx.inspect().lobbyView, 'all');
  t.ctx.handle('lobby', 'favorites'); assert.deepEqual(tiles(t), ['sudoku']);
});

test('favourite edits reconcile other tabs, sanitize IDs, and remain QA-isolated', () => {
  const store = new Map([[KEY + '-favorites', '["water","water","fake","constructor"]']]);
  const a = boot({ store }), b = boot({ store });
  editing(a); editing(b);
  a.ctx.handle('favorite', 'words'); b.ctx.handle('favorite', 'blocks');
  assert.deepEqual(JSON.parse(store.get(KEY + '-favorites')), ['water', 'words', 'blocks']);
  a.winEvents.storage({ key: KEY + '-favorites' });
  assert.deepEqual([...a.ctx.inspect().favorites], ['water', 'words', 'blocks']);
  assert.equal(a.ctx.inspect().editingFavorites, true);
  const qa = boot({ store, search: '?qa=1' }); editing(qa); qa.ctx.handle('favorite', 'sudoku');
  assert.deepEqual(JSON.parse(store.get('pocket-puzzle-qa-v1-favorites')), ['sudoku']);
  assert.deepEqual(JSON.parse(store.get(KEY + '-favorites')), ['water', 'words', 'blocks']);
});

test('all game entry and Back flows preserve exact rounds and the selected collection', () => {
  const t = boot();
  for (const id of ids) {
    open(t, id); const before = stringify(state(t, id));
    assert.ok(t.app.innerHTML.includes('aria-label="' + games.find(g => g.id === id).title + ' game"'));
    assert.match(t.app.innerHTML, /data-action="settings"/);
    t.ctx.handle('home');
    assert.equal(t.ctx.inspect().current, null); assert.equal(t.ctx.inspect().lobbyView, 'all');
    assert.equal(stringify(state(t, id)), before); assert.equal(JSON.parse(t.store.get(KEY)).schema, 1);
  }
  editing(t); t.ctx.handle('favorite', 'solitaire'); t.ctx.handle('edit-favorites');
  open(t, 'solitaire'); t.ctx.handle('stock'); const before = stringify(state(t).state);
  assert.match(t.app.innerHTML, /aria-label="Back to Favourites"/);
  t.ctx.handle('home'); assert.deepEqual(tiles(t), ['solitaire']); assert.equal(t.ctx.location.hash, '#favorites');
  open(t, 'solitaire'); assert.equal(stringify(state(t).state), before);
});

test('resume reflects the most recent genuine unfinished round and skips finished or invalid saves', () => {
  const t = boot();
  assert.doesNotMatch(t.app.innerHTML, /class="menu-resume"/);
  open(t, 'solitaire'); t.ctx.handle('stock'); const original = stringify(state(t).state); t.ctx.handle('home');
  assert.match(t.app.innerHTML, /class="menu-resume"[^>]*data-value="solitaire"[^>]*aria-label="Continue Solitaire"/);
  open(t, 'water'); t.ctx.handle('home');
  assert.match(t.app.innerHTML, /class="menu-resume"[^>]*data-value="water"/);
  state(t, 'water').finished = true; t.ctx.render();
  assert.match(t.app.innerHTML, /class="menu-resume"[^>]*data-value="solitaire"/);
  assert.doesNotMatch(t.app.innerHTML, /aria-label="Continue Water Sort"/);
  open(t, 'solitaire'); assert.equal(stringify(state(t).state), original);
  t.ctx.handle('home'); state(t, 'solitaire').finished = true; t.ctx.render();
  assert.doesNotMatch(t.app.innerHTML, /class="menu-resume"|aria-label="Continue /);
  state(t, 'solitaire').finished = false; state(t, 'solitaire').state = {}; t.ctx.render();
  assert.doesNotMatch(t.app.innerHTML, /class="menu-resume"/);
});

test('storage failures keep favourite edits transactional and explain the unsaved choice', () => {
  const t = boot(); open(t, 'water'); t.ctx.handle('home'); editing(t);
  const before = t.store.get(KEY); t.access(false);
  t.ctx.handle('favorite', 'water');
  assert.match(t.app.innerHTML, /Favourites cannot be saved/);
  assert.equal(t.store.get(KEY), before); assert.equal(t.ctx.inspect().favorites.length, 0);
  assert.match(t.app.innerHTML, /aria-label="Add Water Sort to favourites" aria-pressed="false"/);
  t.ctx.handle('favorite', 'words'); assert.equal(t.ctx.inspect().favorites.length, 0);
  t.access(true); t.ctx.handle('favorite', 'water');
  assert.deepEqual([...t.ctx.inspect().favorites], ['water']);
  assert.doesNotMatch(t.app.innerHTML, /Favourites cannot be saved/);
});

test('browser history restores favourites without pushing a second route', () => {
  const t = boot(); editing(t); t.ctx.handle('favorite', 'words'); t.ctx.handle('edit-favorites'); open(t, 'words');
  const pushes = t.pushes.length; t.ctx.location.hash = '#favorites'; t.winEvents.popstate();
  assert.equal(t.ctx.inspect().current, null); assert.equal(t.ctx.inspect().lobbyView, 'favorites');
  assert.deepEqual(tiles(t), ['words']); assert.equal(t.pushes.length, pushes);
  t.ctx.location.hash = '#water'; t.winEvents.popstate();
  assert.equal(t.ctx.inspect().current, 'water'); assert.equal(t.pushes.length, pushes);
});

test('room favourite controls are transactional and All games exits settings to the full menu', () => {
  const t = boot(); editing(t); t.ctx.handle('favorite', 'water'); t.ctx.handle('edit-favorites'); open(t, 'water');
  assert.match(t.app.innerHTML, /aria-label="Back to Favourites"/);
  t.ctx.handle('settings'); modalMarkup(t, 'settings-title');
  assert.match(t.app.innerHTML, /data-action="lobby" data-value="all"[^>]*>All games/);
  const before = stringify(state(t)); t.access(false); t.ctx.handle('favorite', 'water');
  assert.equal(t.ctx.inspect().favorites.length, 1); assert.match(t.app.innerHTML, /Favourites cannot be saved/);
  t.ctx.handle('favorite', 'water'); assert.equal(t.ctx.inspect().favorites.length, 1);
  t.access(true); t.ctx.handle('favorite', 'water');
  assert.equal(t.ctx.inspect().favorites.length, 0); assert.doesNotMatch(t.app.innerHTML, /Favourites cannot be saved/);
  assert.equal(stringify(state(t)), before);
  t.ctx.handle('lobby', 'all'); assert.deepEqual(tiles(t), ids);
  assert.equal(t.ctx.inspect().settingsOpen, false); assert.equal(t.ctx.inspect().lobbyView, 'all');
});

test('all eight settings and help dialogs block board actions and exclude time until Escape', () => {
  for (const id of ids) for (const overlay of ['settings', 'help']) {
    const t = boot(); open(t, id); t.advance(1000); t.ctx.handle(overlay);
    modalMarkup(t, overlay + '-title');
    assert.equal(state(t).activeMs, 1000, id + ' records play before the dialog');
    const before = stringify(state(t)); t.advance(9000);
    for (const action of ['hint', 'undo', 'stock', 'restart', 'tile', 'number', 'place', 'arrow', 'tube', 'letter']) t.ctx.handle(action, 0);
    assert.equal(stringify(state(t)), before, id + '/' + overlay + ' blocks board and counter changes');
    assert.equal(t.ctx.inspect().confirmAction, null);
    t.tick(); assert.equal(state(t).activeMs, 1000, id + ' stays paused across timer ticks');
    t.advance(4000); key(t, 'Escape');
    assert.equal(t.ctx.inspect().helpOpen, false); assert.equal(t.ctx.inspect().settingsOpen, false);
    assert.equal(t.ctx.inspect().paused, false);
    assert.doesNotMatch(t.app.innerHTML, /role="dialog"|class="app-scene [^"]*" inert/);
    t.advance(1000); t.tick(); assert.equal(state(t).activeMs, 2000, id + ' counts only active play');
  }
});

test('help is requested per game, with accessible text kept out of the playing surface', () => {
  for (const g of games) {
    const t = boot(); open(t, g.id);
    assert.ok(!t.app.innerHTML.includes(g.rules));
    t.ctx.handle('settings'); t.ctx.handle('help');
    assert.equal(t.ctx.inspect().helpOpen, true); assert.equal(t.ctx.inspect().settingsOpen, false);
    modalMarkup(t, 'help-title'); assert.ok(t.app.innerHTML.includes(g.rules));
    assert.match(t.app.innerHTML, /aria-label="Close how to play"/);
    t.ctx.handle('help'); assert.ok(!t.app.innerHTML.includes(g.rules));
  }
});

test('settings and help block Sliding and Sudoku keyboard input but leave controls usable after close', () => {
  for (const overlay of ['settings', 'help']) {
    const slide = boot(); open(slide, 'sliding');
    const r = state(slide), z = r.state.cells.indexOf(0), target = r.state.trail.at(-1);
    const arrow = { '-4': 'ArrowUp', 4: 'ArrowDown', '-1': 'ArrowLeft', 1: 'ArrowRight' }[target - z];
    assert.ok(arrow); slide.ctx.handle(overlay); const before = stringify(r);
    for (const value of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) key(slide, value);
    assert.equal(stringify(r), before); key(slide, 'Escape');
    assert.equal(key(slide, arrow), true); assert.equal(r.moves, 1);
    const sudoku = boot(); open(sudoku, 'sudoku');
    const s = state(sudoku), i = s.state.given.findIndex(value => !value);
    sudoku.ctx.handle('cell', i); sudoku.ctx.handle(overlay); const prior = stringify(s);
    for (const value of ['1', '9', '0', 'Backspace', 'Delete']) key(sudoku, value);
    assert.equal(stringify(s), prior); key(sudoku, 'Escape');
    assert.equal(key(sudoku, String(s.state.answer[i])), true);
    assert.equal(s.moves, 1); assert.equal(s.state.cells[i], s.state.answer[i]);
  }
});

test('Back and Forward clear every overlay without charging waiting time or duplicating history', () => {
  for (const id of ids) for (const overlay of ['settings', 'help', 'restart']) {
    const t = boot(); open(t, id); t.advance(1000); t.ctx.handle(overlay); t.advance(9000);
    const board = stringify(state(t).state), pushes = t.pushes.length;
    t.ctx.location.hash = '#favorites'; t.winEvents.popstate();
    assert.equal(t.ctx.inspect().current, null);
    assert.equal(t.ctx.inspect().helpOpen, false); assert.equal(t.ctx.inspect().settingsOpen, false);
    assert.equal(t.ctx.inspect().confirmAction, null); assert.equal(t.ctx.inspect().editingFavorites, false);
    assert.equal(state(t, id).activeMs, 1000, id + '/' + overlay + ' does not count dialog time');
    assert.equal(stringify(state(t, id).state), board); assert.equal(t.pushes.length, pushes);
    t.advance(4000); t.ctx.location.hash = '#' + id; t.winEvents.popstate();
    assert.equal(t.ctx.inspect().current, id); assert.equal(state(t).activeMs, 1000);
    assert.doesNotMatch(t.app.innerHTML, /role="dialog"/);
    t.advance(1000); t.tick(); assert.equal(state(t).activeMs, 2000);
  }
});

test('restart and new-game cancellation preserve all eight rounds and never leave the background inert', () => {
  for (const id of ids) for (const action of ['restart', 'new']) {
    const t = boot(); open(t, id); const original = stringify(state(t));
    if (action === 'new') t.ctx.handle('settings');
    t.ctx.handle(action); assert.equal(t.ctx.inspect().confirmAction, action);
    assert.equal(t.ctx.inspect().settingsOpen, false); modalMarkup(t, 'dialog-title');
    assert.equal(t.focusedSelector(), '[data-action="cancel"]');
    t.advance(9000); t.ctx.handle('cancel'); assert.equal(stringify(state(t)), original);
    assert.equal(t.ctx.inspect().confirmAction, null); assert.equal(t.ctx.inspect().settingsOpen, false);
    assert.doesNotMatch(t.app.innerHTML, /role="dialog"|class="app-scene [^"]*" inert/);
    t.ctx.handle('confirm'); assert.equal(stringify(state(t)), original, 'stale Confirm stays inert');
    t.advance(1000); t.tick(); assert.equal(state(t).activeMs, 1000);
  }
});

test('settings to help and pause transitions never double-charge overlay reading time', () => {
  for (const id of ids) {
    const t = boot(); open(t, id); t.advance(1000); t.ctx.handle('settings'); t.advance(4000);
    t.ctx.handle('help'); t.advance(5000); key(t, 'Escape');
    t.advance(1000); t.tick(); assert.equal(state(t).activeMs, 2000);
    t.ctx.handle('settings'); t.advance(4000); t.ctx.handle('pause');
    assert.equal(t.ctx.inspect().paused, true); assert.equal(t.ctx.inspect().settingsOpen, false);
    t.advance(5000); t.ctx.handle('pause'); t.advance(1000); t.tick();
    assert.equal(state(t).activeMs, 3000);
  }
});

test('dialog Tab loops and Escape return focus to reachable controls', () => {
  for (const overlay of ['settings', 'help', 'restart']) {
    const t = boot(); open(t, 'water'); t.ctx.handle(overlay);
    const controls = [0, 1, 2].map(index => ({ dataset: { action: 'control-' + index }, focus() { t.ctx.document.activeElement = this; } }));
    t.app.querySelectorAll = selector => selector === '.confirm-dialog button' ? controls : [];
    t.ctx.document.activeElement = controls.at(-1);
    assert.equal(key(t, 'Tab'), true); assert.equal(t.ctx.document.activeElement, controls[0]);
    assert.equal(key(t, 'Tab', true), true); assert.equal(t.ctx.document.activeElement, controls.at(-1));
    key(t, 'Escape');
    const expected = overlay === 'help' ? '[data-action="help"]' : '[data-action="settings"]';
    assert.equal(t.focusedSelector(), expected);
  }
  const menu = boot(); menu.ctx.handle('settings'); modalMarkup(menu, 'settings-title');
  assert.equal(Object.keys(menu.ctx.inspect().saves).length, 0);
  key(menu, 'Escape'); assert.equal(menu.ctx.inspect().settingsOpen, false);
  assert.equal(menu.focusedSelector(), '[data-action="settings"]');
});

test('settings rerenders retain focus inside the dialog rather than matching background controls', () => {
  const t = boot(); open(t, 'water'); t.ctx.handle('settings');
  const control = () => ({ dataset: { action: 'sound', value: '' }, focus() { t.ctx.document.activeElement = this; } });
  const background = control(), dialog = control();
  t.app.querySelectorAll = selector => selector === '.scene-dialog [data-action]' ? [dialog] : selector === '[data-action]' ? [background, dialog] : [];
  t.ctx.document.activeElement = dialog; const before = stringify(state(t));
  t.ctx.handle('sound');
  assert.equal(t.ctx.document.activeElement, dialog);
  assert.equal(t.ctx.inspect().settingsOpen, true); modalMarkup(t, 'settings-title');
  assert.equal(stringify(state(t)), before);
});

test('remote round replacement closes stale overlays before accepting a new action', () => {
  for (const overlay of ['settings', 'help']) {
    const store = new Map(), a = boot({ store }); open(a, 'solitaire');
    const b = boot({ store, hash: '#solitaire' }); b.ctx.handle(overlay);
    a.ctx.handle('new'); a.ctx.handle('confirm'); const expected = stringify(state(a).state);
    b.ctx.handle('stock');
    assert.equal(b.ctx.inspect().helpOpen, false); assert.equal(b.ctx.inspect().settingsOpen, false);
    assert.equal(state(b).runId, state(a).runId); assert.equal(stringify(state(b).state), expected);
    assert.equal(state(b).moves, 0); assert.match(b.app.innerHTML, /another tab/);
    b.ctx.handle('stock'); assert.equal(state(b).moves, 1);
  }
});

if (failures.length) {
  console.error(`CLUBHOUSE TESTS FAILED (${checks} passed; ${failures.length} failed)`); process.exitCode = 1;
} else console.log(`CLUBHOUSE TESTS PASSED (${checks}; isolated controller/markup, not browser visual QA)`);
