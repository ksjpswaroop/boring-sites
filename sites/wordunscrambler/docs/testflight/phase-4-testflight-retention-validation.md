# Phase 4 - TestFlight And Retention Validation

**Product:** WordBridge
**Goal:** prove people come back before monetization
**Status:** Instrumentation and launch plan ready; TestFlight upload requires Apple signing and App Store Connect access

## Launch Path

Apple's TestFlight flow requires a beta build to be uploaded to App Store Connect before testers can be invited. Apple's current App Store Connect help also notes that TestFlight can manage beta testers and collect feedback, and that builds are processed by Apple after upload before appearing in App Store Connect.

Sources:

- [TestFlight overview](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/)
- [Upload builds](https://developer.apple.com/help/app-store-connect/manage-builds/upload-builds/)
- [Apple TestFlight](https://developer.apple.com/testflight/)

## Required External Inputs

These are outside the repo and must be available before launch:

- Apple Developer Program membership.
- App Store Connect app record for bundle ID `com.boringsites.wordbridge`.
- Apple Distribution signing certificate.
- App Store provisioning profile or automatic signing access for `com.boringsites.wordbridge`.
- App Store Connect API key or Xcode account session authorized to upload builds.
- Internal tester group.

## Local Build Commands

From `sites/wordunscrambler/apple/WordBridgeiOS`:

```sh
xcodegen generate
xcodebuild -project WordBridgeiOS.xcodeproj -scheme WordBridgeiOS -destination 'generic/platform=iOS Simulator' build
xcodebuild -project WordBridgeiOS.xcodeproj -scheme WordBridgeiOS -destination 'generic/platform=iOS' -configuration Release archive -archivePath ./build/WordBridge.xcarchive -allowProvisioningUpdates
xcodebuild -exportArchive -archivePath ./build/WordBridge.xcarchive -exportOptionsPlist Config/TestFlightExportOptions.plist -exportPath ./build/TestFlight -allowProvisioningUpdates
```

The export options use App Store Connect upload destination and automatic signing.

## Current Local Archive Status

Local Release signing is configured for automatic signing with team `97ZA7QV77G`.
The simulator and Mac builds pass locally, but the iOS device archive cannot be
completed until the Apple account has a usable provisioning path for
`com.boringsites.wordbridge`.

Latest local archive blocker:

```text
Communication with Apple failed: Your team has no devices from which to generate a provisioning profile.
No profiles for 'com.boringsites.wordbridge' were found.
```

Before the TestFlight upload can run, create or confirm the App Store Connect app
record and signing profile for `com.boringsites.wordbridge`, then rerun the archive
and export commands above from this directory.

## Privacy-Conscious Analytics

Phase 4 instrumentation is implemented in `WordBridgeApp` with `AnalyticsEvent`, `PrivacyPreservingAnalytics`, `LocalAnalyticsRecorder`, and `RetentionMetricsCalculator`.

Allowed event properties:

- Game name.
- Score bucket.
- Duration bucket.
- Result-count bucket.

Blocked event properties:

- Raw entered letters.
- Raw solved or guessed words.
- Email addresses.
- Device identifiers.
- Free-text feedback.

## Metrics To Review Before Monetization

- Daily completion rate.
- Anagram Rush replay rate.
- 7-day retention rate.
- Share-card usage count.
- Crash count.
- Feedback themes.

The monetization gate remains closed in V1. Ads may only be considered after retention metrics pass the `MonetizationReadinessGate` and feedback has been reviewed.

## Improvement Loop

Feedback should be triaged into:

- Onboarding: confusing first-run or rule explanations.
- Difficulty: puzzles too easy, too hard, or uneven.
- Dictionary quality: missing common words, accepted bad words, unclear word list standards.
- Game balance: scoring, timer length, hint economy, or replay friction.

Fixes from this loop should land before any ad SDK, ad placement, account system, or paid feature.
