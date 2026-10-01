# Measurement contract — local/test only

No data is transmitted. `event()` is a replaceable local adapter. The newest 500 events stay in browser storage, with version, timestamp, game ID, random per-tab session ID and random per-round run ID. These are local diagnostic IDs, never player identifiers or URL parameters. No remote IDs, names, emails, board answers, full referrers or arbitrary query values are collected. These logs are not reliable cohort analytics and must not be described as live KPIs.

Development/automation exclusions: localhost, 127.0.0.1, `navigator.webdriver`, and `?test=1` suppress events. Author tests use excluded mode. Future QA environments must also be explicitly excluded; this is not a bot-detection guarantee.

## Events

- `page_entry`: source category from the bounded source allowlist (dot/email/search/social), otherwise direct/referral. Campaign accepts only `private-preview`; all other query values are ignored. No visitor IDs in URLs. Future campaigns need an explicit non-personal allowlist.
- `first_valid_move`: once per run, only after a successful player board mutation. Selection, pause, invalid moves and hints do not count. Undo does not reset eligibility.
- `run_outcome`: first terminal win/no-moves per run or explicit abandonment through new/restart. Undo after completion does not emit a duplicate terminal event. Exiting a tab is not declared abandonment. Includes moves, hints and active duration when terminal. Results are diagnostic per game; Block Garden is score/no-moves, not a win game.
- `game_switch`: from current game to destination game.
- `resume`: reopens a saved local round, including a completed round for viewing.
- `active_foreground_duration`: cumulative active milliseconds per run, reported on home/visibility changes. Use latest/max per run, never sum duplicate cumulative samples. Timer stops during pause, confirmation dialogs, hidden document and terminal state; interval gaps cap at 15 seconds to limit suspended-tab overcounting. Not an attention or engagement guarantee.
- `hint`, `undo`: support usage, no solution values transmitted or logged.
- `error`: coarse interaction/runtime category only, without stack/content/private data.

## Trial hypotheses, not measurements or industry benchmarks

- First-valid-play / eligible visitors: 60%
- Exact next-day return: 15%
- Exact day-seven return: 5%
- Sessions with valid play in at least two distinct games: 20%

No current percentage is computed or displayed. Private owner-only traffic is not suitable evidence for product-market conclusions. True visitor/cohort denominators, time-zone/day boundaries, session timeout, consent/eligibility, attribution and bot/internal exclusions must be specified and validated before a real pilot. Later analytics needs separate approval, privacy/consent assessment, destination/access verification and QA coverage. Per-game completions should diagnose friction and hint use; do not blend game win rates into one aggregate success KPI.
