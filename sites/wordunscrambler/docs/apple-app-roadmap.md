# Apple App Roadmap - WordBridge

**Project:** `sites/wordunscrambler`
**App concept:** WordBridge
**Direction:** Native SwiftUI app for Apple devices
**V1 monetization:** Free, no ads, no account, no backend
**V2 monetization:** Ads after retention is proven
**Status:** Phase 4 retention instrumentation ready; TestFlight upload waiting on Apple signing/App Store Connect access

**Phase 0 decision record:** [`apple-app-phase-0-product-foundation.md`](./apple-app-phase-0-product-foundation.md)
**Phase 1 implementation:** [`../apple/WordGameCore`](../apple/WordGameCore)
**Phase 2 implementation:** [`../apple/WordBridgeApp`](../apple/WordBridgeApp)
**Phase 2 iOS app target:** [`../apple/WordBridgeiOS`](../apple/WordBridgeiOS)
**Phase 3 ecosystem targets:** `WordBridgeiOS`, `WordBridgeMac`, `WordBridgeWatch`, `WordBridgeTV`, `WordBridgeVision`
**Phase 4 validation plan:** [`testflight/phase-4-testflight-retention-validation.md`](./testflight/phase-4-testflight-retention-validation.md)

---

## 1. Pitch

Word Unscrambler already has the raw material for a native Apple word-game app: a local dictionary, fast anagram solving, Scrabble scoring, daily puzzles, timed rounds, definitions, pronunciation, and a clean blue UI system.

The Apple app should not feel like a wrapped website. It should feel like a focused, offline-first word-game collection that happens to reuse the proven rules and content from the web product.

The core promise:

> Five fast word games, playable anywhere, with daily progress, streaks, achievements, and no ads in the first version.

Why this fits Apple devices:

- **iPhone:** quick daily play, short sessions, shareable scores.
- **iPad:** relaxed puzzle sessions with more space for boards, definitions, and stats.
- **Mac:** keyboard-first play, longer sessions, history and performance dashboards.
- **Apple Watch:** streak reminders, daily puzzle glance, quick completion nudges.
- **Apple TV:** large-screen party modes for guessing rounds and timed challenges.
- **Apple Vision Pro:** spatial tile boards and immersive puzzle rooms.

Apple's developer platform supports distribution across iPhone, iPad, Mac, Apple TV, Apple Vision Pro, and Apple Watch, with TestFlight for beta feedback and App Store distribution through the Apple Developer Program: [Apple Developer Program](https://developer.apple.com/programs/).

## 2. V1 Product

V1 should ship as a polished free app with exactly five games:

| Game | Role | Existing source |
| --- | --- | --- |
| Word Unscrambler | Utility anchor and onboarding path | Current `/` solver |
| Anagram Rush | Fast replay loop | Current `/rush` game |
| Daily Scramble | Habit and streak loop | Current `/daily` game |
| Spelling Bee | Letter-set mastery game | New native mode using existing solver |
| Guess the Word | Shareable guessing game | New native mode using dictionary lookup |

The app starts on a **Today** screen:

- Daily Scramble card with progress, streak, and completion state.
- Continue last game.
- Quick launch buttons for all five games.
- Local achievements and current level.
- No account prompt.
- No ad placeholder.

Game rules:

- **Word Unscrambler:** type letters, see valid words, sort by score/length/alphabetical, view definitions when available.
- **Anagram Rush:** 90-second rounds, random 7-letter rack, score by Scrabble value plus length bonus, reveal missed words after the round.
- **Daily Scramble:** deterministic daily puzzle, required center letter, local progress, local streak, share text.
- **Spelling Bee:** 7 letters, one required center letter, 4-letter minimum, pangram bonus, ranks from beginner to genius.
- **Guess the Word:** Wordle-style guessing with dictionary validation, letter feedback, hints earned through play, share result.

V1 gamification:

- Local streaks for daily completion.
- Best scores per game.
- Achievements such as first win, 7-day streak, first pangram, perfect rush, no-hint solve.
- Levels based on total earned XP.
- Unlockable blue theme variants, tile styles, and app icons.
- Share cards for completed daily puzzles and high-score rounds.
- Optional local notifications for daily puzzle reminders.

V1 constraints:

- No ads.
- No paid features.
- No backend.
- No login.
- No cross-device sync.
- No multiplayer.
- No user-generated content.

## 3. Existing Code Reuse

Reuse the current web code as the source of truth for rules and validation, but do not embed the Astro UI in the app.

Directly portable behavior:

- `normalizeLetters`: uppercase input, remove non-letters, cap length where needed.
- `buildIndex`: pre-index words by sorted-letter signature.
- `solve`: find dictionary words that can be built from available letters.
- `scrabbleScore`: use the existing tile-score map.
- Daily puzzle behavior: deterministic date-based puzzle selection, required letter, local progress, streaks, share text.
- Rush behavior: 90-second timer, valid-word checks, duplicate checks, missed-word reveal.

Native Swift app structure:

- `WordGameCore`: pure Swift package with dictionary loading, indexing, solving, scoring, validation, and puzzle generation.
- `WordGameModels`: shared models for words, racks, guesses, achievements, streaks, and game results.
- `WordGameUI`: SwiftUI views shared across iPhone, iPad, Mac, TV, and Vision where practical.
- `WatchCompanion`: compact Watch app for streak state, reminders, and quick daily status.
- `TVPartyMode`: TV-specific shell for large text, remote-friendly focus states, and group play.

Initial data strategy:

- Bundle `words.json` as the first dictionary source.
- Convert it to an app bundle resource during the native build.
- Keep the web dictionary and app dictionary generated from the same upstream source to avoid answer mismatches.
- Keep definitions optional in V1 because the current web implementation uses runtime API lookup and local fallbacks; the native app should avoid making definitions a launch blocker.

What should not be claimed:

- The Astro components are not reusable native UI.
- The current web localStorage model does not become cross-device sync automatically.
- The current dictionary is enough for V1 gameplay, but future App Store reviews and user feedback may require a larger or more curated word list.

## 4. Roadmap

### V1 - Free Native App

Goal: prove retention before monetization.

Phase 1 foundation already exists as the reusable `WordGameCore` Swift package. It ports normalization, dictionary indexing, solving, Scrabble scoring, bundled `words.json` loading, and unit-tested dictionary behavior from the web implementation.

Phase 2 exists as the reusable `WordBridgeApp` SwiftUI package plus the `WordBridgeiOS` app target. It adds the Today shell, five game screens, local progress and persistence, streaks, scores, achievements, share-card copy, daily reminder scheduling, and the V1 policy guarantees: no ads, no login, no backend, no payments, and offline play.

Phase 3 adapts the app without changing the core V1 promise:

- iPad uses the universal iOS app with a regular-width split-view dashboard, larger boards, and visible stats.
- Mac has a native app target with keyboard-first shortcuts, session history, and longer-session dashboard copy.
- Apple Watch has a companion target and glance model for streak, daily reminder, and completion status.
- Apple TV has a party-mode target for Guess the Word and timed Anagram Rush rounds.
- Apple Vision Pro has a Vision target and spatial tile board concept using depth-positioned letter tiles.

Local verification built the iOS/iPad and Mac targets. The generated Watch, TV, and Vision schemes are present, but this local Xcode installation reports those platform destinations as unavailable until the optional platform components are installed from Xcode Settings.

Phase 4 adds privacy-preserving analytics, retention metrics, feedback triage, and a monetization gate. The implementation measures daily completion, replay rate, 7-day retention, share usage, and crashes without storing raw letters, raw words, emails, device identifiers, or free-text analytics properties. TestFlight upload is prepared through the iOS app target and export options, but launch requires external Apple Distribution signing and App Store Connect access.

- Ship the five-game lineup.
- Build native SwiftUI screens for iPhone, iPad, and Mac.
- Add adapted Watch, TV, and Vision experiences without forcing full feature parity.
- Store all progress locally on device.
- Launch TestFlight with the existing web audience and friends/family testers.
- Track product health through privacy-conscious analytics and App Store Connect metrics.

Success criteria:

- Users complete Daily Scramble repeatedly.
- Anagram Rush produces repeat sessions.
- Share cards are used.
- No major dictionary complaints.
- No paywall or ad friction in early reviews.

### V1.1 - Polish And Content Expansion

Goal: make the app feel deeper without adding monetization.

- Add more daily puzzle seeds.
- Add more achievements and unlockable tile styles.
- Improve onboarding and empty states.
- Add optional definitions/pronunciation where native APIs or local data make sense.
- Tune game difficulty based on actual play data.

### V2 - Ads After Retention

Goal: monetize without damaging the core play loop.

Ads should appear only after the app has retention evidence. Recommended placements:

- Post-round summary screen.
- Daily completion screen.
- Optional rewarded hint in Guess the Word or Spelling Bee.
- Non-invasive home-screen sponsorship slot after gameplay cards.

Ads should not appear:

- Inside active typing or guessing screens.
- Between every submission.
- Before first play.
- In onboarding.
- In Watch interactions.

Before V2, review App Store privacy labels, ad network SDK requirements, IDFA/App Tracking Transparency implications, and age-rating impact.

### V3 - Sync And Community

Goal: add durable user value only after the local app works.

- iCloud sync for streaks, achievements, and progress.
- Game Center achievements and leaderboards.
- Friend challenges.
- Weekly events.
- Larger dictionary packs or curated learning modes.

## 5. Release Readiness

App Store positioning:

- Category: Games, Word.
- Name: WordBridge.
- Subtitle candidate: Daily anagrams, streaks, and word puzzles.
- Primary screenshots: Today screen, Daily Scramble, Anagram Rush, Spelling Bee, Guess the Word.
- App promise: free, offline-friendly word games with no ads in V1.

TestFlight checklist:

- iPhone small and large screen layouts.
- iPad split view and landscape.
- Mac keyboard navigation.
- Watch glance/reminder flow.
- Apple TV remote focus flow.
- Vision Pro spatial board readability.
- Offline launch and gameplay.
- Local progress persistence.
- Share card generation.

Privacy posture:

- V1 stores progress locally.
- V1 does not require account creation.
- V1 does not require backend services.
- V1 should avoid third-party ad or tracking SDKs.
- If analytics are used, collect only aggregate gameplay events needed to improve retention.

Retention metrics:

- Daily active users.
- Daily Scramble completion rate.
- 1-day, 7-day, and 30-day retention.
- Average games per session.
- Rush replay rate.
- Share-card usage.
- Achievement unlock rate.
- App Store rating prompts after satisfying completions only.

## 6. Documentation Acceptance Checks

- V1 game list is exactly five games: Word Unscrambler, Anagram Rush, Daily Scramble, Spelling Bee, Guess the Word.
- V1 has no ads, backend, accounts, paid features, multiplayer, or cross-device sync.
- V2 monetization is separated from V1 and avoids gameplay input screens.
- Every Apple device class has a clear role.
- Existing code reuse is realistic: pure rules and data are reused, Astro UI is not treated as native UI.
