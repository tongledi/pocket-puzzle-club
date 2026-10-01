# Pocket Puzzle Club — project preview 1.3

English-first, mobile-responsive casual puzzle collection. Working title only; no trademark clearance or domain purchase. Static original DOM/CSS implementations with separate pure rule modules and a shared controller. No packages, account system, ads, purchases, live AI, remote fonts, tracking SDKs or external analytics calls. Solitaire sound is optional and off by default; all other games are silent. This checkout is hosting-independent.

## Local development

Requires Node.js 20 or later. No dependency install or build is needed.

- `npm run dev` serves the game at `http://localhost:4173/`
- `npm test` runs rule, lifecycle, variety, regression and relative-path tests
- `npm run dev -- --base=/pocket-puzzle-club/` simulates repository-subpath hosting

The app uses hash routes and relative assets. Browser saves are origin-specific and do not automatically transfer to another host. No open-source license has been granted; public repository visibility is not an MIT license.

## Preview hosting

GitHub Pages can serve the `main` branch at `/ (root)`. Root `index.html` redirects to `./dist/`; `.nojekyll` keeps the files static. No workflow or personal credential is required in this repository. See `deployment/README.md`. GitHub Pages is proposed only for a project preview without ads or commerce, not as the final commercial host.

## Included games and exact rules

- **Klondike Solitaire:** 52-card random draw-one deal, seven standard columns, alternating colours in descending rank, King-only empty columns, same-suit Ace–King foundations; unlimited waste recycling. Face-down top cards flip when exposed. Random deals are not guaranteed winnable. Hints prioritize revealing covered cards and foundation moves, avoid immediate reversals and pointless whole-column King transfers. They remain legal-move suggestions, not a solver. Selected cards can use Send to foundation; Larger cards enables a horizontally scrollable enlarged board. Test completion uses legal public actions from a constructed deterministic fixture, rather than claiming all random deals solved.
- **Mahjong Solitaire:** 72 tiles across three layers, eight columns, 18 English-labeled pictures appearing four times each. Identical pairs only; no tile above and at least one side free. Randomized removal assignment guarantees a starting solution. Alternate matches may cause dead ends. Hints validate the saved route or run a bounded solver; an inconclusive result is explicitly called a legal pair rather than a guaranteed solution. Legacy 28-tile saves remain playable, with an invitation to start a new upgraded board.
- **Water Sort:** five colours, four units per colour, seven capacity-four tubes. Pour an entire available top run up to destination capacity, into empty space or the same colour. Reverse construction records a legal solution. Following that path yields guaranteed hints; deviating changes hints to legal-move suggestions only. Each colour must occupy one full tube to win.
- **Block Garden:** fixed-orientation blocks placed by selecting a piece, previewing its full footprint at a tapped top-left cell, then pressing Place block on an eight-by-eight board. Clear full rows/columns simultaneously. Score one per placed cell plus ten per line. Refill after using all three pieces. No win; the round ends when no remaining piece fits. Best score persists locally across rounds and Undo does not reduce the record.
- **Arrow Escape:** six-by-six board, single-cell directional arrows, blocked by any remaining arrow along the exit ray. Remove all to win. Reverse insertion guarantees a removal order, and any legal removal preserves solvability.
- **Sliding Tiles:** standard four-by-four 15-puzzle, legal orthogonal moves only, solved order 1–15 then blank. Scrambled from solution by legal moves. Hints reverse recorded path, including player detours; they are valid but not necessarily shortest.
- **English Word Search:** six target words on a ten-by-ten grid, eight straight directions, matching either endpoint order. Twelve fixed word themes randomly placed with filler; hints indicate a starting letter. All targets are embedded and checked.
- **Sudoku:** randomized solved-grid backtracking plus clue removal with exact uniqueness checks; 36–40 clues. Bounded fallback uses valid symmetries of a known unique puzzle with extra clues. Pencil notes, selected peers and matching-number highlighting, remaining-number counts, fixed clues, conflicts, numeric keyboard/Delete/Backspace, erase and solution-cell hints. Old saves remain valid; New game creates a varied puzzle.

## Shared behaviour

Home shows real rendered game-board previews, eight immediate play entries, and the most recent local round. Each game has pause, restart-same-board, new-round confirmation, hints, and up to 120 undo states. Number of moves counts successful player board mutations; hint-applied changes are not player moves. A hinted completion is real but is reported with its hint count. No pretending hints are unassisted wins.

Browser-local save schema 1 includes current state, initial board, history, timer, hints, first-play and outcome flags. No cross-device/cloud save. Private/incognito modes or clearing browser data can erase progress; storage failures show a warning. Compatible future releases must retain schema-1 saves or migrate them; product version is not used as a reason to discard compatible saves. Future incompatible migrations must preserve a backup and display a recovery choice. Stable game hash links and browser Back/Forward navigation are supported. Opening/switching games resets the viewport to the top; within-game focus restoration uses preventScroll. Instruction disclosure state survives moves. Active play excludes confirmation-modal waiting time.

## Accessibility and layout

System serif/sans typography, high-contrast controls, colour-independent liquid symbols, keyboard-focus styles, labelled cells, status announcements, reduced-motion support, modal focus loop, mobile collapsible instructions. Responsive breakpoints at 1050/800/480px. Dense Sudoku/Word Search/playing-card controls are smaller than 44px on small screens; real-device usability and screen-reader tests are outstanding. Solitaire includes low-volume synthesized move, foundation, deal and completion cues. Sound starts off, is enabled only by an explicit toggle, and is saved separately from round data. Other games remain silent. Card movement/deal/flip animations respect reduced-motion preferences.

## Verification

Run `npm test`. No install or build is needed; `dist/` is served directly.

- 24 rule suites passed: 500 deck-conservation deals; legal Klondike sequence/foundation moves; 500 Mahjong complete generated rounds; 1,000 Water Sort generated solutions; 100 independently scored block runs; 500 sliding paths plus detours; 1,000 arrow boards; 100 independent Sudoku uniqueness checks; 500 word-search boards; 32,000 randomized UI-valid actions. Includes invalid moves, exact wins, hints, colour/number conservation and simultaneous line clears. Five malformed-input guards were also repaired; final run has zero warnings.
- Shared controller VM tests passed for all eight: real first move, exact undo state, pause/input gating, restart original board, resume, new-round reset, reload persistence, denied-storage warning, instrumentation test exclusion and first-valid-move deduplication. VM harness is not browser automation.
- Static HTML/CSS and JavaScript syntax checked. Preview markup deliberately removes interactive controls from miniature boards to avoid nested buttons.
- **Browser/mobile visual QA is required for each release.** Rule and VM tests do not establish touch behavior or browser layout. Actual desktop/mobile gameplay and screenshots must still be checked.

This is a gameplay prototype, not a production-readiness claim. Before public launch: real touch/keyboard/screen-reader playtests, visual QA, save-corruption recovery, migration checks, performance/device checks, analytics consent/coverage and jurisdictional review are still needed.

## Corrective pass 1.1 — source-reproduced fixes, awaiting browser confirmation

- Route-focus restoration no longer targets the bottom game switcher on game entry; normal Back/Forward and hash links added
- Modal wait time excluded on Cancel, Escape and history transitions; instruction expansion persists
- Block footprint preview, explicit placement, bounded edge ghosts, flexible mobile piece tray, saved best score, clear round-end/replay
- Solitaire scrollable larger cards, compact waste placeholder, destination hints, non-oscillating hint ranking, quick foundation action
- Water source/destination hint distinction and stale-hint cleanup; clearer blocked-pour feedback
- Arrow blockage indicators; Word Search progress, reset selection on hint, expanded themes; Sliding Tiles keyboard control
- Meaningful layered Mahjong and varied uniquely solved Sudoku with notes; old saves preserved

Additional tests: 100 new Sudoku puzzles independently checked with 100 distinct answers and clue patterns; 500 upgraded Mahjong layouts and 18,000 legal solution-pair removals; source-level shared-flow regression harness for placement/undo/reload, modal timing, Back navigation and hint cleanup. These are not a substitute for browser playtesting.

## Solitaire reference experience 1.3

- Full-height felt table replaces Solitaire’s editorial sidebar and nested panels; all eight games remain available through All games
- Compact round HUD, persistent Undo/Hint/Foundation/Restart action tray, and a collapsed How to play/preferences dialog
- Ivory pip cards with two-way corners, readable ranks, layered card backs, full-sequence drag ghosts and landing feedback
- Non-mutating move/deal/flip motion with reduced-motion support; synthesized optional sound without downloads or autoplay
- Completed-deal summary and clear new-deal/replay flow, without currencies or progression
- Existing schema-1 saves, draw-one rules, undo history, QA isolation and cross-tab reconciliation retained
- New 16-suite polish regression module covers shell/card identity, help focus and time gating, replay, sound failure handling, animations and storage/controller guards

Automated tests are not a substitute for real-device touch or assistive-technology testing.
