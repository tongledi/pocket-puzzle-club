# Content depth audit — 2026-10-03

## Why expand Water first

Seven finite games previously offered only three fixed puzzles each. This is a usable introduction, not evidence of lasting replay value. Completion is binary; replay has no saved personal-best target. Block Garden already has its score loop.

Independent rule-level audit found:

| Game | Evidence from the original three boards | Meaning and limit |
| --- | --- | --- |
| Water | Exact shortest solutions: 5 / 8 / 10 pours. Complete reachable graphs: 37 / 205 / 618 tube-permutation classes; every state can still win | Very short and forgiving introductory content |
| Sliding | Exact shortest solutions: 10 / 24 / 47 using Manhattan IDA*. Recorded routes: 10 / 30 / 65 | Already offers substantial planning depth. Catalog `minimumMoves` values 10 / 20 / 33 are lower bounds, not exact optima |
| Sudoku | Unique solutions; singles-only solve uses naked/hidden placements 35/0, 39/3, 44/5 | More scanning and some hidden singles, no demonstrated advanced-deduction ramp |
| Mahjong | 14 / 24 / 36 pairs. In 1,000 seeded random-legal runs: 1,000 / 899 / 917 wins | Real pairing risk after Level 1; tile count does not prove a monotonic human difficulty ramp |
| Arrows | 9 / 9 / 12 initially clear arrows; 2 / 4 / 4 simultaneous-unblocking waves | More search workload, but legal removal cannot create a dead end |
| Words | Six words each; across/down → diagonal → reverse directions; shared target cells 0 / 1 / 2 | Genuine direction progression, but fixed-board replay becomes recognition |
| Solitaire | Complete 137 / 151 / 163-action proofs; stored heuristic success 40/40, 27/40, 6/40 | Preliminary solver-based bands, not human ratings or shortest solutions |

## Bounded Water extension

Keep Levels 1–3 byte-for-byte as catalog objects. Append six distinct boards, with no colour-renamed or tube-reordered duplicates. Four-colour puzzles first demand more planning with familiar symbols; three five-colour puzzles then increase fragmentation. All filled tubes are genuinely mixed and all additions retain two empty buffers.

| Level | Name | Colours | Colour runs | Exact minimum pours | Shortest-route opening choices |
| --- | --- | --- | --- | --- | --- |
| 4 | Layered start | 4 | 13 | 11 | 3 of 4 |
| 5 | Shared space | 4 | 14 | 12 | 2 of 4 |
| 6 | Four-way mix | 4 | 16 | 14 | 1 of 4 |
| 7 | Fifth colour | 5 | 18 | 15 | 3 of 5 |
| 8 | Cross currents | 5 | 19 | 16 | 2 of 5 |
| 9 | Full spectrum | 5 | 20 | 17 | 2 of 5 |

A colour run is a maximal adjacent group of the same colour inside a tube. Opening choices count distinct resulting positions modulo tube order. A non-optimal choice can simply add moves; it is not necessarily a trap. The fifth-colour transition intentionally provides a wider opening again rather than forcing every metric to rise. These measures explain selection; they do not calibrate how difficult or enjoyable people find the boards.

The exhaustive validator independently implements maximal pours, compares legal and illegal source/destination pairs with the shipped engine, enumerates the full finite graph, and computes distance to a solved state by reverse breadth-first search. Canonicalizing tube order is sound because every tube has the same capacity and legality depends only on its contents. Any permutation maps moves bijectively to moves, preserves move cost and the goal, and therefore preserves shortest distance. Colour identities are retained in this graph. A resource limit would fail the check rather than become a shortest-path or dead-end claim. Runtime Hint remains a separately bounded search and preserves its honest inconclusive wording.

## Completion gate and remaining work

This iteration's release gate passed on 2026-10-03: full aggregate tests, independent review, all 62 verified remote blobs, successful exact-commit Pages deployment, and two complete desktop/narrow nine-level plays. Live checks included 3→4 upgrade, old-tab preservation, reload/Undo, repeated Next, picker scrolling, replay, dead-end recovery and free-play resume. See the final 1.12.0 live-verification record in [README](README.md#live-water-expansion-verification--2026-10-03). Proof-guided automated play does not establish unaided human difficulty.

Next useful gate: a small measured audience pilot rather than another automatic content expansion. Before a formal pilot, resolve commercial hosting/analytics decisions with the owner and obtain physical-phone tests. Collect first-session completion/drop-off, voluntary next-level/replay choice, confusion points and return interest. Use that evidence to select one next change; do not infer retention from synthetic solves.

Outstanding: physical touch/assistive-technology testing, human calibration of all bands, no cross-device saves, unverified random Solitaire solvability, and no per-level personal-best persistence. Monetization, new hosting, analytics activation and traffic launch are separate owner decisions.
