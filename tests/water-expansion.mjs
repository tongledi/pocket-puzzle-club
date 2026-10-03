// Independent, uncapped verification of the append-only Water content pack.
// Run directly with: node tests/water-expansion.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {water, waterPourPlan, pour, waterSolve} from '../dist/games/modern.js';
import {clone} from '../dist/games/core.js';

const read = name => JSON.parse(fs.readFileSync(new URL(name, import.meta.url), 'utf8'));
const originals = read('./starter-pack-proofs.json').water;
const additions = read('./water-expansion-proofs.json');
const expectedMinimum = [11, 12, 14, 15, 16, 17];
const expectedRuns = [13, 14, 16, 18, 19, 20];
const catalogBefore = JSON.stringify(water.levels);
let checks = 0, comparisons = 0, hintChecks = 0;
function test(name, run) { run(); checks++; console.log('PASS', name); }

const mass = tubes => tubes.flat().sort((a, b) => a - b);
const runs = tubes => tubes.reduce((sum, tube) => sum + tube.filter((c, i) => i === 0 || tube[i - 1] !== c).length, 0);
const complete = tubes => tubes.every(tube => tube.length === 0 || (tube.length === 4 && new Set(tube).size === 1));

// Tube positions have no special rules. Any permutation maps every legal move
// a -> b to perm(a) -> perm(b), preserves its cost of one and preserves goals.
// Thus the sorted multiset of whole tubes is an exact graph quotient: paths in
// either direction lift through tube permutations, so shortest distances and
// solvability are unchanged. Colours are NOT collapsed during graph search.
// Moves from a uniform tube to an empty tube are included; their quotient edge
// is a self-loop. No heuristic move pruning, node/time/depth limit or proof route
// is used to establish a distance or to classify a dead end.
const key = tubes => JSON.stringify(tubes.map(tube => JSON.stringify(tube)).sort());

// Separate implementation of actual game rules, without calling runtime plans
// or pours. Move drops individually until the top run ends or capacity is hit.
function independentMove(tubes, from, to) {
  if (!Number.isInteger(from) || !Number.isInteger(to) || from === to ||
      !tubes[from]?.length || !tubes[to] || tubes[to].length >= 4) return null;
  const color = tubes[from][tubes[from].length - 1];
  if (tubes[to].length && tubes[to][tubes[to].length - 1] !== color) return null;
  const next = tubes.map(tube => tube.slice());
  let count = 0;
  while (next[from].length && next[from][next[from].length - 1] === color && next[to].length < 4) {
    next[to].push(next[from].pop());
    count++;
  }
  return {tubes: next, plan: {from, to, color, count}};
}

function compareMove(tubes, from, to, expected = independentMove(tubes, from, to)) {
  const state = {tubes: tubes.map(tube => tube.slice()), selected: from, hintTarget: to};
  const before = JSON.stringify(state);
  assert.deepEqual(waterPourPlan(state, from, to), expected?.plan ?? null);
  assert.equal(JSON.stringify(state), before, 'planning must not mutate a state');
  assert.equal(pour(state, from, to), !!expected);
  if (expected) {
    assert.deepEqual(state.tubes, expected.tubes);
    assert.deepEqual(mass(state.tubes), mass(tubes), 'every transition conserves every colour');
    assert(state.tubes.every(tube => tube.length <= 4));
    assert.equal(state.selected, null);
    assert.equal(state.hintTarget, null);
  } else assert.equal(JSON.stringify(state), before, 'rejected pours must be atomic');
  comparisons++;
  return expected;
}

function exhaustiveGraph(start) {
  const states = [start.map(tube => tube.slice())], ids = new Map([[key(start), 0]]);
  const edges = [], reverse = [[]], parents = [null], fromStart = [0];
  for (let cursor = 0; cursor < states.length; cursor++) {
    const tubes = states[cursor], nextIds = new Set();
    assert.equal(water.won({tubes}), complete(tubes), 'independent and runtime goals must agree');
    for (let from = 0; from < tubes.length; from++) for (let to = 0; to < tubes.length; to++) {
      const next = compareMove(tubes, from, to);
      if (!next) continue;
      const signature = key(next.tubes);
      let id = ids.get(signature);
      if (id === undefined) {
        id = states.length;
        ids.set(signature, id);
        states.push(next.tubes);
        reverse.push([]);
        parents.push({parent: cursor, move: [from, to]});
        fromStart.push(fromStart[cursor] + 1);
      }
      nextIds.add(id);
    }
    edges.push([...nextIds]);
    for (const id of nextIds) reverse[id].push(cursor);
  }
  // Exhausting the forward queue enumerates the entire reachable quotient.
  // Reverse BFS from all goals gives exact remaining distances. Only nodes not
  // reached by this fully exhausted reverse queue are called unsolvable.
  const distance = Array(states.length).fill(Infinity), goals = [];
  for (let id = 0; id < states.length; id++) if (complete(states[id])) { distance[id] = 0; goals.push(id); }
  const queue = [...goals];
  for (let cursor = 0; cursor < queue.length; cursor++) for (const id of reverse[queue[cursor]]) {
    if (distance[id] !== Infinity) continue;
    distance[id] = distance[queue[cursor]] + 1;
    queue.push(id);
  }
  return {states, ids, edges, distance, parents, fromStart, goals};
}

function pathTo(graph, id) {
  const path = [];
  while (graph.parents[id]) {
    path.push(graph.parents[id].move);
    id = graph.parents[id].parent;
  }
  return path.reverse();
}

// Choose transitions afresh from the actual labelled board. Quotient node
// representative indices are never mistaken for the current tube indices.
function exactRoute(tubes, graph) {
  let state = tubes.map(tube => tube.slice());
  const route = [];
  while (!complete(state)) {
    const remaining = graph.distance[graph.ids.get(key(state))];
    assert(Number.isFinite(remaining));
    let chosen;
    for (let a = 0; a < state.length && !chosen; a++) for (let b = 0; b < state.length; b++) {
      const next = independentMove(state, a, b);
      if (next && graph.distance[graph.ids.get(key(next.tubes))] === remaining - 1) { chosen = {next, move: [a, b]}; break; }
    }
    assert(chosen, 'every finite reverse distance must have a decreasing legal edge');
    state = chosen.next.tubes;
    route.push(chosen.move);
  }
  return route;
}

function replay(initial, route, {mustWin = true, controller = false} = {}) {
  const state = clone(initial), originalMass = mass(state.tubes);
  for (const [from, to] of route) {
    const expected = independentMove(state.tubes, from, to);
    assert(expected, 'proof route uses a legal full-run pour');
    if (controller) {
      state.selected = null;
      assert.equal(water.action(state, 'tube', from), false);
      assert.equal(water.action(state, 'tube', to), true);
    } else assert.equal(pour(state, from, to), true);
    assert.deepEqual(state.tubes, expected.tubes);
    assert.deepEqual(mass(state.tubes), originalMass);
  }
  if (mustWin) { assert(complete(state.tubes)); assert(water.won(state)); }
  return state;
}

function permutations(values) {
  if (!values.length) return [[]];
  return values.flatMap((value, i) => permutations(values.filter((_, j) => i !== j)).map(rest => [value, ...rest]));
}
function unlabeledLayout(tubes) {
  const colors = [...new Set(tubes.flat())].sort((a, b) => a - b);
  // Enumerate every colour bijection, sorting whole tubes after each one. This
  // detects duplicates under simultaneous tube permutation AND colour relabeling.
  return permutations(colors).map(order => {
    const labels = new Map(order.map((c, i) => [c, i]));
    return key(tubes.map(tube => tube.map(c => labels.get(c))));
  }).sort()[0];
}

test('Water 1–3 remain identical to original proof fixtures; only Water 4–9 append', () => {
  assert.equal(water.levels.length, 9);
  assert.equal(additions.length, 6);
  for (const [index, proof] of [...originals, ...additions].entries()) {
    const {id, level, description, state} = proof;
    assert.deepEqual(water.levels[index], {id, level, description, state});
    assert.equal(id, `water-${index + 1}`);
    assert.equal(level, index + 1);
  }
});

test('Every new board has two empty tubes, balanced colours and the specified layered structure', () => {
  for (const [index, level] of additions.entries()) {
    const {tubes, colorCount} = level.state;
    assert.equal(colorCount, index < 3 ? 4 : 5);
    assert.equal(tubes.length, colorCount + 2);
    assert.equal(tubes.filter(tube => tube.length === 0).length, 2);
    assert(tubes.every(tube => tube.length === 0 || tube.length === 4));
    assert.equal(new Set(tubes.filter(tube => tube.length).map(tube => JSON.stringify(tube))).size, colorCount,
      'filled tubes are structurally distinct within each new board');
    assert.deepEqual(mass(tubes), Array.from({length: colorCount}, (_, c) => [c, c, c, c]).flat());
    assert.equal(runs(tubes), expectedRuns[index]);
    assert.equal(level.analysis.runs, expectedRuns[index]);
    assert(!complete(tubes));
  }
  const signatures = water.levels.map(level => unlabeledLayout(level.state.tubes));
  assert.equal(new Set(signatures).size, 9, 'no board is merely a tube permutation or colour reskin of another');
});

test('The independent transition covers maximal runs, capacity truncation and invalid inputs', () => {
  const tubes = [[0, 1, 1, 1], [1, 1], [], [2, 2, 2, 2], []];
  assert.equal(compareMove(tubes, 0, 2).plan.count, 3);
  assert.equal(compareMove(tubes, 0, 1).plan.count, 2);
  assert.equal(compareMove(tubes, 3, 4).plan.count, 4);
  for (const [a, b] of [[0, 0], [0, 3], [0, -1], [-1, 0], [0, 50], [50, 0], [0.5, 2], ['0', 2], [null, 2], [0, undefined]]) compareMove(tubes, a, b);
});

const graphs = [];
for (const [index, level] of additions.entries()) test(`${level.id}: exhaustive independent BFS proves ${expectedMinimum[index]} minimum pours`, () => {
  const graph = exhaustiveGraph(level.state.tubes);
  graphs.push(graph);
  assert.equal(graph.distance[0], expectedMinimum[index]);
  assert.equal(level.minimumPours, expectedMinimum[index]);
  assert.equal(level.proof.length, expectedMinimum[index]);
  assert.equal(Math.min(...graph.goals.map(id => graph.fromStart[id])), expectedMinimum[index]);
  assert.equal(graph.states.length, level.analysis.reachableStates);
  assert.equal(graph.distance.filter(d => d === Infinity).length, level.analysis.unsolvableStates);
  assert.equal(graph.edges[0].filter(id => id !== 0).length, level.analysis.openingChoices);
  assert.equal(graph.edges[0].filter(id => graph.distance[id] === graph.distance[0] - 1).length, level.analysis.optimalOpeningChoices);
  const route = exactRoute(level.state.tubes, graph);
  assert.equal(route.length, expectedMinimum[index]);
  replay(level.state, route, {controller: true});
  let state = clone(level.state), choicePoints = 0;
  for (const move of level.proof) {
    const id = graph.ids.get(key(state.tubes));
    // This metric counts opportunities to leave an optimal route: at least one
    // distinct non-self successor does not reduce exact distance by one. It is
    // not the number of states with multiple (possibly equally good) choices.
    if (graph.edges[id].some(next => next !== id && graph.distance[next] !== graph.distance[id] - 1)) choicePoints++;
    state = replay(state, [move], {mustWin: false});
  }
  assert.equal(choicePoints, level.analysis.routeChoicePoints);
  console.log(`  ${graph.states.length} complete reachable classes; ${level.analysis.unsolvableStates} proven unsolvable; no search limits`);
});

test('Every stored and independent route replays with maximal pours, including permuted and relabeled tubes', () => {
  for (const level of [...originals, ...additions]) {
    replay(level.state, level.proof, {controller: true});
    replay(level.state, level.state.path);
    const n = level.state.tubes.length, mapping = Array.from({length: n}, (_, i) => n - 1 - i);
    const permuted = clone(level.state);
    permuted.tubes = level.state.tubes.map((_, i) => level.state.tubes[mapping[i]].map(c => level.state.colorCount - 1 - c));
    replay(permuted, level.proof.map(([a, b]) => [mapping[a], mapping[b]]), {controller: true});
    assert.equal(unlabeledLayout(permuted.tubes), unlabeledLayout(level.state.tubes));
  }
});

function checkHint(state, exactDistance) {
  state = clone(state);
  // A syntactically plausible but illegal saved route must never substitute for
  // search after a detour; selection and an obsolete target are also cleared.
  state.path = [[0, 0]];
  state.selected = 0;
  state.hintTarget = state.tubes.length - 1;
  const before = JSON.stringify(state.tubes);
  assert.equal(water.action(state, 'hint'), false);
  assert.equal(JSON.stringify(state.tubes), before, 'hints never pour');
  if (exactDistance === Infinity) {
    assert.equal(state.selected, null);
    assert.equal(state.hintTarget, null);
    assert.match(state.message, /no complete solution/);
    assert.doesNotMatch(state.message, /verified route/);
  } else if (exactDistance === 0) {
    assert.equal(state.selected, null);
    assert.equal(state.hintTarget, null);
    assert.match(state.message, /sorted/);
  } else {
    assert.match(state.message, /verified route/);
    assert.deepEqual([state.selected, state.hintTarget], state.path[0]);
    assert(state.path.length >= exactDistance, 'a hint route cannot beat the exhaustive minimum');
    replay(state, state.path, {controller: true});
  }
  hintChecks++;
}

for (const [index, level] of additions.entries()) test(`${level.id}: hints recover after real detours and identify every reachable dead end`, () => {
  const graph = graphs[index];
  // Replay the BFS-parent route to every state through ordinary selection
  // and pour actions, ensuring these are reachable detours, not invented boards.
  for (let id = 0; id < graph.states.length; id++) {
    const state = replay(level.state, pathTo(graph, id), {mustWin: false, controller: true});
    assert.deepEqual(state.tubes, graph.states[id]);
    const before = JSON.stringify(state);
    const result = waterSolve(state, {maxNodes: Infinity, maxMs: Infinity, maxDepth: Infinity});
    assert.equal(JSON.stringify(state), before, 'solver must not mutate state');
    assert.equal(result.status, graph.distance[id] === Infinity ? 'blocked' : 'solved');
    if (result.status === 'solved') replay(state, result.path);
    else assert.equal(result.path, null);
    checkHint(state, graph.distance[id]);
  }
  // A deliberately limited solver is never mistaken for an impossibility proof.
  for (const limit of [{maxNodes: 0}, {maxDepth: 0}]) {
    const result = waterSolve({...clone(level.state), path: []}, limit);
    assert.equal(result.status, 'limit');
    assert.equal(result.path, null);
  }
});

test('Cloning, solving, hints and replay never mutate the runtime catalog or its fixture routes', () => {
  for (const level of water.levels) {
    const first = clone(level.state), second = clone(level.state);
    assert.notEqual(first.tubes, level.state.tubes);
    assert.notEqual(first.tubes[0], level.state.tubes[0]);
    assert.notEqual(first.path, level.state.path);
    assert.notEqual(first.path[0], level.state.path[0]);
    water.action(first, 'hint');
    replay(first, first.path, {controller: true});
    first.tubes[0].push(99);
    first.path.push([99, 99]);
    assert.deepEqual(second, level.state);
  }
  assert.equal(JSON.stringify(water.levels), catalogBefore);
});

console.log(`WATER EXPANSION TESTS PASSED (${checks} suites; ${comparisons} engine/independent transition comparisons; ${hintChecks} reachable-state hints)`);
