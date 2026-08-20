# LexJolt Mobile App Current Status

**Last updated:** August 20, 2026
**Scope:** Native SwiftUI Apple app for LexJolt
**Current phase:** Phase 4 - TestFlight and retention validation

## Current State

The LexJolt native Apple app has a working Swift package core, SwiftUI app
logic, Apple platform target shells, privacy-conscious retention instrumentation,
feedback triage, monetization gates, and beta validation report generation.

Current repo branch is `main`, pushed to GitHub through commit:

```text
adf39b4 Document TestFlight export signing path
```

## Verified Locally

- `WordGameCore` tests pass: 7 tests.
- `LexJoltApp` tests pass: 29 tests.
- iOS Simulator build passes.
- Mac build passes.
- TestFlight export options plist validates.
- Privacy manifest plist validates.
- `git diff --check` passes.

## Apple Account And Signing Status

The local system has these signing identities installed:

- Apple Development for team `97ZA7QV77G`.
- Apple Distribution for team `97ZA7QV77G`.
- Developer ID Application for team `97ZA7QV77G`.

Xcode sees the paid individual developer team:

```text
97ZA7QV77G - SURYA JAGANNATHA PHANI,SWAROOP,MA KALLAKURI
```

The TestFlight export options include this team ID.

## Archive And Upload Status

A normal signed iOS archive still asks for a development provisioning profile and
fails:

```text
Your team has no devices from which to generate a provisioning profile.
No profiles for 'com.lexjolt.app' were found.
```

The useful workaround is to create an unsigned Release archive and let the
export/upload step handle App Store Connect distribution signing:

```sh
cd sites/wordunscrambler/apple/LexJoltiOS
xcodebuild -project LexJoltiOS.xcodeproj -scheme LexJoltiOS -destination 'generic/platform=iOS' -configuration Release archive -archivePath ./build/LexJolt.xcarchive CODE_SIGNING_ALLOWED=NO
xcodebuild -exportArchive -archivePath ./build/LexJolt.xcarchive -exportOptionsPlist Config/TestFlightExportOptions.plist -exportPath ./build/TestFlight -allowProvisioningUpdates
```

The unsigned Release archive succeeds. The export/upload currently reaches App
Store Connect, then fails because the app record does not exist:

```text
IDEDistribution.DistributionAppRecordProviderError.missingApp(bundleId: "com.lexjolt.app")
```

## Next Resume Step

Create the App Store Connect app record for:

```text
Name: LexJolt
Bundle ID: com.lexjolt.app
SKU: wordbridge
Primary language: English (U.S.)
```

After the app record exists, rerun the unsigned archive and export/upload
commands above. If export succeeds, confirm the build appears in App Store
Connect/TestFlight, add internal testers, and start collecting the Phase 4
retention signals.

## Phase 4 Retention Gate

Do not add ads or monetization until TestFlight feedback and local analytics show:

- Daily completion rate is at least 50%.
- Anagram Rush replay rate is at least 30%.
- 7-day retention is at least 20%.
- Share usage is greater than zero.
- Crash count is zero.
- Qualitative tester feedback has been reviewed.

The app already has code support for:

- `RetentionMetricsCalculator`
- `RetentionImprovementPlanner`
- `BetaValidationReportGenerator`
- `MonetizationReadinessGate`

