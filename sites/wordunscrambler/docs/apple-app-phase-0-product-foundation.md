# Phase 0 Product Foundation - LexJolt

**Project:** `sites/wordunscrambler`
**Product:** LexJolt
**Platform direction:** Native SwiftUI app for Apple devices
**Phase goal:** define exactly what V1 is before coding starts
**Status:** Complete

---

## 1. Locked Product Definition

**App name:** LexJolt

**One-line promise:** a polished free Apple word-games app with five fast games, daily progress, streaks, achievements, and offline-first play.

**Primary user:** casual word-game players who want quick daily puzzles, timed anagram rounds, and a useful unscrambler on iPhone.

**Secondary users:** Scrabble-style players, spelling game fans, families playing on a shared screen, and existing Word Unscrambler web users who want a native app.

**V1 product type:** native SwiftUI app, not a WebView wrapper.

**V1 business model:** free app with no ads, no paid tier, no account requirement, and no backend.

## 2. V1 Game List

V1 includes exactly five games:

| Game | Goal | Session shape |
| --- | --- | --- |
| Word Unscrambler | Find every valid word from entered letters | Utility session, usually under 2 minutes |
| Anagram Rush | Find as many words as possible before time runs out | Timed replay loop |
| Daily Jolt | Complete one daily required-letter puzzle | Habit loop with streaks |
| Spelling Bee | Build words from seven letters with a required center letter | Longer puzzle session |
| Guess the Word | Guess a hidden word with letter feedback and shareable results | Short challenge loop |

Anything outside this list is out of scope for V1 unless it directly supports these games.

## 3. V1 Success Metrics

Phase 0 defines success around retention and repeated play, not revenue.

| Metric | V1 signal | Why it matters |
| --- | --- | --- |
| 7-day retention | Players return within 7 days of install | Proves the app has a habit loop |
| Daily Jolt completion rate | Players finish the daily puzzle | Validates the daily reason to return |
| Repeat sessions | Players start more than one game session per day or week | Shows the app is more than a one-time solver |
| Anagram Rush replay rate | Players replay timed rounds after finishing one | Validates the fast game loop |
| Share-card usage | Players share completed puzzles or scores | Indicates organic growth potential |
| Crash-free sessions | App remains stable across device classes | Required before App Store scale |

V1 is successful enough to consider monetization only after retention is visible in real usage data.

## 4. V1 Constraints

These constraints are locked for V1:

- No ads.
- No login.
- No backend.
- No paid features.
- No subscriptions.
- No cross-device sync.
- No multiplayer.
- No user-generated content.
- No gameplay blocked by network access.

The app should store progress locally on device. Analytics, if used, must be privacy-conscious and limited to product health events such as game starts, completions, session counts, share-card usage, and crash reporting.

## 5. Initial Apple Targeting

Build order is intentionally staged so the core game quality comes before broad device polish.

### First Target: iPhone

Goal: make the primary play experience excellent.

- Today screen.
- All five V1 games.
- Local streaks, achievements, best scores, levels, badges, share cards, and unlockable themes.
- Offline play.
- Touch-first input and one-hand-friendly layouts where practical.

### Second Target: iPad And Mac

Goal: adapt the same app for longer sessions and larger screens.

- iPad split-view dashboard with games, stats, and definitions.
- Mac keyboard-first play with shortcuts and larger history/stat views.
- Shared SwiftUI components where they make sense, with device-specific layout adaptations.

### Companion Targets: Apple Watch, Apple TV, Apple Vision Pro

Goal: support the Apple ecosystem without forcing full feature parity.

- Apple Watch: streak glance, daily puzzle status, quick reminder interactions.
- Apple TV: party and large-screen modes for Guess the Word and timed word rounds.
- Apple Vision Pro: spatial board-style presentation for tiles, puzzle boards, and daily challenges.

Watch, TV, and Vision Pro should be treated as companion or adapted experiences in V1, not as blockers for the iPhone launch.

## 6. Development Gate

Phase 0 is complete when these decisions are true:

- App name is confirmed as LexJolt.
- V1 game list is locked to Word Unscrambler, Anagram Rush, Daily Jolt, Spelling Bee, and Guess the Word.
- V1 success metrics focus on 7-day retention, Daily Jolt completion, repeat sessions, replay rate, share-card usage, and stability.
- V1 explicitly has no ads, login, backend, or paid features.
- Initial Apple targets are decided as iPhone first, then iPad/Mac, then Watch/TV/Vision companion modes.

Phase 1 can begin after this document is accepted: port the reusable TypeScript game logic into a native Swift game core.
