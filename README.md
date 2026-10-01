# Pocket Puzzle Club — mobile game menu 1.5

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

Home presents eight original game-specific SVG covers, a featured Solitaire table, category browsing, real browser-local favourites, and the latest unfinished local rounds. Favourite preferences are stored separately from schema-1 round data and isolated in QA mode. The seven puzzle rooms share one compact clubhouse header and centred play frame; Solitaire retains its full-height felt table. Entry/Back preserves the lobby collection and scroll position, while Explore all 8 games resets it. Each game has pause, restart-same-board, new-round confirmation, hints, and up to 120 undo states. Number of moves counts successful player board mutations; hint-applied changes are not player moves. A hinted completion is real but is reported with its hint count. No pretending hints are unassisted wins.

Browser-local save schema 1 includes current state, initial board, history, timer, hints, first-play and outcome flags. No cross-device/cloud save. Private/incognito modes or clearing browser data can erase progress; storage failures show a warning. Compatible future releases must retain schema-1 saves or migrate them; product version is not used as a reason to discard compatible saves. Future incompatible migrations must preserve a backup and display a recovery choice. Stable game hash links and browser Back/Forward navigation are supported. Opening/switching games resets the viewport to the top; within-game focus restoration uses preventScroll. Instruction disclosure state survives moves. Active play excludes confirmation-modal waiting time.

## Accessibility and layout

System serif/sans typography, high-contrast controls, colour-independent liquid symbols, keyboard-focus styles, labelled cells, status announcements, reduced-motion support, modal focus loop, mobile collapsible instructions. Responsive game and clubhouse layouts, including narrow-phone breakpoints. Dense Sudoku/Word Search/playing-card controls are smaller than 44px on small screens; real-device usability and screen-reader tests are outstanding. Solitaire includes low-volume synthesized move, foundation, deal and completion cues. Sound starts off, is enabled only by an explicit toggle, and is saved separately from round data. Other games remain silent. Card movement/deal/flip animations respect reduced-motion preferences.

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

## Clubhouse release 1.4

- Warm ivory and deep-green game lobby, eight original lightweight SVG covers, category filters and real saved favourites
- First-play recommendations give way to real recent rounds; move counts, saved badges and Continue actions use local round state
- Shared compact navigation, clearer entry/back flow and readable secondary copy for all eight games
- Individual board rules, existing schema-1 saves, Solitaire card table, drag controls and QA isolation retained
- Favourites are separate browser-local preferences; storage failures do not claim a successful change
- Nine added VM suites cover lobby state, filters, favourites, multi-tab reconciliation, QA isolation, round preservation, history and failure notices
- No account, leaderboard, invented activity metrics, ads, payment or tracking added

Source and VM tests verify logic, not physical-device touch or screen-reader usability. Release browser checks must be recorded separately.

### Live browser verification — 2026-10-01

- Runtime commit `27e91e88d6b01ad45dc3fd0a8bcbc1729ba5af4a`; exact-commit Pages deployment succeeded
- Actual Chromium review at 1180 CSS-pixel desktop width and 388–400 CSS-pixel narrow width using a resized, zoomed browser window
- All eight cover assets loaded; no horizontal page overflow in the lobby or any room
- All eight entry/back paths; real category and favourite collections; empty collection and return to all games
- Water Sort legal pour, reload persistence and exact Undo verified through the UI
- Narrow Mahjong pause/resume and New game cancellation preserve the board
- Tests used `?qa=1`, preserving normal player saves; viewport and zoom restored afterward
- These checks do not establish physical touch-device or screen-reader usability


## Mobile game menu release 1.5.1

- A single felt game-home scene with eight large visual entrances and short integrated names
- Games/Favourites dock, real unfinished-round Continue, and full-tile Edit/Done favourite selection
- Shared tactile room header and settings/help overlays; gameplay rules and schema-1 saves retained
- Overlays stop active time, gate board/drag/keyboard actions, use an inert background, trap Tab and restore focus
- Entry/return motion is limited to navigation; cross-tab or timer reconciliation never replays it
- Safe-area padding, fluid height, large controls, reduced-motion support and graceful short-screen/large-zoom scrolling
- 21 clubhouse controller/markup suites plus the full existing game/save/drag/lifecycle regression suite pass

### Live browser verification — 2026-10-01

- Public GitHub Pages runtime inspected in cloud Chromium, using only the isolated `?qa=1` save namespace
- At 400×743 CSS pixels, all eight entrances, real Continue and dock fit without horizontal or vertical page overflow
- At 388×665 CSS pixels, the menu keeps readable controls and falls back to 15px of vertical scrolling
- Independent screenshot review accepted the narrow game-menu composition
- All eight narrow entry/back routes and collection context checked; settings controls remain inside the viewport
- Favourite Edit/Done selection, reload persistence, removal and empty collection checked through the UI
- Water Sort legal move, reload persistence, exact Undo and cancelled New game preserve the round
- Water Sort settings/help timer freeze, Escape, restored focus and inert background checked through the UI
- Desktop four-column composition visually checked; browser zoom/size restored after testing
- Browser DevTools are organization-disabled, so these are resized/zoomed browser checks, not device emulation or physical-phone/touch/screen-reader verification


## Install entry release 1.5.2 — local implementation

- Settings includes **Add to home screen** on mobile and **Install Pocket Puzzle** on desktop; the eight-game menu is unchanged
- Where the browser supplies `beforeinstallprompt`, one explicit tap invokes the native confirmation. Events are consumed once; repeated taps, dismissal and failures are handled
- iPhone/iPad Share guidance includes third-party browsers and desktop-mode iPads; Android, desktop Chrome/Edge and Mac Safari receive applicable manual steps
- The entry hides in standalone/iOS web-app launch mode or after the browser's `appinstalled` event. Accepting a prompt alone does not claim installation completed; no guessed installed flag is stored
- `dist/manifest.webmanifest` uses relative `start_url` and `scope` (`./`), opening the game menu without QA queries or game hashes. Its stable `id` is `/pocket-puzzle-club/dist/`: manifest IDs resolve against the **origin**, not the manifest directory
- Original green/ivory brand artwork supplies opaque 192px and 512px PNG icons (512px is mask-safe), plus a 180px Apple touch icon and legacy standalone metadata
- Internet is required. No service worker, offline cache, analytics, permissions or account service was added. Some devices keep installed-app and browser saves separate; no cross-device/cloud-save promise is made
- Existing schema-1 rounds and QA namespaces are retained; the native install prompt is disabled in `?qa=1` to avoid accidental host installation during QA
- 16 added simulated-event/static-asset suites cover prompt timing, accepted/dismissed/error outcomes, duplicate taps, delayed events, installed-mode changes, platform guidance, modal/history timing, all eight game guards, QA isolation and asset resolution

Run `npm test` for the aggregate suite. `npm run dev -- --base=/pocket-puzzle-club/dist/` simulates the production path and serves the manifest/PNG MIME types. No install/build step is required. Local browser navigation is restricted in the current QA environment, so this release has **not** received browser visual QA, physical-device installation testing or live deployment verification. No app has been installed on the QA host.

Implementation references: [browser install criteria](https://web.dev/articles/install-criteria), [manifest ID processing](https://www.w3.org/TR/appmanifest/#id-member), [iPhone web apps](https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios), [Mac Safari web apps](https://support.apple.com/en-gb/104996). Native prompt availability remains controlled by the browser and its eligibility/engagement rules.
