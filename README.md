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
- **Water Sort:** five colours, four units per colour, seven capacity-four tubes. Pour an entire available top run up to destination capacity, into empty space or the same colour. Reverse construction records a legal solution. Hints validate that full route or run a bounded search after detours. An exhausted search reports a dead end; a time/node/depth limit produces a legal suggestion without a solution guarantee. Each colour must occupy one full tube to win.
- **Block Garden:** fixed-orientation blocks placed by selecting a piece, previewing its full footprint at a tapped top-left cell, then pressing Place block on an eight-by-eight board. Clear full rows/columns simultaneously. Score one per placed cell plus ten per line. Refill after using all three pieces. No win; the round ends when no remaining piece fits. Best score persists locally across rounds and Undo does not reduce the record.
- **Arrow Escape:** six-by-six board, single-cell directional arrows, blocked by any remaining arrow along the exit ray. Remove all to win. Reverse insertion guarantees a removal order, and any legal removal preserves solvability.
- **Sliding Tiles:** standard four-by-four 15-puzzle, legal orthogonal moves only, solved order 1–15 then blank. Scrambled from solution by legal moves. Hints reverse recorded path, including player detours; they are valid but not necessarily shortest.
- **English Word Search:** six target words on a ten-by-ten grid, eight straight directions, matching either endpoint order. Twelve fixed word themes randomly placed with filler; hints indicate a starting letter. All targets are embedded and checked.
- **Sudoku:** randomized solved-grid backtracking plus clue removal with exact uniqueness checks; 36–40 clues. Bounded fallback uses valid symmetries of a known unique puzzle with extra clues. Pencil notes, selected peers and matching-number highlighting, remaining-number counts, fixed clues, conflicts, numeric keyboard/Delete/Backspace, erase and solution-cell hints. Old saves remain valid; New game creates a varied puzzle.

## Shared behaviour

Home presents eight original game-specific SVG covers, a featured Solitaire table, category browsing, real browser-local favourites, and the latest unfinished local rounds. Favourite preferences are stored separately from schema-1 round data and isolated in QA mode. The seven puzzle rooms share one compact clubhouse header and centred play frame; Solitaire retains its full-height felt table. Entry/Back preserves the lobby collection and scroll position, while Explore all 8 games resets it. Each game has pause, restart-same-board, new-round confirmation, hints, and up to 120 undo states. Number of moves counts successful player board mutations; hint-applied changes are not player moves. Hint use is counted in the saved round. Solitaire displays the hint count in its result; the other result summaries currently show moves and active time. A hint-assisted completion is not an unassisted win.

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


### Install guide layout fix 1.5.3

Live browser QA found that the legacy confirmation action-row CSS also applied to the install guide, placing its text in narrow columns. The install guide now has an explicit, more-specific block layout; all other dialog layouts and the lobby are unchanged. A source-level CSS/markup regression guard was added, and the full runtime/manifest asset-version graph was advanced to 1.5.3. Browser visual confirmation of this correction is a separate deployment check.


## Gameplay refinement 1.6.0 — Solitaire and Block Garden

- The accepted mobile game menu is unchanged
- Solitaire outlines legal destinations after a card is selected. An invalid destination preserves the source and explains the rule; tapping the selection again cancels. Stock and recycle messages describe the actual result. Draw-one rules and non-guaranteed random deals are unchanged
- Block Garden previews exactly which rows/columns will clear, along with the exact points. Drag previews use the same pure placement plan as tap/commit. Unavailable tray pieces are labeled, and the next fitting piece is selected automatically
- Placement and line-clear effects are transient, respect reduced motion, and never delay or modify a saved move. New blocks, points and line clears receive explicit feedback
- A repeated Place event cannot commit the next piece without a new preview. Ended rounds stop board/hint input but retain Undo, new-round and replay-original options. Best score survives Undo
- Schema-1 saves, QA isolation, cross-tab conflict checks, the eight game rules and the existing install entry remain intact
- Thirteen added rule/controller/animation suites cover exact simultaneous-clear scoring, malformed legacy selections, invalid moves, repeat input, Undo, replay, pause/dialog cancellation, navigation/reload, reduced motion and save safety. Lifecycle tests now exercise the actual preview-then-place path

Local aggregate tests and independent code review pass. Live browser visual/interaction checks for this release are recorded separately; Node and simulated-pointer tests do not establish real-phone touch or screen-reader behavior.


### Narrow gameplay layout correction 1.6.1

Live 1.6.0 QA verified exact Undo/reload, invalid destinations, repeated actions and an actual pointer-drag line clear. It also found the top foundation destination marker clipped by the scroll container and Block Garden's tray/actions extending unnecessarily far below a 400×668 CSS-pixel viewport. The foundation marker is now inset; narrow Block Garden removes duplicate instructions, uses a viewport-bounded square board, and compacts the tray/placement/stats spacing. All buttons remain reachable by ordinary scrolling on unusually short screens. The eight-game lobby is unchanged. This correction requires its own post-deployment visual check.

### Live gameplay verification — 2026-10-01

- Runtime 1.6.1 commit `a9d1d839b463c79553fcaf25da15a8b6a92b70a6`; [exact-commit Pages deployment succeeded](https://github.com/tongledi/pocket-puzzle-club/actions/runs/36858926754). All 43 source files matched remote Git blobs; two existing `.gitkeep` files were retained
- Cloud Chromium checked at 1183×758 desktop and 400×668 narrow CSS-pixel viewports. The narrow view uses a resized browser window at 125% zoom, not device emulation or physical touch
- Solitaire: source remains selected after invalid target; legal foundation marked; repeated foundation action counted once; actual pointer drag, exact Undo, canceled restart, reload and return to menu checked
- Block Garden: edge rejection; score/line forecast; repeated placement counted once; actual pointer drag completed a line for the predicted 11 points; exact Undo/reload; round played through legal UI moves to no-moves ending; ended input blocked; Undo reopened the round; canceled new game and replay-original checked
- On the corrected narrow Block Garden active screen, all eight rows, tray and Undo/Hint/Restart were visible; controls bottom measured 631.6px in the 668px viewport. Normal short-screen scrolling remains available. Solitaire footer controls were visible and the foundation marker remained inside its target
- All eight entry/back routes and the unchanged menu checked. The other six rooms received route/layout smoke checks, not a new full gameplay audit. No horizontal page overflow observed
- Independent screenshot review found no overlap or clipping in the final two game layouts
- All interactions used `?qa=1` and its separate save namespace. Pointer cancellation, capture loss, visibility/blur interruption, reduced motion and stale-drop conflicts also retain synthetic regression coverage; real-phone touch and assistive-technology testing remain outstanding


## Matching-puzzle refinement 1.7.0

- Mahjong keeps classic no-cover/one-free-side rules, exact 72-tile inset geometry and legacy 28-tile saves. Selected tiles mark matching free partners; blocked taps identify the upper tile or two side neighbours. Cancellation, changed selection, pair progress and dead ends have explicit feedback
- Water Sort marks every legal destination with the exact pour size, distinguishes full tubes from mismatched colours, labels sorted tubes and reports five-colour progress. Hint validates the complete saved route or searches after detours with node/time/depth caps. Solved, proven blocked and inconclusive results are kept distinct; every returned solution consists of normal maximal pours
- Arrow Escape traces an inspected ray only to its first blocker; the actual blocker has a × badge. Hints expose one clear exit. Remaining count and nonempty no-exit handling are explicit. Normal boards do not show every answer in advance
- Short pour, newly-free-tile and exit feedback is visual-only, respects reduced motion, and has no delayed state mutation or animation callback. Undo, navigation and overlays replace/cancel the effect naturally
- Existing generators, all eight rules, accepted game-home design, schema-1 save isolation/conflict guards, Solitaire/Block Garden polish and install manifest remain intact
- Thirteen added suites cover markings, exact blockers/paths, legal and invalid input, cancellation, rapid repeats, exact Undo, restart, overlay gates, reload/navigation, hint proof and limits, and reduced-motion effects. One hundred seeded Water detours returned 99 replay-verified solutions and one proven dead end; separate existing tests retain 1,000 generated Water routes, 1,000 Arrow boards and 500 Mahjong layouts

Local aggregate tests and independent code review passed. An independent exhaustive BFS comparison agreed with Water search on 300 random two-colour/four-tube states. Live desktop/narrow-browser verification is recorded separately. This is not a real-phone touch, screen-reader or OS-installation test.


### Water label layout fix 1.7.1

Live narrow-browser QA found legacy selected/hint pseudo-labels duplicating the new concise tube labels and adding unnecessary height. The scoped CSS reset now wins the legacy specificity; the full cache-version graph advances to 1.7.1. A static regression guard protects this reset. Post-deployment narrow-layout verification is recorded separately.


### Narrow Water control fit 1.7.2

The two-row Water board now allocates 16 fewer pixels of glass height per row at the 668px QA viewport, leaving room for a two-line hint and the Undo/Hint/Restart row. The minimum glass height stays 104px; unusually short screens retain normal scrolling. All other layouts and game behavior are unchanged.

### Live matching-puzzle verification — 2026-10-01

- Final runtime 1.7.2 commit `b9f2b8dacc71cca5db90e5d0478c348c46b68d3e`; [exact-commit Pages deployment succeeded](https://github.com/tongledi/pocket-puzzle-club/actions/runs/36863347816). All 44 local source files matched remote Git blobs, with two existing `.gitkeep` files retained
- Cloud Chromium checked at 1185×758 desktop and 402×668 narrow CSS-pixel viewports. Narrow QA used a resized window at 125% zoom, not a physical phone or device emulator
- All three games: legal and invalid moves, meaningful hints, selected-source cancellation where applicable, exact Undo/reload, canceled restart and entry/back checked through UI. Repeated Water destination input and an Arrow double-click counted one move only
- Mahjong: side-blocked tap marked two neighbours; keyboard activation of a covered lower tile identified its upper blocker; selected matches were highlighted. A complete 36-pair round was played through UI hints and legal pairs; victory, Undo reopening and original-board restart passed
- Water Sort: a rejected full destination retained the selected tube; complete hinted route finished this saved puzzle in 11 legal pours. Victory, Undo reopening, replay, canceled New game, pause/resume and help/Escape passed. After the final layout fix, real pour/Undo preserved exact state, duplicate labels were absent, and all seven tubes, a two-line hint and controls were visible
- Arrow Escape: blocked ray/× badge agreed with the actual first blocker. Full 31-arrow round completed by UI hints/legal taps; victory, Undo reopening and original-board restart passed
- Narrow control-row bottoms measured 649px for Mahjong, 634.6px for Arrows and 645.8px for Water in the 668px viewport at the checked states. Longer messages and shorter screens retain ordinary scrolling. All eight entry/back routes had no horizontal page overflow
- Independent screenshot review accepted the final narrow Mahjong, Arrows and Water layouts. Browser zoom and desktop size were restored afterward
- Final aggregate `npm test` passed, including 14 matching-puzzle suites and the previous full regression set. The Water solver also passed an independent 300-state exhaustive-BFS comparison; search depth is capped at 128 and reports inconclusive when any search budget is hit
- Every destructive/new-round browser interaction used `?qa=1` and its isolated save namespace. Normal saves were not reset. No OS installation was attempted; physical touch-device and assistive-technology testing remain outstanding

## Logic puzzle refinement 1.8.0 — Sliding Tiles, Word Search and Sudoku

- Sliding Tiles marks the legal neighboring tiles, reports the direction of each move and briefly slides the moved tile into the empty space. Its recorded-route hint is explicitly valid but not necessarily shortest
- Word Search supports live straight-line pointer selection in all eight directions, plus the existing two-endpoint tap/keyboard fallback. The line and selected letters remain transient until a valid release. Invalid, outside, cancelled, interrupted or stale drags do not change the saved board; a release cannot also become a second tap
- Word Search displays compact six-word progress chips, clear found marks and contextual first-letter hints. Tapping the chosen start again cancels endpoint selection
- Sudoku keeps selection, fixed clues, number/pencil mode and duplicate warnings legible. Pencil notes show their keypad toggle state; Erase sits beside Pencil; the nine-number keypad remains in one row. Arrow keys move between cells without row wrapping, N changes pencil mode and browser modifier shortcuts are left alone
- Duplicate conflicts use a symbol and accessible invalid-state label as well as color. A non-conflicting answer is not described as correct. Generation, unique-solution checks, hint behavior and exact note restoration through Undo remain unchanged
- The approved eight-game lobby, other five games, install entry and schema-1 save/reconciliation guards remain intact. No difficulty claims, currency, ads, account system or tracking were added
- Added 19 focused rule/controller/synthetic-pointer suites covering eight-direction selection, tap/drag equivalence, both endpoint orders, stale/duplicate/cancelled gestures, touch thresholds, ghost-click suppression, keyboard modifiers, overlays, Undo, reload and reduced-motion guards

The full automated suite passes on the release source. Browser visual and interaction verification is recorded separately below; simulated pointer tests do not establish real phone touch or assistive-technology usability.

### Logic board layout correction 1.8.1

Live 1.8.0 QA verified real Word Search dragging, endpoint taps, exact Undo and reload. It also found that supplemental screen-reader word labels were visible and that the narrow Sudoku control row extended below a 667px-high viewport. A scoped visually-hidden rule now keeps the labels accessible without duplicating visible text. Sudoku allocates 32 fewer pixels to the board at that height (minimum 270px), retaining the nine-key row and normal scrolling on shorter screens. A twentieth focused regression protects both fixes. Final post-deployment verification follows below.

### Sliding rapid-input correction 1.8.2

Live repeated-input testing found that moving the actual Sliding Tiles button also moved its clickable area: a second rapid click at the old position could hit the animated tile and reverse it. Motion now affects a pointer-inert face inside a stationary grid button. Input, history and saves still commit synchronously; no animation callback or delayed state change is introduced. A twenty-first focused suite guards the stable hitbox structure.

### Live logic-puzzle verification — 2026-10-01

- Final runtime **1.8.2** commit `42bb42359be208730f2d9354f2e2f8658fea5d21`; [exact-commit Pages deployment succeeded](https://github.com/tongledi/pocket-puzzle-club/actions/runs/36867100967). All 45 local files matched remote Git blobs; two existing `.gitkeep` files were retained
- Actual cloud Chromium checked at **1187×758 desktop** and **404×667 narrow CSS-pixel viewports**. Narrow QA used a resized window at 125% zoom, not device emulation or physical touch. Original window size and 100% zoom were restored afterward
- **Sliding Tiles:** invalid taps left the board unchanged; keyboard movement, exact Undo/reload, pause/resume and canceled restart/new-round flows passed. Live rapid double-click initially exposed moving hitboxes; after 1.8.2, the same-position double-click added exactly one move. A saved round completed via 91 normal UI Hint actions along its recorded route; victory, Undo reopening and replay-original passed. This was hint-assisted completion, not an unassisted solve
- **Word Search:** real desktop and narrow pointer drags, reversed selection and endpoint taps found words. Invalid/non-straight and outside-board releases changed neither moves nor found words. No extra endpoint tap followed a completed drag. Same-start cancellation, contextual hint, pause and canceled new round passed. Exact Undo and reload preserved progress. A six-word round completed through a mix of real drags and taps, then reopened through Undo and replayed the original board
- **Sudoku:** notes 4/7 survived reload; entering a duplicate 9 marked the exact conflicting pair with red outlines and accessible invalid labels; Undo restored the notes. Arrow-key selection, N mode toggle, help/Escape and canceled restart passed. A solver read only the visible clues, then entered all 41 editable answers through normal UI controls. Victory at 43 moves (two note edits plus 41 entries) and Undo reopening passed; this does not claim an unaided human playtest
- Corrected narrow active-state control-row bottoms measured **629.2px for Sliding**, **658px for Word Search**, and **650.7px for Sudoku notes** within the 667px viewport. Sudoku keys measured approximately **35×46px**. Longer feedback and shorter windows retain ordinary vertical scrolling; desktop Word Search scrolling to its controls was verified. No horizontal page overflow occurred on any of the eight entry/back routes, and all eight original cover assets loaded
- Independent code review accepted guarded atomic word selection and the stationary Sliding hitbox correction. Independent screenshot review accepted the final narrow word board, Sudoku notes/conflicts and Sliding layouts. The existing lobby and other five games received regression plus route/asset smoke coverage; install behavior retains automated regression coverage. These are not new physical-device audits
- Final aggregate `npm test` passed, including **21 logic-refinement suites**, 14 matching-puzzle suites and all existing rule, uniqueness, lifecycle, save, drag, installation and layout tests. Synthetic checks separately cover cancellation, pointer capture loss, blur/visibility, multi-touch interruption, stale rounds, overlays, reduced motion and keyboard-modifier guards
- Every destructive/new-round browser interaction used `?qa=1` and its isolated save namespace. Normal player saves were not reset. No OS installation was attempted. Physical-phone touch and assistive-technology usability remain outstanding


## Physical feedback correction 1.9.0

- Water Sort lifts the source tube, moves its lip above the destination, tilts, pours a color-matched stream while source liquid shrinks and destination liquid grows, then returns the tube. The complete maximal pour still commits and saves synchronously
- Arrow Escape keeps stationary input cells while a pointer-inert arrow travels out along its direction. Blocked attempts travel only to the first obstacle, rebound, and return without a board move
- Board input is briefly gated during these effects. Undo, pause, help, settings, restart/new-round dialogs, navigation, reload, multi-tab replacement, resize, blur and visibility interruption dispose visual overlays; animation callbacks never alter game state. Reduced-motion preference reveals the committed result immediately
- Mahjong uses ivory beveled faces, green side thickness, cast shadows, same-cell occlusion and consistent layer offsets. Face bounds remain within the logical cell envelope. Numeric layer badges, selected-match outlines, available-pair counts and newly-free pulses are removed
- Normal Water selection no longer marks legal destinations; normal Solitaire selection no longer outlines legal targets; Sliding no longer marks every legal neighbor; blocked Arrow taps no longer draw instructional paths or mark future targets. Explicit Hint remains available
- Word Search keeps the six target words as its ordinary objective list, with quieter idle/selection guidance. Finding a word still requires locating it in the grid
- Solitaire remains a randomly shuffled draw-one deal with no solvability filter. The code does not guarantee a winnable deal, and legal-move Hint is not a solver. All eight games generate fresh rounds through New game; Restart replays the saved original. There is no numbered level progression
- Accepted eight-game menu, install entry, game rules, generators, normal saves, schema 1, cross-tab reconciliation and Undo remain intact
- Full local aggregate tests pass, including 14 new DOM/WAAPI lifecycle suites. Older regression expectations were updated where they intentionally asserted the automatic assistance removed by this correction. This is automated evidence, not a physical-phone test; live browser verification is recorded separately

### Live-feedback adjustment 1.9.1

Initial browser review found Mahjong's stack separation too subtle, the Water stream too close to the rotating mouth's center, and Arrow collisions stopping short of the actual glyph. Layer offsets now expose wider lower-tile ledges while preserving same-cell overlap only; covered artwork stays hidden. The Water stream starts at the lower rim of the rotated mouth, aligned above the receiver. Collision distance is measured between glyph edges, with a brief directional compression before rebound. Full automated regression and subsequent live verification are required for this adjustment.

### Pour timeline correction 1.9.2

Live narrow-frame capture identified a timing mismatch: globally eased source movement could lag the linear stream and liquid-transfer phases. Source movement now shares the same linear timeline, reaching the receiving mouth before the stream starts. A focused regression asserts that shared timeline.

### Live physical-feedback verification — 2026-10-01

- Final runtime **1.9.2** commit `694919d5300717479019b1931b07df7668db1025`; its regression-test descendant `08189cbea6ee1595777ae3ef2de38e74a5adee22` [deployed successfully](https://github.com/tongledi/pocket-puzzle-club/actions/runs/36878991455). Runtime and test files matched local Git blobs; final documentation/version metadata was published afterward
- Actual cloud Chromium tested at approximately **1188×758 desktop** and **406×667 narrow CSS pixels**. Narrow layout used a resized window and 125% browser zoom. Window size and 100% zoom were restored; this is not physical-phone or touch-device validation
- **Mahjong:** screenshots verified distinct stacked bases and shadows without numbered badges. All 72 live tile-face rectangles were checked on desktop and narrow layouts: only tiles sharing a logical row/column overlap. Narrow faces measured about 33×34px. Selecting a tile marks only that tile; a legal pair, exact Undo and reload passed
- **Water:** native mid-animation screenshots captured lift, cross-row travel, tilt, aligned colored stream, shrinking source liquid, growing receiving liquid and return. A three-unit final pour was also captured. Rapid repeated destination input counted one move. Exact Undo/reload, Undo during flight and opening Help during flight removed overlays correctly. A complete hint-assisted round finished at 14 moves; Undo reopened it, canceled Restart preserved it, and the final pour replayed successfully. No floating overlays remained after completion
- **Arrows:** native mid-motion screenshots captured directional travel toward a blocker and rebound. Failed attempts changed neither remaining arrows nor move count. A double-click on a clear arrow counted one move. Exact Undo/reload, a complete 31-arrow round through legal UI taps, final Undo and replay-original all passed. Completing the round through computed legal taps is automated gameplay verification, not an unaided human solve
- All eight narrow entry/back routes had no horizontal page overflow. Active control-row bottoms measured 629px Mahjong, 643px Water, 638px Arrows, 660px Solitaire, 640px Blocks, 638px Sliding, 658px Sudoku and 665px Word Search. Longer messages and shorter screens retain ordinary scrolling
- Normal Solitaire selection had zero destination outlines; Word Search retained six target words. All eight original lobby covers loaded. The approved lobby, other puzzle rules and installation assets received regression/smoke coverage; no OS installation was attempted
- Parent code review accepted the motion lifecycle. Screenshot review accepted the revised Mahjong depth and aligned Water pour. Full `npm test` passed again on final source, including all 14 tactile-feedback suites and prior rule, generation, save, cross-tab, lifecycle, pointer, installation and layout suites
- All destructive or round-changing browser tests used `?qa=1`. Normal player saves were not reset. Reduced motion, blur/resize/visibility cancellation and API-failure cleanup have automated coverage. Physical touch and assistive-technology testing remain outstanding


## Tightly packed tiles and verified test deals 1.10.0

- Mahjong face proportions and packing were reworked after inspecting the user's current-board screenshot and the [official Mahjong Club Turtle game](https://www.mahjongclubgame.com/turtle_mahjong). Faces now use a fixed 1:1.34 portrait ratio, narrow seams and thin sidewalls. [Yellow Mountain's physical 30×23mm faces](https://www.ymimports.com/collections/best-sellers/products/fx-at011-a) provide a second proportion reference. These references informed geometry; their artwork and branding were not copied
- The entire Mahjong board scales uniformly. Small upper-level offsets create a coherent projection; neighboring edges may overlap in projection, while only a tile above the same logical coordinate blocks play. Every exposed tile center stays uncovered. A 100-board complete-route regression checks those centers after every pair removal, in addition to existing rule/solvability coverage
- Arrow Escape now moves the entire ivory tile and arrow together. Blocked pieces contact the first tile's edge, compress briefly, and return. Clear pieces slide out as one piece. Stationary source hitboxes, synchronous state commit, Undo and interrupted-animation cleanup remain intact
- Solitaire has a visible Choose deal entry and three fixed numbered draw-one test deals. Test 01 is labeled Gentle, Test 02 Standard and Test 03 Challenging. These are explicitly provisional labels based on one randomized heuristic's solve rate across 40 trials (40/40, 27/40 and 6/40), not human-calibrated difficulty or an optimal-solution claim
- All three standard 52-card layouts have complete proof routes, independently replayed through normal select/foundation/column/stock actions and the shared controller to all 52 foundations. Verified route lengths are 137, 151 and 163 successful board actions. Full routes are regression fixtures, not automatic player hints
- Opening or canceling the deal picker leaves the current round untouched. Starting a chosen test or random deal requires an explicit replacement confirmation. Deal identity persists with schema-1 saves; Restart returns that exact original deal. Random deals retain the existing generator and remain unrated/non-guaranteed
- Added 12 suites for fixed-deal identity/conservation/proof replay, real-controller victory/Undo/restart, choice confirmation/cancel, timer/input gating, reload, other-game preservation, QA isolation, cross-tab conflict dismissal and complete-route portrait geometry

This pass does not introduce a whole-site level-progression system. That broader game-flow request is tracked separately. Live desktop/narrow verification is recorded after deployment below.

### Completion visibility correction 1.10.1

Full real-browser deal replays exposed an older flow problem: the Solitaire completion panel sat below the emptied tableau, placing its action buttons below the initial viewport. The completed table now gives its visible play area to the result panel; the finished tableau is hidden from focus navigation, the result heading receives focus at victory, and the panel scrolls internally when text/viewport size requires it. Undo restores the active table. Picker choices also stretch to the dialog width rather than inheriting right-aligned action-row positioning.

### Live portrait/deal verification — 2026-10-01

- Final runtime **1.10.1** commit `8093633d7e35aa59ee722979a934caab445ad91f`; final proof regression descendant `60277410a5240325628b886cd93f4e0943083537`. Documentation/version metadata was published after the browser pass
- **All three fixed Solitaire deals completed in actual Chromium through normal keyboard controls**, checking the move counter after each successful action: Test 01 at 137 moves, Test 02 at 151, Test 03 at 163. Each reached 52/52 foundations with zero Hint use. These were automated proof-route replays, not claims of unaided human wins or shortest solutions
- Opening the picker, selecting Test 02 and canceling preserved the existing 24-move random QA round. Only the explicit Start deal confirmation replaced it. All three identities/difficulty labels appeared correctly; final Undo/reload retained Test 01 at 51/52, and confirmed Restart returned its exact initial layout
- Real full-deal screenshots found the completion panel below the empty tableau. After the 1.10.1 correction, narrow next-deal/replay controls ended at 405/457px within a 667px viewport, with no need to scroll. Win → Choose deal → cancel kept the win; Undo restored the table; completing the final move focused the result heading
- At an additional **338×556 CSS-pixel / 150%-zoom** check, the completion panel kept 353px of content in a 309px internally scrollable area, the deal-picker action remained usable, and there was no horizontal page overflow. The normal narrow picker was fully inside the viewport
- **Mahjong:** inspected the supplied screenshot and official Mahjong Club reference before the geometry change. Final desktop faces measured 45.6×61.2px (1:1.34) with tight seams. A complete 36-pair round was played through normal narrow UI taps. Every remaining free tile center passed `elementFromPoint` hit testing after each pair. Side-blocked attempts initially and after eight pairs changed no board state; a covered tile keyboard attempt returned the correct rule explanation. Undo and replay restored the board
- **Arrow Escape:** a native mid-motion screenshot captured the entire ivory tile, including its arrow, traveling across a multi-cell blocked path. Failure kept the move count unchanged. A full 31-arrow board completed with whole-piece animation and no residual overlays; final Undo/reload reopened it. No automatic solution markings were added
- Actual cloud Chromium covered **1188×758 desktop**, **406×667 narrow** and the short/zoomed check above. All eight narrow entry/back routes had no horizontal page overflow. Narrow Mahjong controls ended at about 651px; an active Test 01 Solitaire deal kept its controls within 654px. Original window size and 100% zoom were restored
- Full `npm test` passed on release source, including **13 new fixed-deal/portrait/completion suites**, all three full pure-engine and controller proofs, 100 complete Mahjong geometry routes and all prior regressions. Independent code and screenshot review accepted the targeted changes. Captured application logs had no app warnings/errors; browser-extension metadata messages were excluded
- Every browser round-changing action used `?qa=1`. Normal player saves were not reset. No OS installation or physical-phone/touch/assistive-technology validation was performed
